WITH reasons AS (
  SELECT rejection_reason, COUNT(*) AS rejections
  FROM applications
  WHERE status = 'Rejected'
    AND rejection_reason <> 'Duplicate application'  -- not a real seller problem
  GROUP BY rejection_reason
)
SELECT
  rejection_reason,
  rejections,
  ROUND(100.0 * rejections / SUM(rejections) OVER (), 1) AS pct,
  -- Running total in descending order; ties broken by name so the order is stable
  ROUND(100.0 * SUM(rejections) OVER (ORDER BY rejections DESC, rejection_reason
                                      ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)
        / SUM(rejections) OVER (), 1) AS cumulative_pct
FROM reasons
ORDER BY rejections DESC, rejection_reason;
