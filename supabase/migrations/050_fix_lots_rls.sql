-- Migration: Fix Lots RLS policies
-- Date: 2026-03-26
-- Description: Update RLS policies to use 'lots' module permissions and add permissions for all roles

-- Drop existing policies
DROP POLICY IF EXISTS "View lots" ON public.lots;
DROP POLICY IF EXISTS "Create lots" ON public.lots;
DROP POLICY IF EXISTS "Update lots" ON public.lots;
DROP POLICY IF EXISTS "Delete lots" ON public.lots;

-- Create new policies using 'lots' module OR 'achats' module permissions
CREATE POLICY "View lots" ON public.lots
  FOR SELECT USING (has_permission('lots', 'view') OR has_permission('achats', 'view'));

CREATE POLICY "Create lots" ON public.lots
  FOR INSERT WITH CHECK (has_permission('lots', 'create') OR has_permission('achats', 'create'));

CREATE POLICY "Update lots" ON public.lots
  FOR UPDATE USING (has_permission('lots', 'edit') OR has_permission('achats', 'edit'));

CREATE POLICY "Delete lots" ON public.lots
  FOR DELETE USING (has_permission('lots', 'delete') OR has_permission('achats', 'delete'));

-- Add permissions for commercial role
INSERT INTO public.role_permissions (role_id, module_id, can_view, can_create, can_edit, can_delete)
SELECT
  r.id as role_id,
  m.id as module_id,
  true, true, true, false
FROM public.roles r
CROSS JOIN public.modules m
WHERE r.name = 'commercial'
AND m.code = 'lots'
ON CONFLICT (role_id, module_id) DO UPDATE SET
  can_view = true,
  can_create = true,
  can_edit = true;

-- Add view permissions for magasinier role (if exists)
INSERT INTO public.role_permissions (role_id, module_id, can_view, can_create, can_edit, can_delete)
SELECT
  r.id as role_id,
  m.id as module_id,
  true, true, true, false
FROM public.roles r
CROSS JOIN public.modules m
WHERE r.name = 'magasinier'
AND m.code = 'lots'
ON CONFLICT (role_id, module_id) DO UPDATE SET
  can_view = true,
  can_create = true,
  can_edit = true;
