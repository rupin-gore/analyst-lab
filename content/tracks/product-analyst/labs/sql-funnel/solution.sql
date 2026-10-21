WITH steps AS (
  SELECT * FROM (VALUES
    (1, 'app_open'), (2, 'restaurant_view'), (3, 'add_to_cart'), (4, 'checkout_start'), (5, 'payment_success')
  ) AS s(step_order, step)
),
august AS (
  -- Real users only, August 2025
  SELECT e.user_id, e.event_name
  FROM events e
  JOIN users u USING (user_id)
  WHERE u.is_internal = 0
    AND e.event_ts_ist >= TIMESTAMP '2025-08-01'
    AND e.event_ts_ist <  TIMESTAMP '2025-09-01'
),
counts AS (
  SELECT s.step_order, s.step, COUNT(DISTINCT a.user_id) AS users
  FROM steps s
  LEFT JOIN august a ON a.event_name = s.step
  GROUP BY s.step_order, s.step
)
SELECT
  step_order,
  step,
  users,
  ROUND(100.0 * users / FIRST_VALUE(users) OVER (ORDER BY step_order), 1) AS pct_of_first,
  ROUND(100.0 * users / LAG(users) OVER (ORDER BY step_order), 1) AS pct_of_previous
FROM counts
ORDER BY step_order;
