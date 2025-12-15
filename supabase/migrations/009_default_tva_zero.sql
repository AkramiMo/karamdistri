-- Migration: Set default TVA to 0%
-- Date: 2025-01-15
-- Description: Change default TVA rate from 20% to 0% for articles

-- Alter the default value for tva_rate column
ALTER TABLE public.articles ALTER COLUMN tva_rate SET DEFAULT 0.00;

COMMENT ON COLUMN public.articles.tva_rate IS 'TVA rate in percentage (default 0%)';
