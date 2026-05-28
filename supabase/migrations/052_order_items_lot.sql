-- Migration: Add lot_id to order_items for traceability
-- Date: 2026-03-26
-- Description: Link order items to lots for complete traceability

-- Add lot_id column to order_items table
ALTER TABLE public.order_items
ADD COLUMN IF NOT EXISTS lot_id UUID REFERENCES public.lots(id) ON DELETE SET NULL;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_order_items_lot_id ON public.order_items(lot_id);

-- Also add to delivery_items for delivery traceability
ALTER TABLE public.delivery_items
ADD COLUMN IF NOT EXISTS lot_id UUID REFERENCES public.lots(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_delivery_items_lot_id ON public.delivery_items(lot_id);

-- Comments
COMMENT ON COLUMN public.order_items.lot_id IS 'Reference to lot for traceability';
COMMENT ON COLUMN public.delivery_items.lot_id IS 'Reference to lot for delivery traceability';
