WITH new_users AS (
  SELECT user_id, signup_date
  FROM users
  WHERE is_internal = 0
    AND signup_date BETWEEN DATE '2025-06-02' AND DATE '2025-08-17'
),
active_days AS (
  SELECT DISTINCT user_id, CAST(event_ts_ist AS DATE) AS active_date
  FROM events
),
flags AS (
  SELECT
    n.user_id,
    DATE_TRUNC('week', n.signup_date) AS signup_week,
    MAX(CASE WHEN a.active_date = n.signup_date + 1 THEN 1 ELSE 0 END) AS d1,
    MAX(CASE WHEN a.active_date = n.signup_date + 7 THEN 1 ELSE 0 END) AS d7
  FROM new_users n
  LEFT JOIN active_days a USING (user_id)
  GROUP BY n.user_id, signup_week
)
SELECT
  strftime(signup_week, '%Y-%m-%d') AS signup_week,
  COUNT(*) AS new_users,
  ROUND(100.0 * SUM(d1) / COUNT(*), 1) AS d1_retention_pct,
  ROUND(100.0 * SUM(d7) / COUNT(*), 1) AS d7_retention_pct
FROM flags
GROUP BY signup_week
ORDER BY signup_week;
