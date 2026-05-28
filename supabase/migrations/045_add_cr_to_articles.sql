-- Migration: Add CR (Coût de Revient) to articles
-- Date: 2025-03-24
-- Description: Add CR (cost price) column to articles table

-- Add the cr column to articles table
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS cr DECIMAL(10, 2) DEFAULT NULL;

COMMENT ON COLUMN public.articles.cr IS 'Coût de Revient (CR) en DH';
