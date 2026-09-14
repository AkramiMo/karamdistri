-- Migration: Create facture_deliveries table to support multiple BL per facture
-- This table links factures to multiple deliveries

-- Create the junction table
CREATE TABLE IF NOT EXISTS facture_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    facture_id UUID NOT NULL REFERENCES factures(id) ON DELETE CASCADE,
    delivery_id UUID NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(facture_id, delivery_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_facture_deliveries_facture_id ON facture_deliveries(facture_id);
CREATE INDEX IF NOT EXISTS idx_facture_deliveries_delivery_id ON facture_deliveries(delivery_id);

-- Migrate existing data: copy delivery_id from factures to facture_deliveries
INSERT INTO facture_deliveries (facture_id, delivery_id)
SELECT id, delivery_id
FROM factures
WHERE delivery_id IS NOT NULL
ON CONFLICT (facture_id, delivery_id) DO NOTHING;

-- Add comment
COMMENT ON TABLE facture_deliveries IS 'Junction table linking factures to multiple deliveries (BL)';
