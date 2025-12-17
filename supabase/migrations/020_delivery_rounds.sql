-- Migration: Delivery Rounds (BLT - Bons de Livraison Tournée)
-- Date: 2024-01-01

-- Create delivery_rounds table (BLT)
CREATE TABLE IF NOT EXISTS delivery_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_number TEXT UNIQUE NOT NULL,
  driver_id UUID REFERENCES users(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  round_date DATE DEFAULT CURRENT_DATE,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  total_distance DECIMAL(10, 2),
  total_duration INT, -- in minutes
  depot_lat DECIMAL(10, 8),
  depot_lng DECIMAL(11, 8),
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create delivery_round_items table (links deliveries to rounds)
CREATE TABLE IF NOT EXISTS delivery_round_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID NOT NULL REFERENCES delivery_rounds(id) ON DELETE CASCADE,
  delivery_id UUID NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
  sequence_order INT DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'delivered', 'partial', 'returned', 'cancelled')),
  delivered_at TIMESTAMPTZ,
  notes TEXT,
  UNIQUE(round_id, delivery_id)
);

-- Enable RLS on new tables
ALTER TABLE delivery_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_round_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for delivery_rounds
DROP POLICY IF EXISTS "Users can view delivery_rounds" ON delivery_rounds;
CREATE POLICY "Users can view delivery_rounds" ON delivery_rounds
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert delivery_rounds" ON delivery_rounds;
CREATE POLICY "Users can insert delivery_rounds" ON delivery_rounds
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update delivery_rounds" ON delivery_rounds;
CREATE POLICY "Users can update delivery_rounds" ON delivery_rounds
  FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Users can delete delivery_rounds" ON delivery_rounds;
CREATE POLICY "Users can delete delivery_rounds" ON delivery_rounds
  FOR DELETE USING (true);

-- Create RLS policies for delivery_round_items
DROP POLICY IF EXISTS "Users can view delivery_round_items" ON delivery_round_items;
CREATE POLICY "Users can view delivery_round_items" ON delivery_round_items
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert delivery_round_items" ON delivery_round_items;
CREATE POLICY "Users can insert delivery_round_items" ON delivery_round_items
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update delivery_round_items" ON delivery_round_items;
CREATE POLICY "Users can update delivery_round_items" ON delivery_round_items
  FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Users can delete delivery_round_items" ON delivery_round_items;
CREATE POLICY "Users can delete delivery_round_items" ON delivery_round_items
  FOR DELETE USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_delivery_rounds_driver_id ON delivery_rounds(driver_id);
CREATE INDEX IF NOT EXISTS idx_delivery_rounds_status ON delivery_rounds(status);
CREATE INDEX IF NOT EXISTS idx_delivery_rounds_round_date ON delivery_rounds(round_date DESC);
CREATE INDEX IF NOT EXISTS idx_delivery_round_items_round_id ON delivery_round_items(round_id);
CREATE INDEX IF NOT EXISTS idx_delivery_round_items_delivery_id ON delivery_round_items(delivery_id);

-- Add module for BLT management
INSERT INTO modules (code, name, icon, path, sort_order, is_active) VALUES
('tournees', 'Tournées de Livraison', 'Route', '/tournees', 45, true)
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, icon = EXCLUDED.icon, path = EXCLUDED.path;

-- Grant permissions to admin role
INSERT INTO role_permissions (role_id, module_id, can_view, can_create, can_edit, can_delete)
SELECT r.id, m.id, true, true, true, true
FROM roles r, modules m
WHERE r.name = 'admin' AND m.code = 'tournees'
ON CONFLICT (role_id, module_id) DO UPDATE SET can_view = true, can_create = true, can_edit = true, can_delete = true;
