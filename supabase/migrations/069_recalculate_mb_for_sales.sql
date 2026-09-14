-- Migration: Recalculer la MB des ventes créées via tournées
-- Problème: Le CR n'était pas récupéré lors du calcul, donc MB = prix * qté au lieu de (prix - CR) * qté

-- =====================================================
-- Recalculer la MB pour toutes les ventes via RBLT/tournées
-- =====================================================
WITH sale_mb_calculation AS (
  SELECT
    s.id as sale_id,
    SUM(
      CASE
        WHEN a.cr IS NOT NULL THEN
          (di.unit_price - a.cr) * (di.quantity_delivered - di.quantity_returned)
        ELSE
          di.unit_price * (di.quantity_delivered - di.quantity_returned)
      END
    ) as calculated_mb,
    BOOL_OR(a.cr IS NULL AND (di.quantity_delivered - di.quantity_returned) > 0) as has_missing_cr
  FROM sales s
  JOIN delivery_returns dr ON s.return_id = dr.id
  JOIN delivery_round_items dri ON dri.round_id = dr.round_id
  JOIN delivery_items di ON di.delivery_id = dri.delivery_id
  JOIN articles a ON di.article_id = a.id
  WHERE dr.round_id IS NOT NULL
    AND (di.quantity_delivered - di.quantity_returned) > 0
  GROUP BY s.id
)
UPDATE sales s
SET
  mb = smc.calculated_mb,
  mb_warning = smc.has_missing_cr
FROM sale_mb_calculation smc
WHERE s.id = smc.sale_id;

-- =====================================================
-- Recalculer aussi pour les ventes directes (avec delivery_id)
-- =====================================================
WITH direct_sale_mb AS (
  SELECT
    s.id as sale_id,
    SUM(
      CASE
        WHEN a.cr IS NOT NULL THEN
          (di.unit_price - a.cr) * (di.quantity_delivered - di.quantity_returned)
        ELSE
          di.unit_price * (di.quantity_delivered - di.quantity_returned)
      END
    ) as calculated_mb,
    BOOL_OR(a.cr IS NULL AND (di.quantity_delivered - di.quantity_returned) > 0) as has_missing_cr
  FROM sales s
  JOIN delivery_items di ON di.delivery_id = s.delivery_id
  JOIN articles a ON di.article_id = a.id
  WHERE s.delivery_id IS NOT NULL
    AND (di.quantity_delivered - di.quantity_returned) > 0
  GROUP BY s.id
)
UPDATE sales s
SET
  mb = dsm.calculated_mb,
  mb_warning = dsm.has_missing_cr
FROM direct_sale_mb dsm
WHERE s.id = dsm.sale_id;
