-- Migration: Add purchase-related modules (Fournisseurs, BC, BR)
-- Date: 2025-01-15
-- Description: Add modules for suppliers, purchase orders, and receptions

-- Insert new modules
INSERT INTO public.modules (code, name, icon, path, sort_order, is_active)
VALUES
  ('fournisseurs', 'Fournisseurs', 'Factory', '/fournisseurs', 8, true),
  ('achats', 'Bons de Commande', 'ClipboardList', '/achats', 9, true),
  ('receptions', 'Réceptions', 'PackageCheck', '/receptions', 10, true)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  icon = EXCLUDED.icon,
  path = EXCLUDED.path,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active;

-- Add permissions for admin role
INSERT INTO public.role_permissions (role_id, module_id, can_view, can_create, can_edit, can_delete)
SELECT
  r.id as role_id,
  m.id as module_id,
  true, true, true, true
FROM public.roles r
CROSS JOIN public.modules m
WHERE r.name = 'admin'
AND m.code IN ('fournisseurs', 'achats', 'receptions')
ON CONFLICT (role_id, module_id) DO NOTHING;

-- Add view permissions for commercial role
INSERT INTO public.role_permissions (role_id, module_id, can_view, can_create, can_edit, can_delete)
SELECT
  r.id as role_id,
  m.id as module_id,
  true, false, false, false
FROM public.roles r
CROSS JOIN public.modules m
WHERE r.name = 'commercial'
AND m.code IN ('fournisseurs', 'achats', 'receptions')
ON CONFLICT (role_id, module_id) DO NOTHING;
