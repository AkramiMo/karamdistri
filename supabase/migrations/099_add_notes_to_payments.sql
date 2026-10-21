-- Migration: Ajouter la colonne notes à la table payments

ALTER TABLE payments ADD COLUMN IF NOT EXISTS notes TEXT;
