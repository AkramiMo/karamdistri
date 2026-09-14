-- Migration: Add mb_warning to sales
-- Description: Add mb_warning flag to indicate when margin calculation is incomplete due to missing CR values

-- Add the mb_warning column to sales table
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS mb_warning BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN public.sales.mb_warning IS 'True if MB calculation is incomplete (missing CR on some articles)';
