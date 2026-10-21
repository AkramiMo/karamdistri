-- Migration: Corriger les BL des factures déjà payées
-- Pour les factures avec status = 'paid', mettre à jour les BL liés

-- 1. Mettre à jour les BL liés via facture_deliveries
UPDATE deliveries d
SET
  amount_paid = COALESCE((
    SELECT SUM((di.quantity_delivered - di.quantity_returned) * di.unit_price)
    FROM delivery_items di
    WHERE di.delivery_id = d.id
  ), 0),
  balance_due = 0,
  payment_status = 'paid'
WHERE d.id IN (
  SELECT fd.delivery_id
  FROM facture_deliveries fd
  JOIN factures f ON f.id = fd.facture_id
  WHERE f.status = 'paid'
);

-- 2. Mettre à jour les BL liés via l'ancien champ delivery_id (pour les anciennes factures)
UPDATE deliveries d
SET
  amount_paid = COALESCE((
    SELECT SUM((di.quantity_delivered - di.quantity_returned) * di.unit_price)
    FROM delivery_items di
    WHERE di.delivery_id = d.id
  ), 0),
  balance_due = 0,
  payment_status = 'paid'
WHERE d.id IN (
  SELECT f.delivery_id
  FROM factures f
  WHERE f.status = 'paid'
  AND f.delivery_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM facture_deliveries fd WHERE fd.facture_id = f.id
  )
);
