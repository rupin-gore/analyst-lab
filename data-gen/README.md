# Dataset generators

Run `python data-gen/generate_all.py` (or `npm run data`). Every generator is seeded and uses only the standard library, so output is byte-identical across runs and machines.

| Dataset | Script | Tables | What it is |
|---|---|---|---|
| `bazaarly` | `bazaarly.py` | `orders` (12.5k), `customers` (2.6k) | Fictional Indian e-commerce marketplace, FY2023-24 and FY2024-25 |
| `saffron_trails` | `saffron_trails.py` | `sales` (36) | Fictional FMCG distributor's October 2024 invoice register (small, for the spreadsheet workspace) |
| `swaadly` | `swaadly.py` | `users` (4k), `events` (78k), `experiment_assignments` (2.9k) | Fictional food-delivery app, June to August 2025: product events, a feature launch and an A/B test |
| `seller_onboarding` | `seller_onboarding.py` | `applications` (1.8k), `backlog` (8) | Bazaarly seller onboarding applications, January to June 2025, and the onboarding backlog |

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

## Planted problems in `swaadly` (spoilers)

- 35 internal/test accounts (`is_internal = 1`) with heavy, almost always successful usage
- ~1.5% of `payment_success` events double-fired (same user, session and value, 1–2 seconds apart)
- ~2% of experiment users assigned to both variants by a bucketing bug
- Web users drop off much more at cart → checkout and checkout → payment
- One-tap Reorder launched 2025-07-07, with adoption growing weekly; `checkout_v2` (1–28 Aug) lifts payment success by a few points

## Planted problems in `seller_onboarding` (spoilers)

- KYC turnaround roughly doubles from April (a backlog)
- "Duplicate application" rejections are the same seller applying twice
- NULL downstream dates for in-progress and withdrawn applications (a trap for `<>` comparisons)
- June looks worse partly because applications are still in progress at the 10 July extract (right-censoring)
