WITH labelled AS (
  SELECT
    -- Map every spelling variant to one canonical label
    CASE lower(trim(category))
      WHEN 'electronic' THEN 'Electronics'
      WHEN 'electronics' THEN 'Electronics'
      WHEN 'home and kitchen' THEN 'Home & Kitchen'
      WHEN 'home & kitchen' THEN 'Home & Kitchen'
      WHEN 'fashion' THEN 'Fashion'
      ELSE trim(category)
    END AS category,
    net_amount_inr
  FROM (SELECT DISTINCT * FROM orders)
  WHERE order_status = 'Delivered'
    AND order_ts_utc + INTERVAL 330 MINUTE >= TIMESTAMP '2024-04-01'
    AND order_ts_utc + INTERVAL 330 MINUTE <  TIMESTAMP '2025-04-01'
)
SELECT
  category,
  ROUND(SUM(net_amount_inr), 2) AS net_revenue,
  -- SUM(SUM(...)) OVER () is the grand total across all groups
  ROUND(100 * SUM(net_amount_inr) / SUM(SUM(net_amount_inr)) OVER (), 1) AS share_pct
FROM labelled
GROUP BY category
ORDER BY net_revenue DESC;
