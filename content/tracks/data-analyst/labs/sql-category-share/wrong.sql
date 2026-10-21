-- Common mistake: grouping on the raw labels
SELECT category, ROUND(SUM(net_amount_inr), 2) AS net_revenue,
       ROUND(100 * SUM(net_amount_inr) / SUM(SUM(net_amount_inr)) OVER (), 1) AS share_pct
FROM (SELECT DISTINCT * FROM orders)
WHERE order_status = 'Delivered'
  AND order_ts_utc + INTERVAL 330 MINUTE >= TIMESTAMP '2024-04-01'
  AND order_ts_utc + INTERVAL 330 MINUTE <  TIMESTAMP '2025-04-01'
GROUP BY category
ORDER BY net_revenue DESC;
