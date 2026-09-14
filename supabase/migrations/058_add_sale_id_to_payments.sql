-- Migration: Ajouter sale_id aux paiements et synchronisation avec ventes
-- Date: 2024

-- =====================================================
-- 1. Ajouter colonne sale_id à payments
-- =====================================================
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS sale_id UUID REFERENCES sales(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_payments_sale ON payments(sale_id);

-- =====================================================
-- 2. Fonction pour mettre à jour le statut de paiement d'une vente
-- =====================================================
CREATE OR REPLACE FUNCTION update_sale_payment_status()
RETURNS TRIGGER AS $$
DECLARE
  v_sale_id UUID;
  v_total_paid DECIMAL(12,2);
  v_total_ttc DECIMAL(12,2);
  v_balance DECIMAL(12,2);
  v_status TEXT;
BEGIN
  -- Déterminer l'ID de la vente concernée
  IF TG_OP = 'DELETE' THEN
    v_sale_id := OLD.sale_id;
  ELSE
    v_sale_id := NEW.sale_id;
  END IF;

  -- Si pas de sale_id, ne rien faire
  IF v_sale_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Calculer le total payé pour cette vente
  SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
  FROM payments
  WHERE sale_id = v_sale_id;

  -- Récupérer le total TTC de la vente
  SELECT COALESCE(total_ttc, 0) INTO v_total_ttc
  FROM sales
  WHERE id = v_sale_id;

  -- Calculer le solde
  v_balance := v_total_ttc - v_total_paid;

  -- Déterminer le statut
  IF v_total_paid = 0 THEN
    v_status := 'pending';
  ELSIF v_balance <= 0 THEN
    v_status := 'paid';
    v_balance := 0;
  ELSE
    v_status := 'partial';
  END IF;

  -- Mettre à jour la vente
  UPDATE sales
  SET amount_paid = v_total_paid,
      balance_due = v_balance,
      payment_status = v_status
  WHERE id = v_sale_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 3. Triggers pour synchronisation automatique
-- =====================================================
-- Supprimer les anciens triggers s'ils existent
DROP TRIGGER IF EXISTS trigger_update_sale_payment_insert ON payments;
DROP TRIGGER IF EXISTS trigger_update_sale_payment_delete ON payments;

-- Trigger pour INSERT et UPDATE
CREATE TRIGGER trigger_update_sale_payment_insert
AFTER INSERT OR UPDATE ON payments
FOR EACH ROW
WHEN (NEW.sale_id IS NOT NULL)
EXECUTE FUNCTION update_sale_payment_status();

-- Trigger pour DELETE
CREATE TRIGGER trigger_update_sale_payment_delete
AFTER DELETE ON payments
FOR EACH ROW
WHEN (OLD.sale_id IS NOT NULL)
EXECUTE FUNCTION update_sale_payment_status();

-- =====================================================
-- 4. Fonction pour lier automatiquement les paiements existants
--    quand une vente est créée à partir d'un RBLT
-- =====================================================
CREATE OR REPLACE FUNCTION link_payments_to_sale()
RETURNS TRIGGER AS $$
DECLARE
  v_delivery_id UUID;
  v_total_paid DECIMAL(12,2);
  v_balance DECIMAL(12,2);
  v_status TEXT;
BEGIN
  -- Seulement si la vente a un return_id (créée à partir d'un RBLT)
  IF NEW.return_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Récupérer le delivery_id du RBLT
  SELECT delivery_id INTO v_delivery_id
  FROM delivery_returns
  WHERE id = NEW.return_id;

  -- Si pas de livraison liée, ne rien faire
  IF v_delivery_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Mettre à jour tous les paiements de cette livraison avec le sale_id
  UPDATE payments
  SET sale_id = NEW.id
  WHERE delivery_id = v_delivery_id
    AND sale_id IS NULL;

  -- Calculer le total payé pour cette vente
  SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
  FROM payments
  WHERE sale_id = NEW.id;

  -- Calculer le solde
  v_balance := COALESCE(NEW.total_ttc, 0) - v_total_paid;

  -- Déterminer le statut
  IF v_total_paid = 0 THEN
    v_status := 'pending';
  ELSIF v_balance <= 0 THEN
    v_status := 'paid';
    v_balance := 0;
  ELSE
    v_status := 'partial';
  END IF;

  -- Mettre à jour la vente avec les montants calculés
  NEW.amount_paid := v_total_paid;
  NEW.balance_due := v_balance;
  NEW.payment_status := v_status;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger sur sales pour lier les paiements à la création
DROP TRIGGER IF EXISTS trigger_link_payments_to_sale ON sales;

CREATE TRIGGER trigger_link_payments_to_sale
BEFORE INSERT ON sales
FOR EACH ROW
WHEN (NEW.return_id IS NOT NULL)
EXECUTE FUNCTION link_payments_to_sale();
