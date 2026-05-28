-- Ajouter le module Graphiques
INSERT INTO modules (code, name, icon, path, is_active, sort_order)
VALUES ('graphiques', 'Graphiques', 'BarChart3', '/graphiques', true, 22)
ON CONFLICT (code) DO NOTHING;

-- Donner accès au module graphiques pour le rôle admin
INSERT INTO role_permissions (role_id, module_id, can_view, can_create, can_edit, can_delete)
SELECT
  r.id,
  m.id,
  true,
  true,
  true,
  true
FROM roles r, modules m
WHERE r.name = 'admin' AND m.code = 'graphiques'
ON CONFLICT (role_id, module_id) DO NOTHING;
