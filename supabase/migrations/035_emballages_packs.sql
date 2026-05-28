-- Create emballages table
CREATE TABLE IF NOT EXISTS emballages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  capacity DECIMAL(10,2),
  unit VARCHAR(20),
  price DECIMAL(10,2),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create packs table
CREATE TABLE IF NOT EXISTS packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  quantity INTEGER,
  price DECIMAL(10,2),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies for emballages
ALTER TABLE emballages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated users on emballages"
ON emballages FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Add RLS policies for packs
ALTER TABLE packs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated users on packs"
ON packs FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_emballages_code ON emballages(code);
CREATE INDEX IF NOT EXISTS idx_emballages_name ON emballages(name);
CREATE INDEX IF NOT EXISTS idx_packs_code ON packs(code);
CREATE INDEX IF NOT EXISTS idx_packs_name ON packs(name);
