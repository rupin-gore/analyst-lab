-- Common mistake: every payment_success event counted as an order
SELECT strftime(DATE_TRUNC('week', e.event_ts_ist), '%Y-%m-%d') AS week_start,
       COUNT(*) AS orders, ROUND(SUM(e.order_value_inr), 2) AS gmv_inr
FROM events e
JOIN users u USING (user_id)
WHERE u.is_internal = 0 AND e.event_name = 'payment_success'
  AND e.event_ts_ist >= TIMESTAMP '2025-06-02' AND e.event_ts_ist < TIMESTAMP '2025-09-01'
GROUP BY week_start
ORDER BY week_start;
