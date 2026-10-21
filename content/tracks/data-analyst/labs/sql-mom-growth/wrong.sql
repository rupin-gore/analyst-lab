-- Common mistake: filtering to the FY before LAG, so April has no previous month
WITH monthly AS (
  SELECT strftime(order_ts_utc + INTERVAL 330 MINUTE, '%Y-%m') AS month, SUM(net_amount_inr) AS net_revenue
  FROM (SELECT DISTINCT * FROM orders)
  WHERE order_status = 'Delivered'
    AND order_ts_utc + INTERVAL 330 MINUTE >= TIMESTAMP '2024-04-01'
    AND order_ts_utc + INTERVAL 330 MINUTE < TIMESTAMP '2025-04-01'
  GROUP BY month
)
SELECT month, ROUND(net_revenue, 2) AS net_revenue,
       ROUND(100 * (net_revenue - LAG(net_revenue) OVER (ORDER BY month)) / LAG(net_revenue) OVER (ORDER BY month), 1) AS mom_growth_pct
FROM monthly
ORDER BY month;
