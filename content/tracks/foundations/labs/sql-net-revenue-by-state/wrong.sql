-- Common mistake: no de-duplication, UTC dates
SELECT c.state, ROUND(SUM(o.net_amount_inr), 2) AS net_revenue
FROM orders o
JOIN customers c ON c.customer_id = o.customer_id
WHERE o.order_status = 'Delivered'
  AND o.order_ts_utc >= TIMESTAMP '2024-04-01'
  AND o.order_ts_utc <  TIMESTAMP '2025-04-01'
GROUP BY c.state
ORDER BY net_revenue DESC;
