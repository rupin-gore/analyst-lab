# Dataset generators

Run `python data-gen/generate_all.py` (or `npm run data`). Every generator is seeded and uses only the standard library, so output is byte-identical across runs and machines.

| Dataset | Script | Tables | What it is |
|---|---|---|---|
| `bazaarly` | `bazaarly.py` | `orders` (12.5k), `customers` (2.6k) | Fictional Indian e-commerce marketplace, FY2023-24 and FY2024-25 |
| `saffron_trails` | `saffron_trails.py` | `sales` (36) | Fictional FMCG distributor's October 2024 invoice register (small, for the spreadsheet workspace) |

## Planted problems in `bazaarly` (spoilers)

- ~1% exact duplicate order rows (a double-loaded ingestion batch)
- `order_ts_utc` is UTC; orders placed 00:00–05:29 IST fall on the previous UTC date, which matters at month and financial-year boundaries
- Category mislabels: `electronics`, `Electronic`, `Home and Kitchen`, `fashion ` (trailing space)
- Six rows where the discount exceeds gross (a coupon bug, so net is negative)
- Three legitimate bulk B2B orders of ₹4.5–6 lakh that dominate any mean
- Cancelled and Returned orders are not revenue
- Duplicate customers: same email with different casing under a new `customer_id`
- City spelling variants (`Bangalore`, `bengaluru `, `Bombay`) and ~2% null cities
- Some Hyderabad customers carry the pre-2014 state `Andhra Pradesh`

Seasonality: Diwali sale run-ups (12 days before Lakshmi Puja), a March year-end sale, weekend uplift and steady growth. Payments: UPI ~48%, COD higher in tier-2 cities, with COD cancelled more often. GST rates by category (books 0%).
