-- Migration: Add in_delivery status to deliveries and orders
-- Date: 2025-02-27
-- Description: Add "in_delivery" status to allow tracking when items are currently being delivered

-- Drop the existing constraint on deliveries
ALTER TABLE public.deliveries DROP CONSTRAINT IF EXISTS deliveries_status_check;

-- Add new constraint with in_delivery status
ALTER TABLE public.deliveries ADD CONSTRAINT deliveries_status_check
  CHECK (status IN ('pending', 'in_progress', 'in_delivery', 'delivered', 'partial', 'returned', 'cancelled'));

-- Drop the existing constraint on orders
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;

-- Add new constraint with in_delivery status and pending
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pending', 'draft', 'confirmed', 'in_preparation', 'ready', 'in_progress', 'in_delivery', 'delivered', 'partial', 'returned', 'cancelled', 'out_of_stock'));

-- Add comments for clarity
COMMENT ON COLUMN public.deliveries.status IS 'Delivery status: pending, in_progress, in_delivery (currently being delivered), delivered, partial, returned, cancelled';
COMMENT ON COLUMN public.orders.status IS 'Order status: draft, confirmed, in_preparation, ready, in_progress, in_delivery, delivered, partial, returned, cancelled, out_of_stock';
