-- Common mistakes: rejection_reason <> 'Duplicate application' drops every NULL row,
-- and AVG instead of MEDIAN lets a few slow cases dominate
SELECT
  strftime(applied_date, '%Y-%m') AS month,
  COUNT(*) AS applications,
  COUNT(*) FILTER (WHERE status = 'Live') AS live,
  ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'Live') / COUNT(*), 1) AS live_pct,
  ROUND(AVG(live_date - applied_date), 1) AS median_days_to_live,
  ROUND(AVG(kyc_approved_date - docs_submitted_date), 1) AS median_kyc_days
FROM applications
WHERE rejection_reason <> 'Duplicate application'
GROUP BY month
ORDER BY month;
