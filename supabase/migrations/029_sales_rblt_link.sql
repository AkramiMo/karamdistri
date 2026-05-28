-- Migration: Link sales to delivery_returns (RBLT)
-- Description: Add return_id FK to sales and make client_id nullable for RBLT-generated sales

-- 1. Make client_id nullable (RBLT sales cover multiple clients → "--")
ALTER TABLE public.sales ALTER COLUMN client_id DROP NOT NULL;

-- 2. Add return_id FK to link sale to RBLT
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS return_id UUID REFERENCES public.delivery_returns(id) ON DELETE SET NULL;

-- 3. Add rblt_number text field for quick display without join
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS rblt_number TEXT;
