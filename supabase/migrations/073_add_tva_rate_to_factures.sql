-- Migration: Add tva_rate column to factures table
-- Allows custom TVA rate per invoice instead of hardcoded 20%

ALTER TABLE factures ADD COLUMN IF NOT EXISTS tva_rate DECIMAL(5,2) DEFAULT 20.00;

-- Update existing factures to use 20% (the previous hardcoded value)
UPDATE factures SET tva_rate = 20.00 WHERE tva_rate IS NULL;

COMMENT ON COLUMN factures.tva_rate IS 'Taux de TVA en pourcentage (ex: 20.00 pour 20%)';
