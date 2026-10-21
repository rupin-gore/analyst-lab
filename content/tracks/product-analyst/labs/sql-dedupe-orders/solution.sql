WITH payments AS (
  SELECT e.*,
         LAG(e.event_ts_ist) OVER (PARTITION BY e.user_id, e.session_id, e.order_value_inr ORDER BY e.event_ts_ist, e.event_id) AS prev_ts
  FROM events e
  JOIN users u USING (user_id)
  WHERE u.is_internal = 0
    AND e.event_name = 'payment_success'
),
orders AS (
  -- A repeat of the same payment within 5 seconds is a double-fired event, not a new order
  SELECT * FROM payments
  WHERE prev_ts IS NULL OR event_ts_ist - prev_ts > INTERVAL 5 SECOND
)
SELECT
  strftime(DATE_TRUNC('week', event_ts_ist), '%Y-%m-%d') AS week_start,
  COUNT(*) AS orders,
  ROUND(SUM(order_value_inr), 2) AS gmv_inr
FROM orders
WHERE event_ts_ist >= TIMESTAMP '2025-06-02'
  AND event_ts_ist <  TIMESTAMP '2025-09-01'
GROUP BY week_start
ORDER BY week_start;
