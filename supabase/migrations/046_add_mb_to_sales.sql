-- Migration: Add MB (Marge Bénéficiaire) to sales
-- Date: 2025-03-24
-- Description: Add MB (profit margin) column to sales table
-- MB = sum(Prix HT - CR) for all articles sold in this sale

-- Add the mb column to sales table
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS mb DECIMAL(10, 2) DEFAULT NULL;

COMMENT ON COLUMN public.sales.mb IS 'Marge Bénéficiaire (MB) en DH - calculée après validation de la vente';
