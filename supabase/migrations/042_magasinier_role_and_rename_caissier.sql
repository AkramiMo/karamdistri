-- Migration: Add Magasinier role and rename Caissier to Standard
-- Date: 2024-03-17

-- 1. Rename 'caissier' role to 'standard'
UPDATE public.roles
SET name = 'standard',
    description = 'Standard - Accès basique à la caisse et aux ventes'
WHERE name = 'caissier';

-- 2. Add new 'magasinier' role (Warehouse Manager)
INSERT INTO public.roles (name, description)
VALUES ('magasinier', 'Magasinier - Gestion des stocks et réceptions')
ON CONFLICT (name) DO NOTHING;

-- 3. Configure permissions for magasinier role
-- Magasinier should have access to: dashboard, stocks, receptions, fournitures, articles
DO $$
DECLARE
    magasinier_role_id UUID;
    module_record RECORD;
BEGIN
    -- Get the magasinier role ID
    SELECT id INTO magasinier_role_id FROM public.roles WHERE name = 'magasinier';

    -- Add permissions for each relevant module
    FOR module_record IN
        SELECT id, code FROM public.modules
        WHERE code IN ('dashboard', 'stocks', 'receptions', 'fournitures', 'articles', 'fournisseurs')
    LOOP
        INSERT INTO public.role_permissions (role_id, module_id, can_view, can_create, can_edit, can_delete)
        VALUES (
            magasinier_role_id,
            module_record.id,
            true,
            CASE WHEN module_record.code IN ('stocks', 'receptions', 'fournitures') THEN true ELSE false END,
            CASE WHEN module_record.code IN ('stocks', 'receptions', 'fournitures') THEN true ELSE false END,
            false
        )
        ON CONFLICT (role_id, module_id)
        DO UPDATE SET
            can_view = EXCLUDED.can_view,
            can_create = EXCLUDED.can_create,
            can_edit = EXCLUDED.can_edit,
            can_delete = EXCLUDED.can_delete;
    END LOOP;
END $$;
