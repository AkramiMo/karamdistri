-- ============================================
-- Add round_id to delivery_returns for BLT link
-- ============================================

-- Add round_id column to link RBLT directly to a BLT
ALTER TABLE public.delivery_returns
  ADD COLUMN IF NOT EXISTS round_id UUID REFERENCES public.delivery_rounds(id) ON DELETE SET NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_delivery_returns_round_id ON public.delivery_returns(round_id);
