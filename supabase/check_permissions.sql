-- Check if 'receptions' module exists
SELECT * FROM public.modules WHERE code = 'receptions';

-- Check if admin role has permissions on receptions module
SELECT
  r.name as role_name,
  m.code as module_code,
  rp.can_view,
  rp.can_create,
  rp.can_edit,
  rp.can_delete
FROM public.role_permissions rp
JOIN public.roles r ON r.id = rp.role_id
JOIN public.modules m ON m.id = rp.module_id
WHERE m.code = 'receptions';

-- Check current user's role and permissions
SELECT
  u.email,
  u.full_name,
  r.name as role_name
FROM public.users u
LEFT JOIN public.roles r ON r.id = u.role_id
WHERE u.id = auth.uid();

-- Test has_permission function directly
SELECT has_permission('receptions', 'view') as can_view_receptions;

-- List all RLS policies on receptions table
SELECT
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'receptions';

-- If module doesn't exist or permissions missing, run this:
/*
-- Add receptions module
INSERT INTO public.modules (code, name, icon, path, sort_order, is_active)
SELECT 'receptions', 'Réceptions', 'PackageCheck', '/receptions', 11, true
WHERE NOT EXISTS (SELECT 1 FROM public.modules WHERE code = 'receptions');

-- Grant admin all permissions on receptions module
INSERT INTO public.role_permissions (role_id, module_id, can_view, can_create, can_edit, can_delete)
SELECT r.id, m.id, true, true, true, true
FROM public.roles r, public.modules m
WHERE r.name = 'admin'
AND m.code = 'receptions'
AND NOT EXISTS (
  SELECT 1 FROM public.role_permissions rp
  WHERE rp.role_id = r.id AND rp.module_id = m.id
);
*/
