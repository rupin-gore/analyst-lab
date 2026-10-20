"""Bazaarly: a fictional Indian e-commerce marketplace (FY2023-24 and FY2024-25).

Planted problems (do NOT show these in the UI; solutions and hints refer to them):
  * orders: ~1% exact duplicate rows (a double-loaded ingestion batch)
  * orders: timestamps are UTC; orders placed 00:00-05:29 IST fall on the previous UTC date,
    which moves some 1 April orders into March and shifts Diwali-night orders
  * orders: category mislabels ("electronics", "Electronic", "Home and Kitchen", "fashion ")
  * orders: a handful of rows where discount > gross (negative net) from a coupon bug
  * orders: three legitimate bulk B2B orders that dominate any mean
  * orders: Cancelled and Returned orders must be excluded from net revenue
  * customers: duplicate customers (same email with different casing, new customer_id)
  * customers: city spelling variants (Bangalore / bengaluru / Bombay) and ~2% null city
  * customers: Hyderabad tagged with the pre-2014 state "Andhra Pradesh" for some rows
"""
from __future__ import annotations

import math
from datetime import date, datetime, timedelta

from common import CITIES, DIWALI, FIRST, IST, LAST, daterange, fmt_ts, rng, weighted, write_csv, write_manifest

DATASET = "bazaarly"
SEED = 20240401
START = date(2023, 4, 1)
END = date(2025, 3, 31)

CATEGORIES = {
    # name: (weight, median net INR, sigma, gst rate)
    "Electronics": (14, 9000, 0.8, 0.18),
    "Fashion": (24, 1300, 0.6, 0.12),
    "Home & Kitchen": (16, 2200, 0.7, 0.18),
    "Grocery": (22, 750, 0.5, 0.05),
    "Beauty": (14, 850, 0.5, 0.18),
    "Books": (10, 420, 0.4, 0.0),
}
MISLABELS = {"Electronics": ["electronics", "Electronic"], "Home & Kitchen": ["Home and Kitchen"],
             "Fashion": ["fashion "]}
PAYMENTS = ["UPI", "Card", "COD", "NetBanking", "Wallet"]
CHANNELS = ["Organic", "Google Ads", "Instagram", "Referral", "Affiliate"]


def day_weight(d: date) -> float:
    w = 1.0
    if d.weekday() >= 5:
        w *= 1.2
    for dv in DIWALI.values():
        delta = (dv - d).days
        if 0 <= delta <= 12:  # festive sale run-up to Diwali
            w *= 2.6 if delta > 3 else 3.4
    if d.month == 3 and d.day >= 15:  # year-end sale
        w *= 1.4
    w *= 1 + (d - START).days / 730 * 0.6  # business growth
    return w


def generate():
    r = rng(SEED)

    # ---------- customers ----------
    customers = []
    n_customers = 2600
    for i in range(1, n_customers + 1):
        city, state, _, tier = weighted(r, CITIES, [c[2] for c in CITIES])
        first, last = r.choice(FIRST), r.choice(LAST)
        cid = f"C{10000 + i}"
        signup = START - timedelta(days=200) + timedelta(days=int(r.random() ** 1.4 * 900))
        signup = min(signup, END - timedelta(days=5))
        email = f"{first}.{last}{r.randint(1, 999)}@example.in".lower().replace("'", "")
        shown_city, shown_state = city, state
        x = r.random()
        if city == "Bengaluru" and x < 0.25:
            shown_city = "Bangalore" if x < 0.17 else "bengaluru "
        elif city == "Mumbai" and x < 0.08:
            shown_city = "Bombay"
        elif city == "Hyderabad" and x < 0.12:
            shown_state = "Andhra Pradesh"
        if r.random() < 0.02:
            shown_city = None
        customers.append({
            "customer_id": cid, "full_name": f"{first} {last}", "email": email, "city": shown_city,
            "state": shown_state, "tier": tier, "signup_date": signup.isoformat(),
            "acquisition_channel": weighted(r, CHANNELS, [35, 22, 18, 15, 10]),
        })

    # Duplicate customers: same person signed up again with a different email casing.
    dupes = []
    for c in r.sample(customers, 45):
        d = dict(c)
        d["customer_id"] = f"C{10000 + n_customers + len(dupes) + 1}"
        d["email"] = c["email"].capitalize() if r.random() < 0.6 else c["email"].upper()
        d["signup_date"] = (date.fromisoformat(c["signup_date"]) + timedelta(days=r.randint(30, 300))).isoformat()
        if d["signup_date"] > END.isoformat():
            d["signup_date"] = END.isoformat()
        dupes.append(d)
    all_customers = customers + dupes

    # ---------- orders ----------
    days = list(daterange(START, END))
    weights = [day_weight(d) for d in days]
    cum = []
    total = 0.0
    for w in weights:
        total += w
        cum.append(total)

    def sample_day(min_day: date) -> date:
        lo = max(0, (min_day - START).days)
        lo_c = cum[lo - 1] if lo > 0 else 0.0
        x = lo_c + r.random() * (total - lo_c)
        # binary search
        a, b = lo, len(cum) - 1
        while a < b:
            m = (a + b) // 2
            if cum[m] < x:
                a = m + 1
            else:
                b = m
        return days[a]

    orders = []
    oid = 100000
    hours = list(range(24))
    hour_w = [3, 2, 1, 1, 1, 1, 2, 3, 4, 5, 6, 6, 7, 7, 6, 6, 6, 7, 8, 10, 12, 13, 11, 7]
    for c in all_customers:
        k = min(40, int(r.expovariate(1 / 4.2)) + 1)
        signup = date.fromisoformat(c["signup_date"])
        for _ in range(k):
            d = sample_day(max(signup, START))
            ist = datetime(d.year, d.month, d.day, weighted(r, hours, hour_w), r.randint(0, 59), r.randint(0, 59))
            utc = ist - IST
            cat = weighted(r, list(CATEGORIES), [v[0] for v in CATEGORIES.values()])
            _, median, sigma, gst_rate = CATEGORIES[cat]
            net_target = median * math.exp(r.gauss(0, sigma))
            festive = any(0 <= (dv - d).days <= 12 for dv in DIWALI.values())
            disc_rate = r.uniform(0.15, 0.4) if festive else r.uniform(0.0, 0.15)
            gross = round(net_target / (1 - disc_rate), 2)
            discount = round(gross * disc_rate, 2)
            pay_w = [48, 18, 20 if c["tier"] == 1 else 32, 6, 8]
            pay = weighted(r, PAYMENTS, pay_w)
            cancel_p = 0.14 if pay == "COD" else 0.06
            return_p = 0.11 if cat == "Fashion" else 0.04
            x = r.random()
            status = "Cancelled" if x < cancel_p else "Returned" if x < cancel_p + return_p else "Delivered"
            if (END - d).days < 6 and status == "Delivered" and r.random() < 0.7:
                status = "Shipped"
            label = cat
            if cat in MISLABELS and r.random() < 0.025:
                label = r.choice(MISLABELS[cat])
            oid += 1
            orders.append([f"BZ{oid}", c["customer_id"], fmt_ts(utc), label, pay, status,
                           r.randint(1, 4) if cat in ("Grocery", "Beauty", "Books") else 1,
                           gross, discount, None, gst_rate, None])

    # Bulk B2B orders: legitimate, huge.
    for cid, d, gross in [("C10007", date(2024, 3, 22), 485000.0), ("C10412", date(2024, 10, 25), 612500.0),
                          ("C11903", date(2025, 2, 11), 455800.0)]:
        oid += 1
        ist = datetime(d.year, d.month, d.day, 11, 15, 0)
        orders.append([f"BZ{oid}", cid, fmt_ts(ist - IST), "Electronics", "NetBanking", "Delivered", 50,
                       gross, round(gross * 0.08, 2), None, 0.18, None])

    # Sort chronologically and re-number so order_id increases with time.
    orders.sort(key=lambda o: o[2])
    for i, o in enumerate(orders):
        o[0] = f"BZ{100001 + i}"

    # Coupon bug: discount larger than gross.
    for o in r.sample(orders, 6):
        o[8] = round(o[7] * r.uniform(1.05, 1.3), 2)

    # Finalise money columns.
    for o in orders:
        net = round(o[7] - o[8], 2)
        gst = round(max(net, 0) * o[10], 2)
        o[9] = net
        o[10] = gst
        o[11] = 49 if 0 < net < 499 else 0

    # Duplicate ingestion batch (~1%).
    dup_rows = [list(o) for o in r.sample(orders, len(orders) // 100)]
    orders = orders + dup_rows
    orders.sort(key=lambda o: (o[2], o[0]))

    write_csv(DATASET, "customers",
              ["customer_id", "full_name", "email", "city", "state", "tier", "signup_date", "acquisition_channel"],
              [[c[k] for k in ["customer_id", "full_name", "email", "city", "state", "tier", "signup_date",
                               "acquisition_channel"]] for c in sorted(all_customers, key=lambda c: c["customer_id"])])
    write_csv(DATASET, "orders",
              ["order_id", "customer_id", "order_ts_utc", "category", "payment_method", "order_status",
               "item_count", "gross_amount_inr", "discount_inr", "net_amount_inr", "gst_inr", "shipping_inr"],
              orders)

    write_manifest(DATASET, {
        "id": DATASET,
        "title": "Bazaarly marketplace",
        "description": "Orders and customers of Bazaarly, a fictional Indian e-commerce marketplace, "
                       "April 2023 to March 2025 (FY2023-24 and FY2024-25).",
        "tables": {
            "customers": {
                "file": "customers.csv",
                "rows": len(all_customers),
                "columns": [
                    {"name": "customer_id", "type": "VARCHAR", "description": "Customer key, e.g. C10001"},
                    {"name": "full_name", "type": "VARCHAR", "description": "Customer name"},
                    {"name": "email", "type": "VARCHAR", "description": "Login email"},
                    {"name": "city", "type": "VARCHAR", "description": "City as typed at signup"},
                    {"name": "state", "type": "VARCHAR", "description": "State or union territory"},
                    {"name": "tier", "type": "INTEGER", "description": "City tier (1 = metro, 2 = tier-2)"},
                    {"name": "signup_date", "type": "DATE", "description": "Account creation date"},
                    {"name": "acquisition_channel", "type": "VARCHAR", "description": "First-touch channel"},
                ],
            },
            "orders": {
                "file": "orders.csv",
                "rows": len(orders),
                "columns": [
                    {"name": "order_id", "type": "VARCHAR", "description": "Order key, e.g. BZ100001"},
                    {"name": "customer_id", "type": "VARCHAR", "description": "FK to customers"},
                    {"name": "order_ts_utc", "type": "TIMESTAMP", "description": "Order time in UTC (India is UTC+5:30)"},
                    {"name": "category", "type": "VARCHAR", "description": "Product category"},
                    {"name": "payment_method", "type": "VARCHAR", "description": "UPI, Card, COD, NetBanking or Wallet"},
                    {"name": "order_status", "type": "VARCHAR", "description": "Delivered, Shipped, Cancelled or Returned"},
                    {"name": "item_count", "type": "INTEGER", "description": "Units in the order"},
                    {"name": "gross_amount_inr", "type": "DOUBLE", "description": "List value before discount, excl. GST"},
                    {"name": "discount_inr", "type": "DOUBLE", "description": "Discount applied"},
                    {"name": "net_amount_inr", "type": "DOUBLE", "description": "gross - discount, excl. GST (this is revenue)"},
                    {"name": "gst_inr", "type": "DOUBLE", "description": "GST charged on net amount"},
                    {"name": "shipping_inr", "type": "DOUBLE", "description": "Shipping fee charged"},
                ],
            },
        },
    })
    return len(all_customers), len(orders)


if __name__ == "__main__":
    print("bazaarly", generate())
