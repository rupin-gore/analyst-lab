**Shared rules (apply to all four):** use `orders` after removing exact duplicate rows; dates are the **order timestamp converted to IST**; the financial year runs 1 April to 31 March; exclude test accounts; customers are counted as **people**, i.e. accounts merged on lower-cased email. B2B bulk orders (50+ units) are included in revenue but reported separately.

**1. Net revenue**: Owner: Finance Controller
- Formula: sum of `net_amount_inr` (gross minus discount), **excluding GST and shipping**.
- Includes only orders with status **Delivered**. Cancelled, Returned and Shipped-not-yet-delivered are excluded.
- Period: by IST order date. Restated if an order is later returned.

**2. Average order value (AOV)**: Owner: Finance Controller
- Formula: Net revenue ÷ number of Delivered orders in the same period.
- Grain: per order. Report the **median** alongside, because bulk orders skew the mean.

**3. Repeat purchase rate**: Owner: CRM Lead
- Formula: people whose 2nd Delivered order came **within 90 days** of their first ÷ people whose first Delivered order was in the period.
- Population: only people whose first order was **at least 90 days before the report date**, so new customers don't drag the rate down.

**4. Cancellation rate**: Owner: Customer Operations Manager
- Formula: orders with status Cancelled ÷ all orders placed (any status) in the period, by IST order date.
- Report by payment method too, because COD differs sharply from prepaid methods.

Version 1.0, approved by Finance. Changes go through the KPI owner.
