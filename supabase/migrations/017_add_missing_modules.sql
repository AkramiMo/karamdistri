-- Migration: Add missing modules (fournitures, receptions)
-- Date: 2025-01-15

-- Add fournitures module if not exists
INSERT INTO public.modules (code, name, icon, path, sort_order, is_active)
SELECT 'fournitures', 'Fournitures', 'Leaf', '/fournitures', 9, true
WHERE NOT EXISTS (SELECT 1 FROM public.modules WHERE code = 'fournitures');

-- Add receptions module if not exists
INSERT INTO public.modules (code, name, icon, path, sort_order, is_active)
SELECT 'receptions', 'Réceptions', 'PackageCheck', '/receptions', 11, true
WHERE NOT EXISTS (SELECT 1 FROM public.modules WHERE code = 'receptions');

-- Update sort_order for better organization
UPDATE public.modules SET sort_order = 8 WHERE code = 'fournisseurs';
UPDATE public.modules SET sort_order = 9 WHERE code = 'fournitures';
UPDATE public.modules SET sort_order = 10 WHERE code = 'achats';
UPDATE public.modules SET sort_order = 11 WHERE code = 'receptions';

-- Grant admin all permissions on new modules
INSERT INTO public.role_permissions (role_id, module_id, can_view, can_create, can_edit, can_delete)
SELECT r.id, m.id, true, true, true, true
FROM public.roles r, public.modules m
WHERE r.name = 'admin'
AND m.code IN ('fournitures', 'receptions')
AND NOT EXISTS (
  SELECT 1 FROM public.role_permissions rp
  WHERE rp.role_id = r.id AND rp.module_id = m.id
);
