-- Common mistake: denominator is every active user, not users who ordered that week
WITH weekly AS (
  SELECT DATE_TRUNC('week', e.event_ts_ist) AS week_start, e.user_id,
         MAX(CASE WHEN e.event_name = 'payment_success' THEN 1 ELSE 0 END) AS ordered,
         MAX(CASE WHEN e.event_name = 'reorder_click' THEN 1 ELSE 0 END) AS used_reorder
  FROM events e JOIN users u USING (user_id)
  WHERE u.is_internal = 0 AND e.event_ts_ist >= TIMESTAMP '2025-07-07' AND e.event_ts_ist < TIMESTAMP '2025-09-01'
  GROUP BY 1, 2
)
SELECT strftime(week_start, '%Y-%m-%d') AS week_start, SUM(ordered) AS ordering_users,
       SUM(used_reorder) AS reorder_users,
       ROUND(100.0 * SUM(used_reorder) / COUNT(*), 1) AS adoption_pct
FROM weekly GROUP BY week_start ORDER BY week_start;
