-- Common mistake: cohort = first order inside the FY, so returning FY2023-24 customers look "new"
WITH delivered AS (
  SELECT DISTINCT customer_id, DATE_TRUNC('month', order_ts_utc + INTERVAL 330 MINUTE) AS order_month
  FROM (SELECT DISTINCT * FROM orders)
  WHERE order_status = 'Delivered'
    AND order_ts_utc + INTERVAL 330 MINUTE >= TIMESTAMP '2024-04-01'
),
first_month AS (SELECT customer_id, MIN(order_month) AS cohort_month FROM delivered GROUP BY 1),
sizes AS (SELECT cohort_month, COUNT(*) AS cohort_size FROM first_month GROUP BY 1),
activity AS (
  SELECT f.cohort_month, date_diff('month', f.cohort_month, d.order_month) AS month_number, d.customer_id
  FROM delivered d JOIN first_month f USING (customer_id)
)
SELECT strftime(a.cohort_month, '%Y-%m') AS cohort_month, a.month_number,
       COUNT(DISTINCT a.customer_id) AS customers,
       ROUND(100.0 * COUNT(DISTINCT a.customer_id) / s.cohort_size, 1) AS retention_pct
FROM activity a JOIN sizes s USING (cohort_month)
WHERE a.cohort_month <= DATE '2024-12-01' AND a.month_number BETWEEN 0 AND 3
GROUP BY a.cohort_month, a.month_number, s.cohort_size
ORDER BY 1, 2;
