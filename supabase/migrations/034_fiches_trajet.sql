-- Fiche de Trajet (FT) table
CREATE TABLE IF NOT EXISTS fiches_trajet (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ft_number TEXT UNIQUE NOT NULL,
  ft_date DATE NOT NULL DEFAULT CURRENT_DATE,
  round_id UUID REFERENCES delivery_rounds(id) ON DELETE SET NULL,
  driver_id UUID REFERENCES users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_fiches_trajet_ft_number ON fiches_trajet(ft_number);
CREATE INDEX IF NOT EXISTS idx_fiches_trajet_round_id ON fiches_trajet(round_id);
CREATE INDEX IF NOT EXISTS idx_fiches_trajet_driver_id ON fiches_trajet(driver_id);
CREATE INDEX IF NOT EXISTS idx_fiches_trajet_ft_date ON fiches_trajet(ft_date);

-- Enable RLS
ALTER TABLE fiches_trajet ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow authenticated users to view fiches_trajet"
  ON fiches_trajet FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert fiches_trajet"
  ON fiches_trajet FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update fiches_trajet"
  ON fiches_trajet FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete fiches_trajet"
  ON fiches_trajet FOR DELETE
  TO authenticated
  USING (true);

-- Add module for permissions
INSERT INTO modules (code, name, icon, path, sort_order, is_active)
VALUES ('fiches-trajet', 'Fiche de Trajet', 'FileText', '/fiches-trajet', 45, true)
ON CONFLICT (code) DO NOTHING;

-- Add permissions for admin role (if exists)
INSERT INTO role_permissions (role_id, module_id, can_view, can_create, can_edit, can_delete)
SELECT r.id, m.id, true, true, true, true
FROM roles r, modules m
WHERE r.name = 'admin' AND m.code = 'fiches-trajet'
ON CONFLICT DO NOTHING;
