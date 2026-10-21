-- Migration: Ajouter le statut de paiement aux réceptions (BR)
-- Description: Ajoute une colonne payment_status pour suivre le statut de paiement des BR

-- Ajouter la colonne payment_status à la table receptions
ALTER TABLE public.receptions
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'non_paye';

-- Ajouter une contrainte de vérification pour les valeurs valides
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'receptions_payment_status_check'
  ) THEN
    ALTER TABLE public.receptions ADD CONSTRAINT receptions_payment_status_check
      CHECK (payment_status IN ('paye', 'non_paye', 'annule'));
  END IF;
END $$;

-- Créer un index pour les requêtes par statut de paiement
CREATE INDEX IF NOT EXISTS idx_receptions_payment_status ON public.receptions(payment_status);

-- Mettre à jour les BR existants avec le statut par défaut
UPDATE public.receptions SET payment_status = 'non_paye' WHERE payment_status IS NULL;
