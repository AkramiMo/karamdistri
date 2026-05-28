-- Migration: Fix commercial role permissions for clients module
-- Date: 2024-03-17
-- Issue: Commercial role cannot access clients

-- Ensure commercial role has permissions for clients module
DO $$
DECLARE
    commercial_role_id UUID;
    clients_module_id UUID;
BEGIN
    -- Get the commercial role ID
    SELECT id INTO commercial_role_id FROM public.roles WHERE name = 'commercial';

    -- Get the clients module ID
    SELECT id INTO clients_module_id FROM public.modules WHERE code = 'clients';

    -- Log for debugging
    RAISE NOTICE 'Commercial role ID: %', commercial_role_id;
    RAISE NOTICE 'Clients module ID: %', clients_module_id;

    IF commercial_role_id IS NULL THEN
        RAISE EXCEPTION 'Commercial role not found';
    END IF;

    IF clients_module_id IS NULL THEN
        RAISE EXCEPTION 'Clients module not found';
    END IF;

    -- Insert or update permissions for commercial -> clients
    INSERT INTO public.role_permissions (role_id, module_id, can_view, can_create, can_edit, can_delete)
    VALUES (commercial_role_id, clients_module_id, true, true, true, false)
    ON CONFLICT (role_id, module_id)
    DO UPDATE SET
        can_view = true,
        can_create = true,
        can_edit = true,
        can_delete = false;

    RAISE NOTICE 'Commercial role permissions for clients updated successfully';
END $$;

-- Also ensure permissions for other necessary modules for commercial role
INSERT INTO public.role_permissions (role_id, module_id, can_view, can_create, can_edit, can_delete)
SELECT r.id, m.id, true, true, true, false
FROM public.roles r
CROSS JOIN public.modules m
WHERE r.name = 'commercial'
  AND m.code IN ('dashboard', 'clients', 'articles', 'commandes', 'ventes', 'livraisons')
ON CONFLICT (role_id, module_id)
DO UPDATE SET
    can_view = true,
    can_create = true,
    can_edit = true,
    can_delete = false;
