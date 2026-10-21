-- Table pour stocker les emballages associés aux devis (DDC)
CREATE TABLE IF NOT EXISTS ddc_emballages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ddc_id UUID NOT NULL REFERENCES client_quote_requests(id) ON DELETE CASCADE,
  emballage_id UUID REFERENCES emballages(id) ON DELETE SET NULL,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_ddc_emballages_ddc_id ON ddc_emballages(ddc_id);

-- RLS
ALTER TABLE ddc_emballages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access for authenticated users" ON ddc_emballages
  FOR ALL USING (true) WITH CHECK (true);
