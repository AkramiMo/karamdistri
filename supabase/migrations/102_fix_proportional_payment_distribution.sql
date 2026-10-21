-- Migration: Corriger la distribution des paiements sur les BL
-- Problème: Double exécution (trigger + frontend) corrompait les montants
-- Solution: Logique FIFO séquentielle dans le trigger, suppression de l'appel frontend

-- =====================================================
-- 1. Fonction avec distribution SÉQUENTIELLE (FIFO)
--    Paye le BL le plus ancien d'abord, puis le suivant, etc.
-- =====================================================
CREATE OR REPLACE FUNCTION sync_facture_payment_to_deliveries()
RETURNS TRIGGER AS $$
DECLARE
  v_delivery_data RECORD;
  v_remaining_amount DECIMAL(12,2);
  v_delivery_recette DECIMAL(12,2);
  v_delivery_unpaid DECIMAL(12,2);
  v_amount_to_apply DECIMAL(12,2);
  v_new_amount_paid DECIMAL(12,2);
  v_new_balance_due DECIMAL(12,2);
  v_new_status TEXT;
BEGIN
  -- Ne traiter que les paiements liés à une facture
  IF NEW.facture_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Initialiser le montant restant à distribuer
  v_remaining_amount := NEW.amount;

  -- Parcourir les BL de la facture, du plus ancien au plus récent
  FOR v_delivery_data IN
    SELECT
      d.id as delivery_id,
      d.delivery_date,
      COALESCE(d.amount_paid, 0) as current_paid,
      COALESCE((
        SELECT SUM((di.quantity_delivered - di.quantity_returned) * di.unit_price)
        FROM delivery_items di
        WHERE di.delivery_id = d.id
      ), 0) as recette
    FROM facture_deliveries fd
    JOIN deliveries d ON d.id = fd.delivery_id
    WHERE fd.facture_id = NEW.facture_id
    ORDER BY d.delivery_date ASC, d.delivery_number ASC
  LOOP
    -- Si plus rien à distribuer, sortir
    IF v_remaining_amount <= 0 THEN
      EXIT;
    END IF;

    -- Calculer ce qui reste à payer pour ce BL
    v_delivery_unpaid := GREATEST(0, v_delivery_data.recette - v_delivery_data.current_paid);

    -- Si ce BL est déjà payé, passer au suivant
    IF v_delivery_unpaid <= 0 THEN
      CONTINUE;
    END IF;

    -- Calculer combien on peut appliquer à ce BL (minimum entre reste à distribuer et reste à payer du BL)
    v_amount_to_apply := LEAST(v_remaining_amount, v_delivery_unpaid);

    -- Calculer le nouveau montant payé
    v_new_amount_paid := v_delivery_data.current_paid + v_amount_to_apply;

    -- Calculer le nouveau solde dû
    v_new_balance_due := GREATEST(0, v_delivery_data.recette - v_new_amount_paid);

    -- Déterminer le statut
    IF v_new_balance_due <= 0 AND v_delivery_data.recette > 0 THEN
      v_new_status := 'paid';
    ELSIF v_new_amount_paid > 0 THEN
      v_new_status := 'partial';
    ELSE
      v_new_status := 'pending';
    END IF;

    -- Mettre à jour le BL
    UPDATE deliveries
    SET
      amount_paid = v_new_amount_paid,
      balance_due = v_new_balance_due,
      payment_status = v_new_status
    WHERE id = v_delivery_data.delivery_id;

    -- Déduire le montant appliqué du reste à distribuer
    v_remaining_amount := v_remaining_amount - v_amount_to_apply;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 2. Recréer le trigger (au cas où)
-- =====================================================
DROP TRIGGER IF EXISTS trigger_sync_facture_payment ON payments;

CREATE TRIGGER trigger_sync_facture_payment
AFTER INSERT ON payments
FOR EACH ROW
WHEN (NEW.facture_id IS NOT NULL)
EXECUTE FUNCTION sync_facture_payment_to_deliveries();

-- =====================================================
-- 3. Recalculer tous les BL existants liés à des factures
--    avec la logique FIFO (du plus ancien au plus récent)
-- =====================================================

DO $$
DECLARE
  v_facture_record RECORD;
  v_delivery_data RECORD;
  v_total_paid DECIMAL(12,2);
  v_remaining_amount DECIMAL(12,2);
  v_delivery_recette DECIMAL(12,2);
  v_delivery_unpaid DECIMAL(12,2);
  v_amount_to_apply DECIMAL(12,2);
  v_new_balance_due DECIMAL(12,2);
  v_new_status TEXT;
BEGIN
  -- Parcourir toutes les factures ayant des paiements et des BL liés
  FOR v_facture_record IN
    SELECT DISTINCT f.id as facture_id
    FROM factures f
    WHERE EXISTS (
      SELECT 1 FROM payments p WHERE p.facture_id = f.id
    )
    AND EXISTS (
      SELECT 1 FROM facture_deliveries fd WHERE fd.facture_id = f.id
    )
  LOOP
    -- Calculer le total payé pour cette facture
    SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
    FROM payments
    WHERE facture_id = v_facture_record.facture_id;

    -- Initialiser le montant restant à distribuer
    v_remaining_amount := v_total_paid;

    -- D'abord, réinitialiser tous les BL de cette facture à 0
    UPDATE deliveries d
    SET amount_paid = 0, balance_due = 0, payment_status = 'pending'
    WHERE d.id IN (
      SELECT fd.delivery_id FROM facture_deliveries fd WHERE fd.facture_id = v_facture_record.facture_id
    );

    -- Parcourir les BL du plus ancien au plus récent
    FOR v_delivery_data IN
      SELECT
        d.id as delivery_id,
        COALESCE((
          SELECT SUM((di.quantity_delivered - di.quantity_returned) * di.unit_price)
          FROM delivery_items di
          WHERE di.delivery_id = d.id
        ), 0) as recette
      FROM facture_deliveries fd
      JOIN deliveries d ON d.id = fd.delivery_id
      WHERE fd.facture_id = v_facture_record.facture_id
      ORDER BY d.delivery_date ASC, d.delivery_number ASC
    LOOP
      -- Si plus rien à distribuer, marquer comme non payé
      IF v_remaining_amount <= 0 THEN
        UPDATE deliveries
        SET
          amount_paid = 0,
          balance_due = v_delivery_data.recette,
          payment_status = 'pending'
        WHERE id = v_delivery_data.delivery_id;
        CONTINUE;
      END IF;

      -- Calculer combien on peut appliquer à ce BL
      v_amount_to_apply := LEAST(v_remaining_amount, v_delivery_data.recette);

      -- Calculer le nouveau solde dû
      v_new_balance_due := GREATEST(0, v_delivery_data.recette - v_amount_to_apply);

      -- Déterminer le statut
      IF v_new_balance_due <= 0 AND v_delivery_data.recette > 0 THEN
        v_new_status := 'paid';
      ELSIF v_amount_to_apply > 0 THEN
        v_new_status := 'partial';
      ELSE
        v_new_status := 'pending';
      END IF;

      -- Mettre à jour le BL
      UPDATE deliveries
      SET
        amount_paid = v_amount_to_apply,
        balance_due = v_new_balance_due,
        payment_status = v_new_status
      WHERE id = v_delivery_data.delivery_id;

      -- Déduire le montant appliqué
      v_remaining_amount := v_remaining_amount - v_amount_to_apply;
    END LOOP;
  END LOOP;
END;
$$;
