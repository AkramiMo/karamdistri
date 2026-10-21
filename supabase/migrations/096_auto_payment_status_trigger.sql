-- Migration: Trigger automatique pour payment_status des livraisons
-- Le payment_status est calculé automatiquement basé sur amount_paid et balance_due

-- =====================================================
-- 1. Fonction pour calculer automatiquement payment_status
-- =====================================================
CREATE OR REPLACE FUNCTION calculate_delivery_payment_status()
RETURNS TRIGGER AS $$
DECLARE
  v_recette DECIMAL(12,2);
  v_amount_paid DECIMAL(12,2);
  v_balance_due DECIMAL(12,2);
  v_new_status TEXT;
BEGIN
  -- Calculer la recette du BL (qté livrée - qté retournée) * prix
  SELECT COALESCE(SUM((quantity_delivered - quantity_returned) * unit_price), 0)
  INTO v_recette
  FROM delivery_items
  WHERE delivery_id = NEW.id;

  -- Récupérer le montant payé
  v_amount_paid := COALESCE(NEW.amount_paid, 0);

  -- Calculer le solde dû
  v_balance_due := GREATEST(0, v_recette - v_amount_paid);

  -- Déterminer le statut de paiement
  IF v_balance_due <= 0 AND v_recette > 0 THEN
    v_new_status := 'paid';
  ELSIF v_amount_paid > 0 THEN
    v_new_status := 'partial';
  ELSE
    v_new_status := 'pending';
  END IF;

  -- Mettre à jour les champs si nécessaire
  NEW.balance_due := v_balance_due;
  NEW.payment_status := v_new_status;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 2. Trigger BEFORE UPDATE sur deliveries
-- =====================================================
DROP TRIGGER IF EXISTS trigger_auto_payment_status ON deliveries;

CREATE TRIGGER trigger_auto_payment_status
BEFORE UPDATE OF amount_paid ON deliveries
FOR EACH ROW
EXECUTE FUNCTION calculate_delivery_payment_status();

-- =====================================================
-- 3. Fonction pour synchroniser les BL d'une facture payée
-- =====================================================
CREATE OR REPLACE FUNCTION sync_facture_payment_to_deliveries()
RETURNS TRIGGER AS $$
DECLARE
  v_delivery_id UUID;
  v_facture_total DECIMAL(12,2);
  v_delivery_recette DECIMAL(12,2);
  v_remaining_amount DECIMAL(12,2);
  v_delivery_payment DECIMAL(12,2);
BEGIN
  -- Ne traiter que les paiements liés à une facture
  IF NEW.facture_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Récupérer le total de la facture
  SELECT total_ttc INTO v_facture_total
  FROM factures WHERE id = NEW.facture_id;

  -- Initialiser le montant restant à répartir
  v_remaining_amount := NEW.amount;

  -- Parcourir les BL de la facture et répartir le paiement
  FOR v_delivery_id IN
    SELECT fd.delivery_id
    FROM facture_deliveries fd
    WHERE fd.facture_id = NEW.facture_id
  LOOP
    -- Calculer la recette de ce BL
    SELECT COALESCE(SUM((quantity_delivered - quantity_returned) * unit_price), 0)
    INTO v_delivery_recette
    FROM delivery_items
    WHERE delivery_id = v_delivery_id;

    -- Calculer combien on peut affecter à ce BL (proportionnel ou le reste)
    IF v_facture_total > 0 THEN
      v_delivery_payment := LEAST(
        v_remaining_amount,
        v_delivery_recette - COALESCE((SELECT amount_paid FROM deliveries WHERE id = v_delivery_id), 0)
      );
    ELSE
      v_delivery_payment := 0;
    END IF;

    -- Mettre à jour le BL si on a un montant à affecter
    IF v_delivery_payment > 0 THEN
      UPDATE deliveries
      SET amount_paid = COALESCE(amount_paid, 0) + v_delivery_payment
      WHERE id = v_delivery_id;

      v_remaining_amount := v_remaining_amount - v_delivery_payment;
    END IF;

    EXIT WHEN v_remaining_amount <= 0;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 4. Trigger AFTER INSERT sur payments pour factures
-- =====================================================
DROP TRIGGER IF EXISTS trigger_sync_facture_payment ON payments;

CREATE TRIGGER trigger_sync_facture_payment
AFTER INSERT ON payments
FOR EACH ROW
WHEN (NEW.facture_id IS NOT NULL)
EXECUTE FUNCTION sync_facture_payment_to_deliveries();

-- =====================================================
-- 5. Recalculer payment_status pour tous les BL existants
-- =====================================================
UPDATE deliveries d
SET
  balance_due = GREATEST(0,
    COALESCE((
      SELECT SUM((di.quantity_delivered - di.quantity_returned) * di.unit_price)
      FROM delivery_items di
      WHERE di.delivery_id = d.id
    ), 0) - COALESCE(d.amount_paid, 0)
  ),
  payment_status = CASE
    WHEN COALESCE(d.amount_paid, 0) > 0
      AND COALESCE((
        SELECT SUM((di.quantity_delivered - di.quantity_returned) * di.unit_price)
        FROM delivery_items di
        WHERE di.delivery_id = d.id
      ), 0) - COALESCE(d.amount_paid, 0) <= 0
    THEN 'paid'
    WHEN COALESCE(d.amount_paid, 0) > 0
    THEN 'partial'
    ELSE 'pending'
  END;
