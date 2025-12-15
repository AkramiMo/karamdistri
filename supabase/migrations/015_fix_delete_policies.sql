-- Migration: Fix DELETE policies (safe version)
-- Date: 2025-01-15
-- Description: Drop and recreate DELETE policies to ensure they work

-- Drop existing DELETE policies first (if they exist)
DROP POLICY IF EXISTS "Delete sales" ON public.sales;
DROP POLICY IF EXISTS "Delete cash register" ON public.cash_register;
DROP POLICY IF EXISTS "Delete stock" ON public.stock;
DROP POLICY IF EXISTS "Delete stock movements" ON public.stock_movements;
DROP POLICY IF EXISTS "Delete purchase orders" ON public.purchase_orders;
DROP POLICY IF EXISTS "Delete receptions" ON public.receptions;
DROP POLICY IF EXISTS "Delete deliveries" ON public.deliveries;
DROP POLICY IF EXISTS "Delete delivery items" ON public.delivery_items;
DROP POLICY IF EXISTS "Delete orders" ON public.orders;
DROP POLICY IF EXISTS "Delete order items" ON public.order_items;

-- Recreate DELETE policies
CREATE POLICY "Delete sales" ON public.sales
  FOR DELETE USING (has_permission('ventes', 'delete'));

CREATE POLICY "Delete cash register" ON public.cash_register
  FOR DELETE USING (has_permission('caisse', 'delete'));

CREATE POLICY "Delete stock" ON public.stock
  FOR DELETE USING (has_permission('stocks', 'delete'));

CREATE POLICY "Delete stock movements" ON public.stock_movements
  FOR DELETE USING (has_permission('stocks', 'delete'));

CREATE POLICY "Delete purchase orders" ON public.purchase_orders
  FOR DELETE USING (has_permission('achats', 'delete'));

CREATE POLICY "Delete receptions" ON public.receptions
  FOR DELETE USING (has_permission('receptions', 'delete'));

CREATE POLICY "Delete deliveries" ON public.deliveries
  FOR DELETE USING (has_permission('livraisons', 'delete'));

CREATE POLICY "Delete delivery items" ON public.delivery_items
  FOR DELETE USING (has_permission('livraisons', 'delete'));

CREATE POLICY "Delete orders" ON public.orders
  FOR DELETE USING (has_permission('commandes', 'delete'));

CREATE POLICY "Delete order items" ON public.order_items
  FOR DELETE USING (has_permission('commandes', 'delete'));
