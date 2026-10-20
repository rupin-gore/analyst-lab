-- Monthly net revenue, FY2024-25, India time
SELECT
  strftime(order_ts_utc, '%Y-%m') AS month,
  SUM(net_amount_inr) AS net_revenue
FROM orders
-- WHERE ...
GROUP BY month
ORDER BY month;
