-- Ajouter le module Historique VAL
INSERT INTO modules (code, name, icon, path, is_active, sort_order)
VALUES (
  'historique-val',
  'Historique VAL',
  'History',
  '/historique-val',
  true,
  23
)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  icon = EXCLUDED.icon,
  path = EXCLUDED.path,
  is_active = EXCLUDED.is_active,
  sort_order = EXCLUDED.sort_order;

-- Donner accès à tous les rôles admin
INSERT INTO role_permissions (role_id, module_id, can_view, can_create, can_edit, can_delete)
SELECT
  r.id,
  m.id,
  true,
  true,
  true,
  true
FROM roles r
CROSS JOIN modules m
WHERE r.name = 'admin'
  AND m.code = 'historique-val'
ON CONFLICT (role_id, module_id) DO UPDATE SET
  can_view = true,
  can_create = true,
  can_edit = true,
  can_delete = true;
