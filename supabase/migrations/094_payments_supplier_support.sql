-- Migration: Ajouter support paiements fournisseurs dans la table payments
-- Les paiements peuvent maintenant être de type 'client' (encaissement) ou 'fournisseur' (décaissement)

-- =====================================================
-- 1. Ajouter les colonnes à la table payments
-- =====================================================

-- Type de paiement : client (défaut) ou fournisseur
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_type TEXT DEFAULT 'client' CHECK (payment_type IN ('client', 'fournisseur'));

-- Référence au fournisseur (pour les paiements fournisseur)
ALTER TABLE payments ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL;

-- Référence à la réception/BR (pour les paiements fournisseur)
ALTER TABLE payments ADD COLUMN IF NOT EXISTS reception_id UUID REFERENCES receptions(id) ON DELETE SET NULL;

-- Mettre à jour tous les paiements existants comme type 'client'
UPDATE payments SET payment_type = 'client' WHERE payment_type IS NULL;

-- =====================================================
-- 2. Modifier le trigger de synchronisation avec cash_register
-- =====================================================

CREATE OR REPLACE FUNCTION sync_payment_to_cash_register()
RETURNS TRIGGER AS $$
DECLARE
  v_reference TEXT;
  v_notes TEXT;
  v_operation_type TEXT;
  v_category TEXT;
BEGIN
  -- Déterminer le type d'opération selon le type de paiement
  IF NEW.payment_type = 'fournisseur' THEN
    v_operation_type := 'out';
    v_category := 'decaissement';

    -- Construire la référence pour un paiement fournisseur
    IF NEW.reception_id IS NOT NULL THEN
      SELECT 'BR-' || r.reception_number INTO v_reference
      FROM receptions r WHERE r.id = NEW.reception_id;
      v_notes := 'Paiement fournisseur ' || NEW.payment_number || ' - BR';
    ELSE
      v_reference := NEW.payment_number;
      v_notes := 'Paiement fournisseur ' || NEW.payment_number;
    END IF;
  ELSE
    -- Paiement client (comportement existant)
    v_operation_type := 'in';
    v_category := 'encaissement';

    IF NEW.delivery_id IS NOT NULL THEN
      SELECT 'BL-' || d.delivery_number INTO v_reference
      FROM deliveries d WHERE d.id = NEW.delivery_id;
      v_notes := 'Paiement ' || NEW.payment_number || ' - BL';
    ELSIF NEW.sale_id IS NOT NULL THEN
      SELECT s.sale_number INTO v_reference
      FROM sales s WHERE s.id = NEW.sale_id;
      v_notes := 'Paiement ' || NEW.payment_number || ' - Vente ' || COALESCE(v_reference, '');
    ELSIF NEW.facture_id IS NOT NULL THEN
      SELECT 'FAC-' || f.facture_number INTO v_reference
      FROM factures f WHERE f.id = NEW.facture_id;
      v_notes := 'Paiement ' || NEW.payment_number || ' - Facture';
    ELSE
      v_reference := NEW.payment_number;
      v_notes := 'Paiement ' || NEW.payment_number;
    END IF;
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
    v_category,
    v_operation_type,
    NEW.amount,
    v_reference,
    NEW.id,
    v_notes
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 3. Trigger pour mettre à jour le payment_status de la réception
-- =====================================================

CREATE OR REPLACE FUNCTION update_reception_payment_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Quand un paiement fournisseur est créé avec une reception_id
  IF NEW.payment_type = 'fournisseur' AND NEW.reception_id IS NOT NULL THEN
    UPDATE receptions
    SET payment_status = 'paye'
    WHERE id = NEW.reception_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_reception_payment ON payments;

CREATE TRIGGER trigger_update_reception_payment
AFTER INSERT ON payments
FOR EACH ROW
WHEN (NEW.payment_type = 'fournisseur' AND NEW.reception_id IS NOT NULL)
EXECUTE FUNCTION update_reception_payment_status();

-- =====================================================
-- 4. Trigger pour remettre payment_status à non_paye si paiement supprimé
-- =====================================================

CREATE OR REPLACE FUNCTION revert_reception_payment_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Quand un paiement fournisseur est supprimé
  IF OLD.payment_type = 'fournisseur' AND OLD.reception_id IS NOT NULL THEN
    UPDATE receptions
    SET payment_status = 'non_paye'
    WHERE id = OLD.reception_id;
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_revert_reception_payment ON payments;

CREATE TRIGGER trigger_revert_reception_payment
BEFORE DELETE ON payments
FOR EACH ROW
WHEN (OLD.payment_type = 'fournisseur' AND OLD.reception_id IS NOT NULL)
EXECUTE FUNCTION revert_reception_payment_status();

-- =====================================================
-- 5. Index pour améliorer les performances
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_payments_payment_type ON payments(payment_type);
CREATE INDEX IF NOT EXISTS idx_payments_supplier_id ON payments(supplier_id);
CREATE INDEX IF NOT EXISTS idx_payments_reception_id ON payments(reception_id);
