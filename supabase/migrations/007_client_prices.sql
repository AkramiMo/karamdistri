-- Table for client-specific article prices
-- This allows setting custom selling prices per client for each article

CREATE TABLE IF NOT EXISTS client_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  custom_price DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(client_id, article_id)
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_client_prices_client ON client_prices(client_id);
CREATE INDEX IF NOT EXISTS idx_client_prices_article ON client_prices(article_id);

-- Enable RLS
ALTER TABLE client_prices ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view client prices" ON client_prices
  FOR SELECT USING (true);

CREATE POLICY "Users can insert client prices" ON client_prices
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update client prices" ON client_prices
  FOR UPDATE USING (true);

CREATE POLICY "Users can delete client prices" ON client_prices
  FOR DELETE USING (true);

-- Function to get article price for a specific client
-- Returns custom price if exists, otherwise returns default article price
CREATE OR REPLACE FUNCTION get_client_article_price(p_client_id UUID, p_article_id UUID)
RETURNS DECIMAL(10, 2) AS $$
DECLARE
  v_custom_price DECIMAL(10, 2);
  v_default_price DECIMAL(10, 2);
BEGIN
  -- Try to get custom price
  SELECT custom_price INTO v_custom_price
  FROM client_prices
  WHERE client_id = p_client_id AND article_id = p_article_id;

  IF v_custom_price IS NOT NULL THEN
    RETURN v_custom_price;
  END IF;

  -- Get default price from articles table
  SELECT price_ht INTO v_default_price
  FROM articles
  WHERE id = p_article_id;

  RETURN COALESCE(v_default_price, 0);
END;
$$ LANGUAGE plpgsql;

-- Comment
COMMENT ON TABLE client_prices IS 'Custom selling prices per client for articles';
COMMENT ON COLUMN client_prices.custom_price IS 'Custom price HT for this client';
