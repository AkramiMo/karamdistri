-- Migration: Add missing DELETE policies for sales and other tables
-- Date: 2025-01-15
-- Description: Fix missing DELETE RLS policies that prevent deletion

-- Add DELETE policy for sales
CREATE POLICY IF NOT EXISTS "Delete sales" ON public.sales
  FOR DELETE USING (has_permission('ventes', 'delete'));

-- Add DELETE policy for cash_register (if missing)
CREATE POLICY IF NOT EXISTS "Delete cash register" ON public.cash_register
  FOR DELETE USING (has_permission('caisse', 'delete'));

-- Add DELETE policy for stock (if missing)
CREATE POLICY IF NOT EXISTS "Delete stock" ON public.stock
  FOR DELETE USING (has_permission('stocks', 'delete'));

-- Add DELETE policy for stock_movements (if missing)
CREATE POLICY IF NOT EXISTS "Delete stock movements" ON public.stock_movements
  FOR DELETE USING (has_permission('stocks', 'delete'));

-- Add DELETE policy for purchase_orders (if missing)
CREATE POLICY IF NOT EXISTS "Delete purchase orders" ON public.purchase_orders
  FOR DELETE USING (has_permission('achats', 'delete'));

-- Add DELETE policy for receptions (if missing)
CREATE POLICY IF NOT EXISTS "Delete receptions" ON public.receptions
  FOR DELETE USING (has_permission('receptions', 'delete'));

-- Note: To apply these policies immediately in Supabase dashboard, run:
-- DROP POLICY IF EXISTS "Delete sales" ON public.sales;
-- CREATE POLICY "Delete sales" ON public.sales FOR DELETE USING (has_permission('ventes', 'delete'));
