WITH monthly AS (
  SELECT
    strftime(order_ts_utc + INTERVAL 330 MINUTE, '%Y-%m') AS month,
    SUM(net_amount_inr) AS net_revenue
  FROM (SELECT DISTINCT * FROM orders)
  WHERE order_status = 'Delivered'
  GROUP BY month
),
with_lag AS (
  -- LAG runs over every month, so April 2024 can compare with March 2024
  SELECT month, net_revenue, LAG(net_revenue) OVER (ORDER BY month) AS prev_revenue
  FROM monthly
)
SELECT
  month,
  ROUND(net_revenue, 2) AS net_revenue,
  ROUND(100 * (net_revenue - prev_revenue) / prev_revenue, 1) AS mom_growth_pct
FROM with_lag
WHERE month BETWEEN '2024-04' AND '2025-03'
ORDER BY month;
