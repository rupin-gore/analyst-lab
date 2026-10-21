WITH people AS (
  -- Duplicate accounts share an email that differs only in case
  SELECT customer_id, lower(trim(email)) AS customer_email FROM customers
),
fy AS (
  SELECT p.customer_email, o.net_amount_inr
  FROM (SELECT DISTINCT * FROM orders) o
  JOIN people p USING (customer_id)
  WHERE o.order_status = 'Delivered'
    AND o.order_ts_utc + INTERVAL 330 MINUTE >= TIMESTAMP '2024-04-01'
    AND o.order_ts_utc + INTERVAL 330 MINUTE <  TIMESTAMP '2025-04-01'
),
per_person AS (
  SELECT customer_email, COUNT(*) AS order_count, ROUND(SUM(net_amount_inr), 2) AS net_revenue
  FROM fy
  GROUP BY customer_email
)
SELECT customer_email, order_count, net_revenue,
       RANK() OVER (ORDER BY net_revenue DESC) AS revenue_rank
FROM per_person
QUALIFY revenue_rank <= 10
ORDER BY revenue_rank;
