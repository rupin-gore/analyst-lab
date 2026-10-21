-- Common mistake: ranking accounts, not people
SELECT lower(c.email) AS customer_email, COUNT(*) AS order_count, ROUND(SUM(o.net_amount_inr), 2) AS net_revenue,
       RANK() OVER (ORDER BY SUM(o.net_amount_inr) DESC) AS revenue_rank
FROM (SELECT DISTINCT * FROM orders) o
JOIN customers c USING (customer_id)
WHERE o.order_status = 'Delivered'
  AND o.order_ts_utc + INTERVAL 330 MINUTE >= TIMESTAMP '2024-04-01'
  AND o.order_ts_utc + INTERVAL 330 MINUTE <  TIMESTAMP '2025-04-01'
GROUP BY c.customer_id, c.email
QUALIFY revenue_rank <= 10
ORDER BY revenue_rank;
