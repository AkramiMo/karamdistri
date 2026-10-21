-- Migration: Ajouter "cash_deposit" (Versement d'espèces) comme méthode de paiement

-- Supprimer l'ancienne contrainte
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_payment_method_check;

-- Ajouter la nouvelle contrainte avec cash_deposit
ALTER TABLE payments ADD CONSTRAINT payments_payment_method_check
CHECK (payment_method IN ('cash', 'cash_deposit', 'check', 'transfer', 'card', 'credit', 'other'));
