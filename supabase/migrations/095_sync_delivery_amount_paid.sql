-- Migration: Synchroniser amount_paid des livraisons avec les paiements existants
-- Cette migration recalcule le amount_paid de toutes les livraisons basé sur la table payments

-- Mettre à jour amount_paid pour toutes les livraisons qui ont des paiements
UPDATE deliveries d
SET
  amount_paid = COALESCE((
    SELECT SUM(p.amount)
    FROM payments p
    WHERE p.delivery_id = d.id
  ), 0),
  balance_due = GREATEST(0,
    COALESCE((
      SELECT SUM((di.quantity_delivered - di.quantity_returned) * di.unit_price)
      FROM delivery_items di
      WHERE di.delivery_id = d.id
    ), 0) - COALESCE((
      SELECT SUM(p.amount)
      FROM payments p
      WHERE p.delivery_id = d.id
    ), 0)
  ),
  payment_status = CASE
    WHEN COALESCE((
      SELECT SUM((di.quantity_delivered - di.quantity_returned) * di.unit_price)
      FROM delivery_items di
      WHERE di.delivery_id = d.id
    ), 0) - COALESCE((
      SELECT SUM(p.amount)
      FROM payments p
      WHERE p.delivery_id = d.id
    ), 0) <= 0 THEN 'paid'
    WHEN COALESCE((
      SELECT SUM(p.amount)
      FROM payments p
      WHERE p.delivery_id = d.id
    ), 0) > 0 THEN 'partial'
    ELSE 'pending'
  END
WHERE EXISTS (
  SELECT 1 FROM payments p WHERE p.delivery_id = d.id
);
