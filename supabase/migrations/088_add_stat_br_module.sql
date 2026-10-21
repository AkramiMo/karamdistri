-- Add stat-br module for reception statistics
INSERT INTO modules (code, name, icon, path, sort_order, is_active)
VALUES ('stat-br', 'Stat-BR', 'BarChart3', '/stat-br', 6, true)
ON CONFLICT (code) DO NOTHING;

-- Add permissions for admin role
INSERT INTO role_permissions (role_id, module_id, can_view, can_create, can_edit, can_delete)
SELECT r.id, m.id, true, true, true, true
FROM roles r, modules m
WHERE r.name = 'admin' AND m.code = 'stat-br'
ON CONFLICT (role_id, module_id) DO NOTHING;

-- Add view permission for other roles that have access to receptions
INSERT INTO role_permissions (role_id, module_id, can_view, can_create, can_edit, can_delete)
SELECT rp.role_id, m.id, true, false, false, false
FROM role_permissions rp
JOIN modules receptions_mod ON rp.module_id = receptions_mod.id AND receptions_mod.code = 'receptions'
JOIN modules m ON m.code = 'stat-br'
WHERE rp.can_view = true
ON CONFLICT (role_id, module_id) DO NOTHING;
