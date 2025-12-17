-- Migration: Système de paiements partiels et suivi compte client
-- Date: 2024

-- =====================================================
-- 1. Mise à jour table deliveries (DOIT ETRE EN PREMIER)
-- =====================================================
-- Ajouter colonnes de suivi paiement
ALTER TABLE deliveries
ADD COLUMN IF NOT EXISTS total_ttc DECIMAL(12, 2),
ADD COLUMN IF NOT EXISTS amount_paid DECIMAL(12, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS balance_due DECIMAL(12, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending';

-- Ajouter contrainte CHECK si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'deliveries_payment_status_check'
  ) THEN
    ALTER TABLE deliveries ADD CONSTRAINT deliveries_payment_status_check
      CHECK (payment_status IN ('pending', 'partial', 'paid'));
  END IF;
END $$;

-- Initialiser total_ttc pour les livraisons existantes
UPDATE deliveries
SET total_ttc = COALESCE(total_ht, 0) * 1.2
WHERE total_ttc IS NULL;

-- Initialiser balance_due
UPDATE deliveries
SET balance_due = COALESCE(total_ttc, COALESCE(total_ht, 0) * 1.2)
WHERE balance_due IS NULL OR balance_due = 0;

-- =====================================================
-- 2. Table des paiements
-- =====================================================
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_number TEXT UNIQUE NOT NULL,        -- REC001, REC002...
  client_id UUID NOT NULL REFERENCES clients(id),
  delivery_id UUID REFERENCES deliveries(id), -- Peut être NULL pour paiement global
  amount DECIMAL(12, 2) NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'check', 'transfer', 'card')),
  payment_date DATE DEFAULT CURRENT_DATE,
  reference TEXT,                             -- N° chèque, référence virement, etc.
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_payments_client ON payments(client_id);
CREATE INDEX IF NOT EXISTS idx_payments_delivery ON payments(delivery_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);

-- (Section déplacée au début du fichier)

-- =====================================================
-- 3. Fonction pour générer numéro de reçu
-- =====================================================
CREATE OR REPLACE FUNCTION generate_payment_number()
RETURNS TEXT AS $$
DECLARE
  last_num INT;
  new_num TEXT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(payment_number FROM 4) AS INT)), 0) + 1
  INTO last_num
  FROM payments
  WHERE payment_number LIKE 'REC%';

  new_num := 'REC' || LPAD(last_num::TEXT, 5, '0');
  RETURN new_num;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 4. Fonction pour mettre à jour le statut de paiement d'une livraison
-- =====================================================
CREATE OR REPLACE FUNCTION update_delivery_payment_status()
RETURNS TRIGGER AS $$
DECLARE
  v_total_paid DECIMAL(12, 2);
  v_total_ttc DECIMAL(12, 2);
  v_balance DECIMAL(12, 2);
  v_status TEXT;
BEGIN
  -- Calculer le total payé pour cette livraison
  SELECT COALESCE(SUM(amount), 0)
  INTO v_total_paid
  FROM payments
  WHERE delivery_id = COALESCE(NEW.delivery_id, OLD.delivery_id);

  -- Récupérer le total TTC de la livraison
  SELECT COALESCE(total_ttc, total_ht, 0)
  INTO v_total_ttc
  FROM deliveries
  WHERE id = COALESCE(NEW.delivery_id, OLD.delivery_id);

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

  -- Mettre à jour la livraison
  UPDATE deliveries
  SET
    amount_paid = v_total_paid,
    balance_due = v_balance,
    payment_status = v_status
  WHERE id = COALESCE(NEW.delivery_id, OLD.delivery_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers pour mise à jour automatique (séparés pour INSERT/UPDATE et DELETE)
DROP TRIGGER IF EXISTS trigger_update_delivery_payment ON payments;
DROP TRIGGER IF EXISTS trigger_update_delivery_payment_insert ON payments;
DROP TRIGGER IF EXISTS trigger_update_delivery_payment_delete ON payments;

-- Trigger pour INSERT et UPDATE
CREATE TRIGGER trigger_update_delivery_payment_insert
AFTER INSERT OR UPDATE ON payments
FOR EACH ROW
WHEN (NEW.delivery_id IS NOT NULL)
EXECUTE FUNCTION update_delivery_payment_status();

-- Trigger pour DELETE
CREATE TRIGGER trigger_update_delivery_payment_delete
AFTER DELETE ON payments
FOR EACH ROW
WHEN (OLD.delivery_id IS NOT NULL)
EXECUTE FUNCTION update_delivery_payment_status();

-- =====================================================
-- 5. Vue pour le solde client
-- =====================================================
CREATE OR REPLACE VIEW client_balances AS
SELECT
  c.id AS client_id,
  c.code AS client_code,
  c.name AS client_name,
  COUNT(DISTINCT d.id) AS total_deliveries,
  COALESCE(SUM(CASE WHEN d.status = 'delivered' THEN COALESCE(d.total_ttc, d.total_ht, 0) END), 0) AS total_due,
  COALESCE(SUM(p.amount), 0) AS total_paid,
  COALESCE(SUM(CASE WHEN d.status = 'delivered' THEN COALESCE(d.total_ttc, d.total_ht, 0) END), 0) - COALESCE(SUM(p.amount), 0) AS balance
FROM clients c
LEFT JOIN deliveries d ON d.client_id = c.id
LEFT JOIN payments p ON p.client_id = c.id
GROUP BY c.id, c.code, c.name;

-- =====================================================
-- 6. Vue détaillée des transactions client
-- =====================================================
CREATE OR REPLACE VIEW client_transactions AS
SELECT
  client_id,
  'delivery' AS transaction_type,
  id AS reference_id,
  delivery_number AS reference_number,
  delivery_date AS transaction_date,
  COALESCE(total_ttc, total_ht, 0) AS debit,
  0 AS credit,
  status AS details,
  created_at
FROM deliveries
WHERE status = 'delivered'

UNION ALL

SELECT
  client_id,
  'payment' AS transaction_type,
  id AS reference_id,
  payment_number AS reference_number,
  payment_date AS transaction_date,
  0 AS debit,
  amount AS credit,
  payment_method AS details,
  created_at
FROM payments

ORDER BY transaction_date DESC, created_at DESC;

-- =====================================================
-- 7. RLS Policies
-- =====================================================
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Policy pour lecture
DROP POLICY IF EXISTS "Users can view payments" ON payments;
CREATE POLICY "Users can view payments" ON payments
  FOR SELECT USING (true);

-- Policy pour insertion
DROP POLICY IF EXISTS "Users can insert payments" ON payments;
CREATE POLICY "Users can insert payments" ON payments
  FOR INSERT WITH CHECK (true);

-- Policy pour mise à jour
DROP POLICY IF EXISTS "Users can update payments" ON payments;
CREATE POLICY "Users can update payments" ON payments
  FOR UPDATE USING (true);

-- Policy pour suppression
DROP POLICY IF EXISTS "Users can delete payments" ON payments;
CREATE POLICY "Users can delete payments" ON payments
  FOR DELETE USING (true);

-- =====================================================
-- 8. Recalculer les paiements existants
-- =====================================================
-- Recalculer pour les livraisons qui ont déjà des paiements
UPDATE deliveries d
SET
  amount_paid = COALESCE(p.total_paid, 0),
  balance_due = COALESCE(d.total_ttc, d.total_ht * 1.2, 0) - COALESCE(p.total_paid, 0),
  payment_status = CASE
    WHEN COALESCE(p.total_paid, 0) = 0 THEN 'pending'
    WHEN COALESCE(p.total_paid, 0) >= COALESCE(d.total_ttc, d.total_ht * 1.2, 0) THEN 'paid'
    ELSE 'partial'
  END
FROM (
  SELECT delivery_id, SUM(amount) AS total_paid
  FROM payments
  WHERE delivery_id IS NOT NULL
  GROUP BY delivery_id
) p
WHERE d.id = p.delivery_id;
