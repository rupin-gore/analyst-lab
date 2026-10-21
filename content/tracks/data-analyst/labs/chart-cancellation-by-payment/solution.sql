SELECT
  payment_method,
  -- Rate within each method: cancelled orders / all orders of that method
  ROUND(100.0 * COUNT(*) FILTER (WHERE order_status = 'Cancelled') / COUNT(*), 1) AS cancel_rate_pct
FROM (SELECT DISTINCT * FROM orders)
WHERE order_ts_utc + INTERVAL 330 MINUTE >= TIMESTAMP '2024-04-01'
  AND order_ts_utc + INTERVAL 330 MINUTE <  TIMESTAMP '2025-04-01'
GROUP BY payment_method
ORDER BY cancel_rate_pct DESC;
