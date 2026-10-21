-- Common mistake: counting events instead of users, and keeping internal test accounts
WITH steps AS (
  SELECT * FROM (VALUES
    (1, 'app_open'), (2, 'restaurant_view'), (3, 'add_to_cart'), (4, 'checkout_start'), (5, 'payment_success')
  ) AS s(step_order, step)
),
counts AS (
  SELECT s.step_order, s.step, COUNT(e.event_id) AS users
  FROM steps s
  LEFT JOIN events e ON e.event_name = s.step
    AND e.event_ts_ist >= TIMESTAMP '2025-08-01' AND e.event_ts_ist < TIMESTAMP '2025-09-01'
  GROUP BY s.step_order, s.step
)
SELECT step_order, step, users,
       ROUND(100.0 * users / FIRST_VALUE(users) OVER (ORDER BY step_order), 1) AS pct_of_first,
       ROUND(100.0 * users / LAG(users) OVER (ORDER BY step_order), 1) AS pct_of_previous
FROM counts
ORDER BY step_order;
