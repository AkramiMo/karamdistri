-- Migration: Add dette module and trigger to mark BL as paid when facture is paid
-- Description: Adds the dette module for client debt tracking and creates a trigger
-- to automatically mark all BL (deliveries) linked to a facture as paid when the facture is paid

-- 1. Add dette module
INSERT INTO modules (code, name, icon, path, sort_order, is_active)
VALUES ('dette', 'Dette Clients', 'CreditCard', '/clients/dette', 20.5, true)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  icon = EXCLUDED.icon,
  path = EXCLUDED.path,
  is_active = EXCLUDED.is_active;

-- 2. Grant permissions to admin role
DO $$
DECLARE
    v_module_id UUID;
    v_admin_role_id UUID;
    v_commercial_role_id UUID;
BEGIN
    SELECT id INTO v_module_id FROM modules WHERE code = 'dette';
    SELECT id INTO v_admin_role_id FROM roles WHERE name = 'admin';
    SELECT id INTO v_commercial_role_id FROM roles WHERE name = 'commercial';

    IF v_module_id IS NOT NULL AND v_admin_role_id IS NOT NULL THEN
        INSERT INTO role_permissions (role_id, module_id, can_view, can_create, can_edit, can_delete)
        VALUES (v_admin_role_id, v_module_id, true, true, true, true)
        ON CONFLICT (role_id, module_id) DO UPDATE SET
          can_view = true,
          can_create = true,
          can_edit = true,
          can_delete = true;
    END IF;

    IF v_module_id IS NOT NULL AND v_commercial_role_id IS NOT NULL THEN
        INSERT INTO role_permissions (role_id, module_id, can_view, can_create, can_edit, can_delete)
        VALUES (v_commercial_role_id, v_module_id, true, false, false, false)
        ON CONFLICT (role_id, module_id) DO UPDATE SET
          can_view = true;
    END IF;
END $$;

-- 3. Create or replace function to mark BL as paid when facture is paid
CREATE OR REPLACE FUNCTION mark_bl_paid_when_facture_paid()
RETURNS TRIGGER AS $$
BEGIN
    -- Only trigger when status changes to 'paid'
    IF NEW.status = 'paid' AND (OLD.status IS NULL OR OLD.status != 'paid') THEN
        -- Update all deliveries linked to this facture via facture_deliveries
        UPDATE deliveries
        SET payment_status = 'paid'
        WHERE id IN (
            SELECT delivery_id
            FROM facture_deliveries
            WHERE facture_id = NEW.id
        );

        -- Also update the legacy delivery_id field if it exists
        IF NEW.delivery_id IS NOT NULL THEN
            UPDATE deliveries
            SET payment_status = 'paid'
            WHERE id = NEW.delivery_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Create trigger on factures table
DROP TRIGGER IF EXISTS trigger_mark_bl_paid_on_facture_paid ON factures;

CREATE TRIGGER trigger_mark_bl_paid_on_facture_paid
    AFTER UPDATE OF status ON factures
    FOR EACH ROW
    EXECUTE FUNCTION mark_bl_paid_when_facture_paid();

-- Also trigger on INSERT in case a facture is created directly with status 'paid'
DROP TRIGGER IF EXISTS trigger_mark_bl_paid_on_facture_insert ON factures;

CREATE TRIGGER trigger_mark_bl_paid_on_facture_insert
    AFTER INSERT ON factures
    FOR EACH ROW
    WHEN (NEW.status = 'paid')
    EXECUTE FUNCTION mark_bl_paid_when_facture_paid();

-- 5. Add comment for documentation
COMMENT ON FUNCTION mark_bl_paid_when_facture_paid() IS
'Automatically marks all deliveries (BL) linked to a facture as paid when the facture status changes to paid';

-- Summary
SELECT 'Migration completed: dette module added and BL payment trigger created' as status;
