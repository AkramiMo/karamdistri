-- Migration: Create factures table
-- Description: Table for managing invoices linked to clients and deliveries

-- Create factures table
CREATE TABLE IF NOT EXISTS factures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    facture_number TEXT UNIQUE NOT NULL,
    facture_date DATE DEFAULT CURRENT_DATE,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
    delivery_id UUID REFERENCES deliveries(id) ON DELETE SET NULL,
    total_ht DECIMAL(12,2) DEFAULT 0,
    total_tva DECIMAL(12,2) DEFAULT 0,
    total_ttc DECIMAL(12,2) DEFAULT 0,
    due_date DATE,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'partial', 'overdue', 'cancelled')),
    notes TEXT,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_factures_client_id ON factures(client_id);
CREATE INDEX idx_factures_delivery_id ON factures(delivery_id);
CREATE INDEX idx_factures_facture_date ON factures(facture_date);
CREATE INDEX idx_factures_due_date ON factures(due_date);
CREATE INDEX idx_factures_status ON factures(status);

-- Trigger for updated_at
CREATE TRIGGER set_factures_updated_at
    BEFORE UPDATE ON factures
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

-- Enable RLS
ALTER TABLE factures ENABLE ROW LEVEL SECURITY;

-- RLS Policy: authenticated users have full access
CREATE POLICY "Authenticated users can manage factures"
    ON factures
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Register the factures module
INSERT INTO modules (code, name, icon, path, sort_order, is_active)
VALUES ('factures', 'Factures', 'FileText', '/factures', 5.2, true)
ON CONFLICT (code) DO NOTHING;

-- Grant permissions to admin and commercial roles
DO $$
DECLARE
    v_module_id UUID;
    v_admin_role_id UUID;
    v_commercial_role_id UUID;
BEGIN
    SELECT id INTO v_module_id FROM modules WHERE code = 'factures';
    SELECT id INTO v_admin_role_id FROM roles WHERE name = 'admin';
    SELECT id INTO v_commercial_role_id FROM roles WHERE name = 'commercial';

    IF v_module_id IS NOT NULL AND v_admin_role_id IS NOT NULL THEN
        INSERT INTO role_permissions (role_id, module_id, can_view, can_create, can_edit, can_delete)
        VALUES (v_admin_role_id, v_module_id, true, true, true, true)
        ON CONFLICT DO NOTHING;
    END IF;

    IF v_module_id IS NOT NULL AND v_commercial_role_id IS NOT NULL THEN
        INSERT INTO role_permissions (role_id, module_id, can_view, can_create, can_edit, can_delete)
        VALUES (v_commercial_role_id, v_module_id, true, true, true, false)
        ON CONFLICT DO NOTHING;
    END IF;
END $$;
