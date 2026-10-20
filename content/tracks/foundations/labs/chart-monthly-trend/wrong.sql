-- Common mistake: UTC months and no de-duplication
SELECT strftime(order_ts_utc, '%Y-%m') AS month, ROUND(SUM(net_amount_inr), 2) AS net_revenue
FROM orders
WHERE order_status = 'Delivered'
  AND order_ts_utc >= TIMESTAMP '2024-04-01' AND order_ts_utc < TIMESTAMP '2025-04-01'
GROUP BY month
ORDER BY month;
