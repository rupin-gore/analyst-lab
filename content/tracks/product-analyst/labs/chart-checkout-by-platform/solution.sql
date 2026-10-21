WITH checkout_sessions AS (
  -- One row per session that reached checkout, flagged if it ended in a payment
  SELECT
    e.platform,
    e.session_id,
    MAX(CASE WHEN e.event_name = 'payment_success' THEN 1 ELSE 0 END) AS paid
  FROM events e
  JOIN users u USING (user_id)
  WHERE u.is_internal = 0
    AND e.event_ts_ist >= TIMESTAMP '2025-08-01'
    AND e.event_ts_ist <  TIMESTAMP '2025-09-01'
  GROUP BY e.platform, e.session_id
  HAVING MAX(CASE WHEN e.event_name = 'checkout_start' THEN 1 ELSE 0 END) = 1
)
SELECT
  platform,
  ROUND(100.0 * SUM(paid) / COUNT(*), 1) AS checkout_conversion_pct
FROM checkout_sessions
GROUP BY platform
ORDER BY checkout_conversion_pct DESC;
