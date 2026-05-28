-- Migration: Stock lot traceability
-- Date: 2026-03-26
-- Description: Add lot_id to stock table for article traceability by lot

-- Add lot_id column to stock table
ALTER TABLE public.stock
ADD COLUMN IF NOT EXISTS lot_id UUID REFERENCES public.lots(id) ON DELETE SET NULL;

-- Drop the old unique constraint (article_id, warehouse)
ALTER TABLE public.stock
DROP CONSTRAINT IF EXISTS stock_article_id_warehouse_key;

-- Create new unique constraint including lot_id
-- This allows: same article in same warehouse but from different lots
ALTER TABLE public.stock
ADD CONSTRAINT stock_article_warehouse_lot_key UNIQUE (article_id, warehouse, lot_id);

-- Add lot_id to stock_movements for movement tracking
ALTER TABLE public.stock_movements
ADD COLUMN IF NOT EXISTS lot_id UUID REFERENCES public.lots(id) ON DELETE SET NULL;

-- Create index for faster lot-based queries
CREATE INDEX IF NOT EXISTS idx_stock_lot_id ON public.stock(lot_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_lot_id ON public.stock_movements(lot_id);

-- Add comments
COMMENT ON COLUMN public.stock.lot_id IS 'Reference to the lot for traceability';
COMMENT ON COLUMN public.stock_movements.lot_id IS 'Reference to the lot for movement traceability';
