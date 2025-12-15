-- Migration: Fix RLS Issues
-- Date: 2025-01-15
-- Description: Enable RLS on tables and fix security issues

-- =====================================================
-- 1. Enable RLS on packagings table
-- =====================================================
ALTER TABLE public.packagings ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 2. Enable RLS on purchase_order_items table
-- =====================================================
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for purchase_order_items
DROP POLICY IF EXISTS "View purchase order items" ON public.purchase_order_items;
CREATE POLICY "View purchase order items" ON public.purchase_order_items
  FOR SELECT USING (has_permission('achats', 'view'));

DROP POLICY IF EXISTS "Create purchase order items" ON public.purchase_order_items;
CREATE POLICY "Create purchase order items" ON public.purchase_order_items
  FOR INSERT WITH CHECK (has_permission('achats', 'create'));

DROP POLICY IF EXISTS "Update purchase order items" ON public.purchase_order_items;
CREATE POLICY "Update purchase order items" ON public.purchase_order_items
  FOR UPDATE USING (has_permission('achats', 'edit'));

DROP POLICY IF EXISTS "Delete purchase order items" ON public.purchase_order_items;
CREATE POLICY "Delete purchase order items" ON public.purchase_order_items
  FOR DELETE USING (has_permission('achats', 'delete'));

-- =====================================================
-- 3. Enable RLS on reception_items table
-- =====================================================
ALTER TABLE public.reception_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for reception_items
DROP POLICY IF EXISTS "View reception items" ON public.reception_items;
CREATE POLICY "View reception items" ON public.reception_items
  FOR SELECT USING (has_permission('receptions', 'view'));

DROP POLICY IF EXISTS "Create reception items" ON public.reception_items;
CREATE POLICY "Create reception items" ON public.reception_items
  FOR INSERT WITH CHECK (has_permission('receptions', 'create'));

DROP POLICY IF EXISTS "Update reception items" ON public.reception_items;
CREATE POLICY "Update reception items" ON public.reception_items
  FOR UPDATE USING (has_permission('receptions', 'edit'));

DROP POLICY IF EXISTS "Delete reception items" ON public.reception_items;
CREATE POLICY "Delete reception items" ON public.reception_items
  FOR DELETE USING (has_permission('receptions', 'delete'));

-- =====================================================
-- 4. Fix function search_path issues
-- =====================================================

-- Fix has_permission function
CREATE OR REPLACE FUNCTION public.has_permission(
  p_module_code TEXT,
  p_permission TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_role_id UUID;
  v_has_perm BOOLEAN;
BEGIN
  SELECT role_id INTO v_role_id
  FROM public.users
  WHERE id = auth.uid();

  IF EXISTS (SELECT 1 FROM public.roles WHERE id = v_role_id AND name = 'admin') THEN
    RETURN TRUE;
  END IF;

  SELECT
    CASE p_permission
      WHEN 'view' THEN can_view
      WHEN 'create' THEN can_create
      WHEN 'edit' THEN can_edit
      WHEN 'delete' THEN can_delete
    END INTO v_has_perm
  FROM public.role_permissions rp
  JOIN public.modules m ON m.id = rp.module_id
  WHERE rp.role_id = v_role_id AND m.code = p_module_code;

  RETURN COALESCE(v_has_perm, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- Fix handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  default_role_id UUID;
BEGIN
  SELECT id INTO default_role_id FROM public.roles WHERE name = 'user' LIMIT 1;

  INSERT INTO public.users (id, email, full_name, role_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    default_role_id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- Fix handle_updated_at function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- Fix generate_sequence_number function (if exists)
CREATE OR REPLACE FUNCTION public.generate_sequence_number(p_prefix TEXT, p_table TEXT)
RETURNS TEXT AS $$
DECLARE
  v_year TEXT;
  v_count INT;
  v_number TEXT;
BEGIN
  v_year := TO_CHAR(CURRENT_DATE, 'YYYY');

  EXECUTE format('SELECT COUNT(*) + 1 FROM public.%I WHERE created_at >= DATE_TRUNC(''year'', CURRENT_DATE)', p_table)
  INTO v_count;

  v_number := p_prefix || '-' || v_year || '-' || LPAD(v_count::TEXT, 4, '0');

  RETURN v_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- Fix get_client_article_price function (if exists)
CREATE OR REPLACE FUNCTION public.get_client_article_price(
  p_client_id UUID,
  p_article_id UUID
)
RETURNS DECIMAL AS $$
DECLARE
  v_custom_price DECIMAL;
  v_default_price DECIMAL;
BEGIN
  SELECT custom_price INTO v_custom_price
  FROM public.client_prices
  WHERE client_id = p_client_id AND article_id = p_article_id;

  IF v_custom_price IS NOT NULL THEN
    RETURN v_custom_price;
  END IF;

  SELECT price_ht INTO v_default_price
  FROM public.articles
  WHERE id = p_article_id;

  RETURN COALESCE(v_default_price, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- =====================================================
-- 5. Grant necessary permissions
-- =====================================================
GRANT SELECT ON public.packagings TO anon, authenticated;
GRANT ALL ON public.packagings TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_order_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reception_items TO authenticated;
