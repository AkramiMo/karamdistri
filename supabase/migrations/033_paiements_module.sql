-- Migration: Register paiements module
-- Description: Page listing all payment receipts (BL + Factures)

INSERT INTO modules (code, name, icon, path, sort_order, is_active)
VALUES ('paiements', 'Paiements', 'Wallet', '/paiements', 5.4, true)
ON CONFLICT (code) DO NOTHING;

-- Grant permissions to admin and commercial roles
DO $$
DECLARE
    v_module_id UUID;
    v_admin_role_id UUID;
    v_commercial_role_id UUID;
BEGIN
    SELECT id INTO v_module_id FROM modules WHERE code = 'paiements';
    SELECT id INTO v_admin_role_id FROM roles WHERE name = 'admin';
    SELECT id INTO v_commercial_role_id FROM roles WHERE name = 'commercial';

    IF v_module_id IS NOT NULL AND v_admin_role_id IS NOT NULL THEN
        INSERT INTO role_permissions (role_id, module_id, can_view, can_create, can_edit, can_delete)
        VALUES (v_admin_role_id, v_module_id, true, true, true, true)
        ON CONFLICT DO NOTHING;
    END IF;

    IF v_module_id IS NOT NULL AND v_commercial_role_id IS NOT NULL THEN
        INSERT INTO role_permissions (role_id, module_id, can_view, can_create, can_edit, can_delete)
        VALUES (v_commercial_role_id, v_module_id, true, true, false, false)
        ON CONFLICT DO NOTHING;
    END IF;
END $$;
