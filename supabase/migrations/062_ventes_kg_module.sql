-- Ajouter le module Ventes en Kg
INSERT INTO modules (code, name, icon, path, is_active, sort_order)
VALUES ('ventes-kg', 'Ventes en Kg', 'Package', '/ventes-kg', true, 12)
ON CONFLICT (code) DO NOTHING;

-- Donner acces au module ventes-kg pour le role admin
INSERT INTO role_permissions (role_id, module_id, can_view, can_create, can_edit, can_delete)
SELECT
  r.id,
  m.id,
  true,
  true,
  true,
  true
FROM roles r, modules m
WHERE r.name = 'admin' AND m.code = 'ventes-kg'
ON CONFLICT (role_id, module_id) DO NOTHING;
