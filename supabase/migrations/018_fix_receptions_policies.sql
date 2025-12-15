-- Migration: Fix Receptions and Purchase Orders RLS Policies
-- Date: 2025-01-15
-- Description: Add missing INSERT/UPDATE/DELETE policies for receptions and purchase orders

-- =====================================================
-- 1. Fix receptions table policies
-- =====================================================

-- Create INSERT policy for receptions
DROP POLICY IF EXISTS "Create receptions" ON public.receptions;
CREATE POLICY "Create receptions" ON public.receptions
  FOR INSERT WITH CHECK (has_permission('receptions', 'create'));

-- Create UPDATE policy for receptions
DROP POLICY IF EXISTS "Update receptions" ON public.receptions;
CREATE POLICY "Update receptions" ON public.receptions
  FOR UPDATE USING (has_permission('receptions', 'edit'));

-- Create DELETE policy for receptions
DROP POLICY IF EXISTS "Delete receptions" ON public.receptions;
CREATE POLICY "Delete receptions" ON public.receptions
  FOR DELETE USING (has_permission('receptions', 'delete'));

-- =====================================================
-- 2. Fix purchase_orders table policies
-- =====================================================

-- Create INSERT policy for purchase_orders
DROP POLICY IF EXISTS "Create purchase orders" ON public.purchase_orders;
CREATE POLICY "Create purchase orders" ON public.purchase_orders
  FOR INSERT WITH CHECK (has_permission('achats', 'create'));

-- Create UPDATE policy for purchase_orders
DROP POLICY IF EXISTS "Update purchase orders" ON public.purchase_orders;
CREATE POLICY "Update purchase orders" ON public.purchase_orders
  FOR UPDATE USING (has_permission('achats', 'edit'));

-- Create DELETE policy for purchase_orders
DROP POLICY IF EXISTS "Delete purchase orders" ON public.purchase_orders;
CREATE POLICY "Delete purchase orders" ON public.purchase_orders
  FOR DELETE USING (has_permission('achats', 'delete'));

-- =====================================================
-- 3. Fix suppliers table policies (add write permissions)
-- =====================================================

-- Create INSERT policy for suppliers
DROP POLICY IF EXISTS "Create suppliers" ON public.suppliers;
CREATE POLICY "Create suppliers" ON public.suppliers
  FOR INSERT WITH CHECK (has_permission('fournisseurs', 'create'));

-- Create UPDATE policy for suppliers
DROP POLICY IF EXISTS "Update suppliers" ON public.suppliers;
CREATE POLICY "Update suppliers" ON public.suppliers
  FOR UPDATE USING (has_permission('fournisseurs', 'edit'));

-- Create DELETE policy for suppliers
DROP POLICY IF EXISTS "Delete suppliers" ON public.suppliers;
CREATE POLICY "Delete suppliers" ON public.suppliers
  FOR DELETE USING (has_permission('fournisseurs', 'delete'));

-- =====================================================
-- 4. Grant permissions on tables
-- =====================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.receptions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_orders TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.suppliers TO authenticated;
