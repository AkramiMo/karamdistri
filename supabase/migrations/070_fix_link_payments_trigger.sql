-- Migration: Corriger le trigger link_payments_to_sale
-- Problème: Le trigger s'exécute BEFORE INSERT et essaie de définir sale_id
-- sur un enregistrement qui n'existe pas encore, violant la FK constraint.
-- Solution: Changer en AFTER INSERT et ajuster la fonction

-- =====================================================
-- 1. Recréer la fonction pour qu'elle fonctionne avec AFTER INSERT
-- =====================================================
CREATE OR REPLACE FUNCTION link_payments_to_sale()
RETURNS TRIGGER AS $$
DECLARE
  v_delivery_id UUID;
  v_round_id UUID;
  v_total_paid DECIMAL(12,2);
  v_balance DECIMAL(12,2);
  v_status TEXT;
BEGIN
  -- Seulement si la vente a un return_id (créée à partir d'un RBLT)
  IF NEW.return_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Récupérer le delivery_id et round_id du RBLT
  SELECT delivery_id, round_id INTO v_delivery_id, v_round_id
  FROM delivery_returns
  WHERE id = NEW.return_id;

  -- Cas 1: RBLT avec delivery_id direct (une seule livraison)
  IF v_delivery_id IS NOT NULL THEN
    UPDATE payments
    SET sale_id = NEW.id
    WHERE delivery_id = v_delivery_id
      AND sale_id IS NULL;

  -- Cas 2: RBLT via tournée (round_id, plusieurs livraisons)
  ELSIF v_round_id IS NOT NULL THEN
    UPDATE payments
    SET sale_id = NEW.id
    WHERE delivery_id IN (
      SELECT dri.delivery_id
      FROM delivery_round_items dri
      WHERE dri.round_id = v_round_id
    )
    AND sale_id IS NULL;
  END IF;

  -- Calculer le total payé pour cette vente
  SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
  FROM payments
  WHERE sale_id = NEW.id;

  -- Si aucun paiement trouvé avec sale_id, calculer depuis les livraisons de la tournée
  IF v_total_paid = 0 AND v_round_id IS NOT NULL THEN
    SELECT COALESCE(SUM(p.amount), 0) INTO v_total_paid
    FROM payments p
    JOIN delivery_round_items dri ON p.delivery_id = dri.delivery_id
    WHERE dri.round_id = v_round_id;
  END IF;

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

  -- Mettre à jour la vente avec les montants calculés (AFTER INSERT donc UPDATE)
  UPDATE sales
  SET amount_paid = v_total_paid,
      balance_due = v_balance,
      payment_status = v_status
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 2. Recréer le trigger en AFTER INSERT (au lieu de BEFORE)
-- =====================================================
DROP TRIGGER IF EXISTS trigger_link_payments_to_sale ON sales;

CREATE TRIGGER trigger_link_payments_to_sale
AFTER INSERT ON sales
FOR EACH ROW
WHEN (NEW.return_id IS NOT NULL)
EXECUTE FUNCTION link_payments_to_sale();
