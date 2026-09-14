-- Migration: Synchroniser payments avec cash_register
-- Chaque paiement créé dans payments doit créer une entrée dans cash_register

-- =====================================================
-- 1. Fonction pour synchroniser payments → cash_register
-- =====================================================
CREATE OR REPLACE FUNCTION sync_payment_to_cash_register()
RETURNS TRIGGER AS $$
DECLARE
  v_reference TEXT;
  v_notes TEXT;
BEGIN
  -- Construire la référence et les notes
  IF NEW.delivery_id IS NOT NULL THEN
    -- Paiement lié à un BL
    SELECT 'BL-' || d.delivery_number INTO v_reference
    FROM deliveries d WHERE d.id = NEW.delivery_id;
    v_notes := 'Paiement ' || NEW.payment_number || ' - BL';
  ELSIF NEW.sale_id IS NOT NULL THEN
    -- Paiement lié à une vente
    SELECT s.sale_number INTO v_reference
    FROM sales s WHERE s.id = NEW.sale_id;
    v_notes := 'Paiement ' || NEW.payment_number || ' - Vente ' || COALESCE(v_reference, '');
  ELSIF NEW.facture_id IS NOT NULL THEN
    -- Paiement lié à une facture
    SELECT 'FAC-' || f.facture_number INTO v_reference
    FROM factures f WHERE f.id = NEW.facture_id;
    v_notes := 'Paiement ' || NEW.payment_number || ' - Facture';
  ELSE
    v_reference := NEW.payment_number;
    v_notes := 'Paiement ' || NEW.payment_number;
  END IF;

  -- Insérer dans cash_register
  INSERT INTO cash_register (
    transaction_date,
    category,
    operation_type,
    amount,
    reference,
    reference_id,
    notes
  ) VALUES (
    NEW.payment_date,
    'encaissement',
    'in',
    NEW.amount,
    v_reference,
    NEW.id,  -- reference_id = payment_id pour éviter les doublons
    v_notes
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 2. Trigger AFTER INSERT sur payments
-- =====================================================
DROP TRIGGER IF EXISTS trigger_sync_payment_to_cash ON payments;

CREATE TRIGGER trigger_sync_payment_to_cash
AFTER INSERT ON payments
FOR EACH ROW
EXECUTE FUNCTION sync_payment_to_cash_register();

-- =====================================================
-- 3. Synchroniser les paiements existants qui n'ont pas d'entrée cash_register
-- =====================================================
INSERT INTO cash_register (transaction_date, category, operation_type, amount, reference, reference_id, notes)
SELECT
  p.payment_date,
  'encaissement',
  'in',
  p.amount,
  COALESCE(
    (SELECT 'BL-' || d.delivery_number FROM deliveries d WHERE d.id = p.delivery_id),
    (SELECT s.sale_number FROM sales s WHERE s.id = p.sale_id),
    p.payment_number
  ),
  p.id,
  'Paiement ' || p.payment_number || ' (sync)'
FROM payments p
WHERE NOT EXISTS (
  SELECT 1 FROM cash_register cr WHERE cr.reference_id = p.id
);
