-- Migration: Add supplier_quote_ref to supplier_quote_responses
-- Date: 2026-03-06
-- Description: Add reference field for supplier's own quote number

ALTER TABLE public.supplier_quote_responses
ADD COLUMN IF NOT EXISTS supplier_quote_ref TEXT;

COMMENT ON COLUMN public.supplier_quote_responses.supplier_quote_ref IS 'Reference number from the supplier''s quote document';
