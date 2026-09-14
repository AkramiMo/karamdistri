-- Migration: Corriger le statut de paiement des ventes créées via tournées
-- Problème: Les paiements sont liés aux livraisons, pas à la vente
-- Le trigger link_payments_to_sale ne gère pas les ventes via round_id

-- =====================================================
-- 1. Corriger VTE-2026-000001 spécifiquement
-- =====================================================
WITH sale_info AS (
  SELECT
    s.id as sale_id,
    s.total_ttc,
    s.return_id,
    dr.round_id
  FROM sales s
  JOIN delivery_returns dr ON s.return_id = dr.id
  WHERE s.sale_number = 'VTE-2026-000001'
),
round_deliveries AS (
  SELECT dri.delivery_id
  FROM sale_info si
  JOIN delivery_round_items dri ON dri.round_id = si.round_id
),
total_payments AS (
  SELECT COALESCE(SUM(p.amount), 0) as total_paid
  FROM payments p
  WHERE p.delivery_id IN (SELECT delivery_id FROM round_deliveries)
)
UPDATE sales s
SET
  amount_paid = tp.total_paid,
  balance_due = GREATEST(0, si.total_ttc - tp.total_paid),
  payment_status = CASE
    WHEN tp.total_paid = 0 THEN 'pending'
    WHEN tp.total_paid >= si.total_ttc THEN 'paid'
    ELSE 'partial'
  END
FROM sale_info si, total_payments tp
WHERE s.id = si.sale_id;

-- =====================================================
-- 2. Corriger TOUTES les ventes via tournées (round_id)
-- =====================================================
WITH sales_from_rounds AS (
  SELECT
    s.id as sale_id,
    s.total_ttc,
    dr.round_id
  FROM sales s
  JOIN delivery_returns dr ON s.return_id = dr.id
  WHERE dr.round_id IS NOT NULL
),
payments_per_sale AS (
  SELECT
    sfr.sale_id,
    sfr.total_ttc,
    COALESCE(SUM(p.amount), 0) as total_paid
  FROM sales_from_rounds sfr
  JOIN delivery_round_items dri ON dri.round_id = sfr.round_id
  LEFT JOIN payments p ON p.delivery_id = dri.delivery_id
  GROUP BY sfr.sale_id, sfr.total_ttc
)
UPDATE sales s
SET
  amount_paid = pps.total_paid,
  balance_due = GREATEST(0, pps.total_ttc - pps.total_paid),
  payment_status = CASE
    WHEN pps.total_paid = 0 THEN 'pending'
    WHEN pps.total_paid >= pps.total_ttc THEN 'paid'
    ELSE 'partial'
  END
FROM payments_per_sale pps
WHERE s.id = pps.sale_id;

-- =====================================================
-- 3. Améliorer le trigger pour gérer les ventes via tournées
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

  -- Si aucun paiement trouvé, calculer depuis les livraisons
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

  -- Mettre à jour la vente avec les montants calculés
  NEW.amount_paid := v_total_paid;
  NEW.balance_due := v_balance;
  NEW.payment_status := v_status;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 4. Fonction pour recalculer le statut d'une vente via tournée
--    quand un paiement est ajouté à une livraison de la tournée
-- =====================================================
CREATE OR REPLACE FUNCTION update_sale_from_delivery_payment()
RETURNS TRIGGER AS $$
DECLARE
  v_sale_id UUID;
  v_round_id UUID;
  v_total_paid DECIMAL(12,2);
  v_total_ttc DECIMAL(12,2);
  v_balance DECIMAL(12,2);
  v_status TEXT;
  v_delivery_id UUID;
BEGIN
  -- Déterminer le delivery_id concerné
  IF TG_OP = 'DELETE' THEN
    v_delivery_id := OLD.delivery_id;
  ELSE
    v_delivery_id := NEW.delivery_id;
  END IF;

  -- Si pas de delivery_id, ne rien faire
  IF v_delivery_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Chercher si cette livraison fait partie d'une tournée avec une vente
  SELECT s.id, s.total_ttc, dr.round_id
  INTO v_sale_id, v_total_ttc, v_round_id
  FROM delivery_round_items dri
  JOIN delivery_returns dr ON dr.round_id = dri.round_id
  JOIN sales s ON s.return_id = dr.id
  WHERE dri.delivery_id = v_delivery_id
  LIMIT 1;

  -- Si pas de vente trouvée, ne rien faire
  IF v_sale_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Calculer le total payé pour toutes les livraisons de la tournée
  SELECT COALESCE(SUM(p.amount), 0) INTO v_total_paid
  FROM payments p
  JOIN delivery_round_items dri ON p.delivery_id = dri.delivery_id
  WHERE dri.round_id = v_round_id;

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

-- Trigger pour mettre à jour les ventes via tournées quand un paiement est modifié
DROP TRIGGER IF EXISTS trigger_update_sale_from_delivery_payment ON payments;

CREATE TRIGGER trigger_update_sale_from_delivery_payment
AFTER INSERT OR UPDATE OR DELETE ON payments
FOR EACH ROW
EXECUTE FUNCTION update_sale_from_delivery_payment();
