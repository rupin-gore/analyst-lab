SELECT
  strftime(applied_date, '%Y-%m') AS month,
  COUNT(*) AS applications,
  COUNT(*) FILTER (WHERE status = 'Live') AS live,
  -- Denominator: every application started that month, whatever happened to it
  ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'Live') / COUNT(*), 1) AS live_pct,
  MEDIAN(live_date - applied_date) FILTER (WHERE status = 'Live') AS median_days_to_live,
  MEDIAN(kyc_approved_date - docs_submitted_date) FILTER (WHERE kyc_approved_date IS NOT NULL) AS median_kyc_days
FROM applications
WHERE rejection_reason IS DISTINCT FROM 'Duplicate application'
GROUP BY month
ORDER BY month;
