WITH orders_ist AS (
  SELECT DISTINCT *, order_ts_utc + INTERVAL 330 MINUTE AS order_ts_ist
  FROM orders
)
SELECT
  strftime(order_ts_ist, '%Y-%m') AS month,
  ROUND(SUM(net_amount_inr), 2) AS net_revenue
FROM orders_ist
WHERE order_status = 'Delivered'
  AND order_ts_ist >= TIMESTAMP '2024-04-01'
  AND order_ts_ist <  TIMESTAMP '2025-04-01'
GROUP BY month
ORDER BY month;
