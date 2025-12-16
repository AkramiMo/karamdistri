-- Migration: Add supply stock tables and depot coordinates
-- Date: 2024-01-01

-- Create supply_stock table for internal supplies inventory
CREATE TABLE IF NOT EXISTS supply_stock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supply_id UUID NOT NULL REFERENCES supplies(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 0,
  warehouse TEXT DEFAULT 'principal',
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(supply_id, warehouse)
);

-- Create supply_stock_movements table for tracking supply movements
CREATE TABLE IF NOT EXISTS supply_stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supply_id UUID NOT NULL REFERENCES supplies(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('in', 'out', 'adjustment')),
  reference_type TEXT,
  reference_id UUID,
  notes TEXT,
  user_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add depot coordinates to company_settings table
ALTER TABLE company_settings
ADD COLUMN IF NOT EXISTS depot_lat DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS depot_lng DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS depot_address TEXT;

-- Add min_stock column to supplies if not exists
ALTER TABLE supplies
ADD COLUMN IF NOT EXISTS min_stock INTEGER DEFAULT 0;

-- Enable RLS on new tables
ALTER TABLE supply_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE supply_stock_movements ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for supply_stock
CREATE POLICY "Users can view supply_stock" ON supply_stock
  FOR SELECT USING (true);

CREATE POLICY "Users can insert supply_stock" ON supply_stock
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update supply_stock" ON supply_stock
  FOR UPDATE USING (true);

CREATE POLICY "Users can delete supply_stock" ON supply_stock
  FOR DELETE USING (true);

-- Create RLS policies for supply_stock_movements
CREATE POLICY "Users can view supply_stock_movements" ON supply_stock_movements
  FOR SELECT USING (true);

CREATE POLICY "Users can insert supply_stock_movements" ON supply_stock_movements
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update supply_stock_movements" ON supply_stock_movements
  FOR UPDATE USING (true);

CREATE POLICY "Users can delete supply_stock_movements" ON supply_stock_movements
  FOR DELETE USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_supply_stock_supply_id ON supply_stock(supply_id);
CREATE INDEX IF NOT EXISTS idx_supply_stock_movements_supply_id ON supply_stock_movements(supply_id);
CREATE INDEX IF NOT EXISTS idx_supply_stock_movements_created_at ON supply_stock_movements(created_at DESC);
