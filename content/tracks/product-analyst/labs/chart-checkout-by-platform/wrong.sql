-- Common mistake: payment events / checkout events, which double-fired payments inflate,
-- and internal test accounts left in
SELECT e.platform,
       ROUND(100.0 * COUNT(*) FILTER (WHERE e.event_name = 'payment_success')
                   / COUNT(*) FILTER (WHERE e.event_name = 'checkout_start'), 1) AS checkout_conversion_pct
FROM events e
WHERE e.event_ts_ist >= TIMESTAMP '2025-08-01' AND e.event_ts_ist < TIMESTAMP '2025-09-01'
GROUP BY e.platform
ORDER BY checkout_conversion_pct DESC;
