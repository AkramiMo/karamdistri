-- Migration: Add signature_url to company_settings
-- Date: 2026-09-29
-- Description: Add signature image URL for payment receipts

-- Add signature_url column to company_settings
ALTER TABLE public.company_settings
ADD COLUMN IF NOT EXISTS signature_url TEXT;

-- Add comment
COMMENT ON COLUMN public.company_settings.signature_url IS 'URL of the signature/stamp image for payment receipts';
