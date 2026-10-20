-- FY2024-25 net revenue by state (Delivered orders, India time)
SELECT
  c.state,
  SUM(o.net_amount_inr) AS net_revenue
FROM orders o
JOIN customers c ON c.customer_id = o.customer_id
-- WHERE ...
GROUP BY c.state
ORDER BY net_revenue DESC;
