WITH orders_clean AS (
  -- Remove exact duplicate rows from the double-loaded batch
  SELECT DISTINCT * FROM orders
)
SELECT
  c.state,
  ROUND(SUM(o.net_amount_inr), 2) AS net_revenue
FROM orders_clean o
JOIN customers c ON c.customer_id = o.customer_id
WHERE o.order_status = 'Delivered'
  -- Financial year is defined in India time (UTC+5:30)
  AND o.order_ts_utc + INTERVAL 330 MINUTE >= TIMESTAMP '2024-04-01'
  AND o.order_ts_utc + INTERVAL 330 MINUTE <  TIMESTAMP '2025-04-01'
GROUP BY c.state
ORDER BY net_revenue DESC;
