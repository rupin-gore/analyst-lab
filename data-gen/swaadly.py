"""Swaadly: a fictional Indian food-delivery app. Product events, June to August 2025.

Event times are already in IST (`event_ts_ist`) so product labs focus on product questions.

Planted problems (do NOT show these in the UI; solutions and hints refer to them):
  * users: 35 internal/test accounts (`is_internal = 1`) with very heavy, unrealistically
    successful usage that inflates funnels and conversion if not excluded
  * events: ~1.5% of payment_success events are double-fired (same user, session and value,
    1-2 seconds apart, new event_id), which inflates order counts and GMV
  * experiment_assignments: ~2% of users were assigned to BOTH variants by a bucketing bug;
    they must be excluded from the A/B analysis
  * web users drop off far more between checkout_start and payment_success
Feature launches: one-tap Reorder on 2025-07-07. Experiment `checkout_v2` (one-page checkout)
ran 2025-08-01 to 2025-08-28 and lifts payment success after checkout.
"""
from __future__ import annotations

import math
from datetime import date, datetime, timedelta

from common import rng, weighted, write_csv, write_manifest

DATASET = "swaadly"
SEED = 20250601
START = date(2025, 6, 1)
END = date(2025, 8, 31)
REORDER_LAUNCH = date(2025, 7, 7)
EXP_START = date(2025, 8, 1)
EXP_END = date(2025, 8, 28)

CITIES = [("Bengaluru", 18), ("Mumbai", 16), ("Delhi", 15), ("Hyderabad", 12), ("Pune", 9), ("Chennai", 9),
          ("Kolkata", 7), ("Ahmedabad", 5), ("Jaipur", 4), ("Lucknow", 3), ("Kochi", 2)]
PLATFORMS = [("android", 70), ("ios", 20), ("web", 10)]
CHANNELS = [("Organic", 40), ("Referral", 20), ("Google Ads", 22), ("Instagram", 18)]
HOURS = list(range(24))
HOUR_W = [2, 1, 1, 0, 0, 0, 1, 2, 4, 5, 6, 9, 14, 15, 11, 6, 5, 7, 10, 15, 18, 16, 10, 5]


def generate():
    r = rng(SEED)
    users = []
    n_users = 4000
    for i in range(1, n_users + 1):
        if r.random() < 0.45:
            signup = date(2024, 10, 1) + timedelta(days=r.randint(0, (START - date(2024, 10, 1)).days - 1))
        else:
            # more signups later in the period (growth)
            signup = START + timedelta(days=int(((END - START).days) * (r.random() ** 0.8)))
        users.append({
            "user_id": f"U{100000 + i}",
            "signup_date": signup,
            "city": weighted(r, [c for c, _ in CITIES], [w for _, w in CITIES]),
            "platform": weighted(r, [p for p, _ in PLATFORMS], [w for _, w in PLATFORMS]),
            "acquisition_channel": weighted(r, [c for c, _ in CHANNELS], [w for _, w in CHANNELS]),
            "is_internal": 0,
            "prop": math.exp(r.gauss(-0.3, 0.75)),
        })
    for u in r.sample(users, 35):
        u["is_internal"] = 1
        u["prop"] = 6.0
        u["signup_date"] = date(2024, 10, 1)

    events = []
    assignments = []
    eid = 0
    sid = 0
    orders_so_far = {u["user_id"]: 0 for u in users}
    assigned = {}

    def add(uid, sess, ts, name, platform, value=None):
        nonlocal eid
        eid += 1
        events.append([f"E{eid:07d}", uid, sess, ts, name, platform, value])

    day = START
    while day <= END:
        weekend = day.weekday() >= 5
        for u in users:
            if u["signup_date"] > day:
                continue
            d = (day - u["signup_date"]).days
            if d == 0 and u["signup_date"] >= START:
                p = 1.0
            else:
                p = min(0.95, u["prop"] * (0.05 + 0.22 * math.exp(-d / 5)) * (1.25 if weekend else 1.0))
            if r.random() >= p:
                continue
            sessions = 1 + (1 if r.random() < 0.15 else 0)
            for _ in range(sessions):
                sid += 1
                sess = f"S{sid:07d}"
                t = datetime(day.year, day.month, day.day, weighted(r, HOURS, HOUR_W), r.randint(0, 59), r.randint(0, 59))
                step = lambda: timedelta(seconds=r.randint(8, 90))  # noqa: E731
                uid, plat = u["user_id"], u["platform"]
                internal = u["is_internal"] == 1
                add(uid, sess, t, "app_open", plat)

                # Experiment assignment on the first session in the window.
                variant = None
                if EXP_START <= day <= EXP_END:
                    if uid not in assigned:
                        assigned[uid] = "treatment" if r.random() < 0.5 else "control"
                        assignments.append([uid, "checkout_v2", assigned[uid], t])
                        if r.random() < 0.02:  # bucketing bug: also lands in the other arm later
                            other = "control" if assigned[uid] == "treatment" else "treatment"
                            assignments.append([uid, "checkout_v2", other, t + timedelta(days=r.randint(1, 5))])
                    variant = assigned[uid]

                reorder_p = 0.0
                if day >= REORDER_LAUNCH and orders_so_far[uid] > 0:
                    weeks = (day - REORDER_LAUNCH).days / 7
                    reorder_p = min(0.30, 0.08 + 0.025 * weeks)
                went_checkout = False
                reordered = False
                if r.random() < reorder_p:
                    t += step()
                    add(uid, sess, t, "reorder_click", plat)
                    reordered = True
                    went_checkout = r.random() < 0.8
                else:
                    if r.random() < (0.97 if internal else 0.85):
                        for _ in range(r.randint(1, 3)):
                            t += step()
                            add(uid, sess, t, "restaurant_view", plat)
                        if r.random() < (0.9 if internal else 0.45):
                            t += step()
                            add(uid, sess, t, "add_to_cart", plat)
                            went_checkout = r.random() < (0.95 if internal else 0.50 if plat == "web" else 0.72)
                if went_checkout:
                    t += step()
                    add(uid, sess, t, "checkout_start", plat)
                    base = 0.48 if plat == "web" else 0.63
                    if variant == "treatment":
                        base += 0.07
                    if internal:
                        base = 0.98
                    if r.random() < base:
                        t += timedelta(seconds=r.randint(20, 120))
                        value = round(math.exp(r.gauss(math.log(420 if reordered else 380), 0.45)))
                        add(uid, sess, t, "payment_success", plat, value)
                        orders_so_far[uid] += 1
                        if r.random() < 0.015:  # double-fired event
                            add(uid, sess, t + timedelta(seconds=r.randint(1, 2)), "payment_success", plat, value)
        day += timedelta(days=1)

    events.sort(key=lambda e: (e[3], e[0]))
    for e in events:
        e[3] = e[3].strftime("%Y-%m-%d %H:%M:%S")
    for a in assignments:
        a[3] = a[3].strftime("%Y-%m-%d %H:%M:%S")
    assignments.sort(key=lambda a: (a[3], a[0]))

    write_csv(DATASET, "users", ["user_id", "signup_date", "city", "platform", "acquisition_channel", "is_internal"],
              [[u["user_id"], u["signup_date"].isoformat(), u["city"], u["platform"], u["acquisition_channel"],
                u["is_internal"]] for u in users])
    write_csv(DATASET, "events", ["event_id", "user_id", "session_id", "event_ts_ist", "event_name", "platform",
                                  "order_value_inr"], events)
    write_csv(DATASET, "experiment_assignments", ["user_id", "experiment", "variant", "assigned_ts_ist"], assignments)

    write_manifest(DATASET, {
        "id": DATASET,
        "title": "Swaadly food delivery app",
        "description": "Users, product events and an A/B test assignment log for Swaadly, a fictional Indian "
                       "food-delivery app, 1 June to 31 August 2025. Times are in IST.",
        "tables": {
            "users": {"file": "users.csv", "rows": len(users), "columns": [
                {"name": "user_id", "type": "VARCHAR", "description": "User key, e.g. U100001"},
                {"name": "signup_date", "type": "DATE", "description": "Date the account was created (IST)"},
                {"name": "city", "type": "VARCHAR", "description": "Delivery city"},
                {"name": "platform", "type": "VARCHAR", "description": "android, ios or web"},
                {"name": "acquisition_channel", "type": "VARCHAR", "description": "How the user first arrived"},
                {"name": "is_internal", "type": "INTEGER", "description": "1 = employee or QA test account"},
            ]},
            "events": {"file": "events.csv", "rows": len(events), "columns": [
                {"name": "event_id", "type": "VARCHAR", "description": "Event key"},
                {"name": "user_id", "type": "VARCHAR", "description": "FK to users"},
                {"name": "session_id", "type": "VARCHAR", "description": "App session"},
                {"name": "event_ts_ist", "type": "TIMESTAMP", "description": "Event time in IST"},
                {"name": "event_name", "type": "VARCHAR", "description": "app_open, restaurant_view, add_to_cart, "
                 "checkout_start, payment_success, reorder_click"},
                {"name": "platform", "type": "VARCHAR", "description": "android, ios or web"},
                {"name": "order_value_inr", "type": "DOUBLE", "description": "Order value, only on payment_success"},
            ]},
            "experiment_assignments": {"file": "experiment_assignments.csv", "rows": len(assignments), "columns": [
                {"name": "user_id", "type": "VARCHAR", "description": "FK to users"},
                {"name": "experiment", "type": "VARCHAR", "description": "Experiment key (checkout_v2)"},
                {"name": "variant", "type": "VARCHAR", "description": "control or treatment"},
                {"name": "assigned_ts_ist", "type": "TIMESTAMP", "description": "When the user was bucketed"},
            ]},
        },
    })
    return len(users), len(events), len(assignments)


if __name__ == "__main__":
    print(DATASET, generate())
