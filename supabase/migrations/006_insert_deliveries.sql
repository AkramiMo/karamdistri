-- ============================================
-- KARAM ERP - Insert Deliveries (Bons de Livraison)
-- Updated with new client codes and prices
-- ============================================

-- First, ensure new clients exist
INSERT INTO clients (code, name, category, is_active)
VALUES
  ('AUT48', 'Client AUT48', 'Standard', true),
  ('AUT55', 'Client AUT55', 'Standard', true),
  ('FOD3', 'Client FOD3', 'Standard', true),
  ('FOD4', 'Client FOD4', 'Standard', true),
  ('FOD9', 'Client FOD9', 'Standard', true),
  ('FOD19', 'Client FOD19', 'Standard', true),
  ('FOD66', 'Client FOD66', 'Standard', true),
  ('EPC20', 'Client EPC20', 'Standard', true),
  ('EPC44', 'Client EPC44', 'Standard', true),
  ('DEP29', 'Client DEP29', 'Standard', true)
ON CONFLICT (code) DO NOTHING;

-- Helper function to create delivery
CREATE OR REPLACE FUNCTION create_delivery(
    p_delivery_number TEXT,
    p_delivery_date DATE,
    p_client_code TEXT,
    p_total_ht DECIMAL
) RETURNS UUID AS $$
DECLARE
    v_delivery_id UUID;
    v_client_id UUID;
BEGIN
    SELECT id INTO v_client_id FROM clients WHERE code = p_client_code;

    INSERT INTO deliveries (delivery_number, client_id, delivery_date, total_ht, status)
    VALUES (p_delivery_number, v_client_id, p_delivery_date, p_total_ht, 'delivered')
    RETURNING id INTO v_delivery_id;

    RETURN v_delivery_id;
END;
$$ LANGUAGE plpgsql;

-- Helper function to add delivery item
CREATE OR REPLACE FUNCTION add_delivery_item(
    p_delivery_number TEXT,
    p_article_code TEXT,
    p_quantity INT,
    p_unit_price DECIMAL
) RETURNS VOID AS $$
DECLARE
    v_delivery_id UUID;
    v_article_id UUID;
BEGIN
    SELECT id INTO v_delivery_id FROM deliveries WHERE delivery_number = p_delivery_number;
    SELECT id INTO v_article_id FROM articles WHERE code = p_article_code;

    IF v_delivery_id IS NOT NULL AND v_article_id IS NOT NULL THEN
        INSERT INTO delivery_items (delivery_id, article_id, quantity_ordered, quantity_delivered, unit_price)
        VALUES (v_delivery_id, v_article_id, p_quantity, p_quantity, p_unit_price);
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- BCC356 - 03/11/2025 - Client: AUT48 - Total: 415.00
-- ============================================
SELECT create_delivery('BCC356', '2025-11-03', 'AUT48', 415.00);
SELECT add_delivery_item('BCC356', 'Se9LOVE', 1, 125.00);
SELECT add_delivery_item('BCC356', 'Se9LOTR', 1, 125.00);
SELECT add_delivery_item('BCC356', 'Se9LONFG', 1, 165.00);

-- ============================================
-- BCC357 - 05/11/2025 - Client: FOD9 - Total: 320.00
-- ============================================
SELECT create_delivery('BCC357', '2025-11-05', 'FOD9', 320.00);
SELECT add_delivery_item('BCC357', 'Se9LCor', 4, 80.00);

-- ============================================
-- BCC358 - 04/11/2025 - Client: AUT55 - Total: 1500.00
-- ============================================
SELECT create_delivery('BCC358', '2025-11-04', 'AUT55', 1500.00);
SELECT add_delivery_item('BCC358', 'Se9LOVR', 1, 150.00);
SELECT add_delivery_item('BCC358', 'Se9LONR', 2, 155.00);
SELECT add_delivery_item('BCC358', 'Se9LONFG', 2, 165.00);
SELECT add_delivery_item('BCC358', 'Se9LOTR', 2, 120.00);
SELECT add_delivery_item('BCC358', 'Se9LOVE', 2, 120.00);
SELECT add_delivery_item('BCC358', 'Se9LHr', 2, 55.00);
SELECT add_delivery_item('BCC358', 'Se9LCtr', 2, 60.00);

-- ============================================
-- BCC359 - 05/11/2025 - Client: FOD4 - Total: 190.00
-- ============================================
SELECT create_delivery('BCC359', '2025-11-05', 'FOD4', 190.00);
SELECT add_delivery_item('BCC359', 'Se9LOVR', 1, 150.00);
SELECT add_delivery_item('BCC359', 'Se9LHr', 1, 40.00);

-- ============================================
-- BCC360 - 05/11/2025 - Client: AUT55 - Total: 930.00
-- ============================================
SELECT create_delivery('BCC360', '2025-11-05', 'AUT55', 930.00);
SELECT add_delivery_item('BCC360', 'Se9LOVE', 2, 120.00);
SELECT add_delivery_item('BCC360', 'Se9LOTR', 2, 120.00);
SELECT add_delivery_item('BCC360', 'Se9LONFG', 2, 165.00);
SELECT add_delivery_item('BCC360', 'Se9LCtr', 2, 60.00);

-- ============================================
-- BCC361 - 04/11/2025 - Client: FOD66 - Total: 8799.50
-- ============================================
SELECT create_delivery('BCC361', '2025-11-04', 'FOD66', 8799.50);
SELECT add_delivery_item('BCC361', 'Se9LOTR', 8, 140.50);
SELECT add_delivery_item('BCC361', 'Se9LONFG', 20, 182.50);
SELECT add_delivery_item('BCC361', 'Se9LOVBCa', 8, 167.50);
SELECT add_delivery_item('BCC361', 'Se9LOVD', 4, 167.50);
SELECT add_delivery_item('BCC361', 'Se9LOVR', 8, 167.50);
SELECT add_delivery_item('BCC361', 'Se9LCtr', 10, 67.55);

-- ============================================
-- BCC362 - 11/11/2025 - Client: AUT55 - Total: 465.00
-- ============================================
SELECT create_delivery('BCC362', '2025-11-11', 'AUT55', 465.00);
SELECT add_delivery_item('BCC362', 'Se9LOVE', 1, 120.00);
SELECT add_delivery_item('BCC362', 'Se9LONFG', 1, 165.00);
SELECT add_delivery_item('BCC362', 'Se11LOTR', 1, 120.00);
SELECT add_delivery_item('BCC362', 'Se9LCtr', 1, 60.00);

-- ============================================
-- BCC363 - 10/11/2025 - Client: EPC44 - Total: 135.00
-- ============================================
SELECT create_delivery('BCC363', '2025-11-10', 'EPC44', 135.00);
SELECT add_delivery_item('BCC363', 'Se9LOVD', 1, 135.00);

-- ============================================
-- BCC364 - 10/11/2025 - Client: FOD3 - Total: 100.00
-- ============================================
SELECT create_delivery('BCC364', '2025-11-10', 'FOD3', 100.00);
SELECT add_delivery_item('BCC364', 'Se9LCtr', 2, 50.00);

-- ============================================
-- BCC365 - 08/11/2025 - Client: FOD9 - Total: 820.00
-- ============================================
SELECT create_delivery('BCC365', '2025-11-08', 'FOD9', 820.00);
SELECT add_delivery_item('BCC365', 'Se9LCor', 6, 80.00);
SELECT add_delivery_item('BCC365', 'Bi5LHr', 8, 42.50);

-- ============================================
-- BCC366 - 12/11/2025 - Client: AUT48 - Total: 465.00
-- ============================================
SELECT create_delivery('BCC366', '2025-11-12', 'AUT48', 465.00);
SELECT add_delivery_item('BCC366', 'Se9LONFG', 1, 165.00);
SELECT add_delivery_item('BCC366', 'Se11LOVE', 1, 120.00);
SELECT add_delivery_item('BCC366', 'Se11LOTR', 1, 120.00);
SELECT add_delivery_item('BCC366', 'Se9LCtr', 1, 60.00);

-- ============================================
-- BCC367 - 12/11/2025 - Client: FOD3 - Total: 150.00
-- ============================================
SELECT create_delivery('BCC367', '2025-11-12', 'FOD3', 150.00);
SELECT add_delivery_item('BCC367', 'Se9LOVR', 1, 150.00);

-- ============================================
-- BCC368 - 15/11/2025 - Client: EPC20 - Total: 625.00
-- ============================================
SELECT create_delivery('BCC368', '2025-11-15', 'EPC20', 625.00);
SELECT add_delivery_item('BCC368', 'Se9LONFG', 1, 145.00);
SELECT add_delivery_item('BCC368', 'Se9LOCktM', 1, 105.00);
SELECT add_delivery_item('BCC368', 'Se9LOVR', 1, 140.00);
SELECT add_delivery_item('BCC368', 'Se9LOVD', 1, 140.00);
SELECT add_delivery_item('BCC368', 'Se9LCtr', 1, 45.00);
SELECT add_delivery_item('BCC368', 'Bi5LHr', 1, 50.00);

-- ============================================
-- BCC369 - 15/11/2025 - Client: FOD3 - Total: 174.00
-- ============================================
SELECT create_delivery('BCC369', '2025-11-15', 'FOD3', 174.00);
SELECT add_delivery_item('BCC369', 'Se9LCtr', 2, 45.00);
SELECT add_delivery_item('BCC369', 'AUT', 3, 28.00);

-- ============================================
-- BCC370 - 15/11/2025 - Client: AUT55 - Total: 555.00
-- ============================================
SELECT create_delivery('BCC370', '2025-11-15', 'AUT55', 555.00);
SELECT add_delivery_item('BCC370', 'Se9LOVE', 1, 115.00);
SELECT add_delivery_item('BCC370', 'Se9LOTR', 1, 115.00);
SELECT add_delivery_item('BCC370', 'Se9LONFG', 1, 165.00);
SELECT add_delivery_item('BCC370', 'Se9LCtr', 2, 60.00);
SELECT add_delivery_item('BCC370', 'Se9LHr', 1, 40.00);

-- ============================================
-- BCC371 - 15/11/2025 - Client: AUT48 - Total: 230.00
-- ============================================
SELECT create_delivery('BCC371', '2025-11-15', 'AUT48', 230.00);
SELECT add_delivery_item('BCC371', 'Se9LOTR', 1, 115.00);
SELECT add_delivery_item('BCC371', 'Se9LOVE', 1, 115.00);

-- ============================================
-- BCC372 - 18/11/2025 - Client: AUT55 - Total: 1450.00
-- ============================================
SELECT create_delivery('BCC372', '2025-11-18', 'AUT55', 1450.00);
SELECT add_delivery_item('BCC372', 'Se9LOVE', 2, 115.00);
SELECT add_delivery_item('BCC372', 'Se9LOTR', 2, 115.00);
SELECT add_delivery_item('BCC372', 'Se9LONFG', 2, 165.00);
SELECT add_delivery_item('BCC372', 'Se9LOVR', 2, 155.00);
SELECT add_delivery_item('BCC372', 'Se9LOCktM', 2, 115.00);
SELECT add_delivery_item('BCC372', 'Se9LCtr', 2, 60.00);

-- ============================================
-- BCC373 - 18/11/2025 - Client: FOD3 - Total: 245.00
-- ============================================
SELECT create_delivery('BCC373', '2025-11-18', 'FOD3', 245.00);
SELECT add_delivery_item('BCC373', 'Se9LOCktM', 1, 100.00);
SELECT add_delivery_item('BCC373', 'Se9LONFG', 1, 145.00);

-- ============================================
-- BCC374 - 18/11/2025 - Client: FOD19 - Total: 750.00
-- ============================================
SELECT create_delivery('BCC374', '2025-11-18', 'FOD19', 750.00);
SELECT add_delivery_item('BCC374', 'Se9LOVE', 6, 110.00);
SELECT add_delivery_item('BCC374', 'Se9LCtr', 2, 45.00);

-- ============================================
-- BCC375 - 19/11/2025 - Client: FOD3 - Total: 310.00
-- ============================================
SELECT create_delivery('BCC375', '2025-11-19', 'FOD3', 310.00);
SELECT add_delivery_item('BCC375', 'Se9LCtr', 2, 45.00);
SELECT add_delivery_item('BCC375', 'Se9LOVR', 1, 140.00);
SELECT add_delivery_item('BCC375', 'AUT', 2, 40.00);

-- ============================================
-- BCC376 - 22/11/2025 - Client: AUT48 - Total: 405.00
-- ============================================
SELECT create_delivery('BCC376', '2025-11-22', 'AUT48', 405.00);
SELECT add_delivery_item('BCC376', 'Se9LONFG', 1, 165.00);
SELECT add_delivery_item('BCC376', 'Se9LOVE', 1, 120.00);
SELECT add_delivery_item('BCC376', 'Se9LOTR', 1, 120.00);

-- ============================================
-- BCC377 - 23/11/2025 - Client: FOD3 - Total: 90.00
-- ============================================
SELECT create_delivery('BCC377', '2025-11-23', 'FOD3', 90.00);
SELECT add_delivery_item('BCC377', 'Se9LCtr', 2, 45.00);

-- ============================================
-- BCC378 - 24/11/2025 - Client: FOD3 - Total: 145.00
-- ============================================
SELECT create_delivery('BCC378', '2025-11-24', 'FOD3', 145.00);
SELECT add_delivery_item('BCC378', 'Se9LOVR', 1, 145.00);

-- ============================================
-- BCC379 - 24/11/2025 - Client: AUT55 - Total: 465.00
-- ============================================
SELECT create_delivery('BCC379', '2025-11-24', 'AUT55', 465.00);
SELECT add_delivery_item('BCC379', 'Se9LONFG', 1, 165.00);
SELECT add_delivery_item('BCC379', 'Se9LOVE', 1, 120.00);
SELECT add_delivery_item('BCC379', 'Se9LOTR', 1, 120.00);
SELECT add_delivery_item('BCC379', 'Se9LCtr', 1, 60.00);

-- ============================================
-- BCC380 - 26/11/2025 - Client: AUT55 - Total: 180.00
-- ============================================
SELECT create_delivery('BCC380', '2025-11-26', 'AUT55', 180.00);
SELECT add_delivery_item('BCC380', 'Se9LOTR', 1, 120.00);
SELECT add_delivery_item('BCC380', 'Se9LCtr', 1, 60.00);

-- ============================================
-- BCC381 - 29/11/2025 - Client: FOD3 - Total: 145.00
-- ============================================
SELECT create_delivery('BCC381', '2025-11-29', 'FOD3', 145.00);
SELECT add_delivery_item('BCC381', 'Se9LOVR', 1, 145.00);

-- ============================================
-- BCC382 - 28/11/2025 - Client: FOD66 - Total: 8016.70
-- ============================================
SELECT create_delivery('BCC382', '2025-11-28', 'FOD66', 8016.70);
SELECT add_delivery_item('BCC382', 'Se9LONFG', 20, 182.50);
SELECT add_delivery_item('BCC382', 'Se9LOTR', 4, 140.50);
SELECT add_delivery_item('BCC382', 'Se9LOVR', 6, 167.50);
SELECT add_delivery_item('BCC382', 'Se9LOVD', 4, 167.50);
SELECT add_delivery_item('BCC382', 'Se9LOVBCa', 10, 167.50);
SELECT add_delivery_item('BCC382', 'Se9LCtr', 4, 67.55);
SELECT add_delivery_item('BCC382', 'Se9LHr', 3, 61.50);

-- ============================================
-- BCC383 - 29/11/2025 - Client: AUT48 - Total: 465.00
-- ============================================
SELECT create_delivery('BCC383', '2025-11-29', 'AUT48', 465.00);
SELECT add_delivery_item('BCC383', 'Se9LONFG', 1, 165.00);
SELECT add_delivery_item('BCC383', 'Se9LOVE', 1, 120.00);
SELECT add_delivery_item('BCC383', 'Se9LOTR', 1, 120.00);
SELECT add_delivery_item('BCC383', 'Se9LCtr', 1, 60.00);

-- ============================================
-- BCC384 - 29/11/2025 - Client: AUT55 - Total: 2105.00
-- ============================================
SELECT create_delivery('BCC384', '2025-11-29', 'AUT55', 2105.00);
SELECT add_delivery_item('BCC384', 'Se9LOVE', 5, 120.00);
SELECT add_delivery_item('BCC384', 'Se9LOTR', 5, 120.00);
SELECT add_delivery_item('BCC384', 'Se9LONFG', 3, 165.00);
SELECT add_delivery_item('BCC384', 'Se9LCtr', 5, 60.00);
SELECT add_delivery_item('BCC384', 'Se9LHr', 2, 55.00);

-- ============================================
-- BCC385 - 02/12/2025 - Client: FOD4 - Total: 190.00
-- ============================================
SELECT create_delivery('BCC385', '2025-12-02', 'FOD4', 190.00);
SELECT add_delivery_item('BCC385', 'Se9LOVR', 1, 150.00);
SELECT add_delivery_item('BCC385', 'Se9LHr', 1, 40.00);

-- ============================================
-- BCC386 - 03/12/2025 - Client: DEP29 - Total: 9450.00
-- ============================================
SELECT create_delivery('BCC386', '2025-12-03', 'DEP29', 9450.00);
SELECT add_delivery_item('BCC386', 'Se11LOVE', 6, 156.00);
SELECT add_delivery_item('BCC386', 'Se11LOTR', 6, 156.00);
SELECT add_delivery_item('BCC386', 'Se11LOVE', 6, 180.00);
SELECT add_delivery_item('BCC386', 'Se11LOVCaB', 6, 204.00);
SELECT add_delivery_item('BCC386', 'Se11LONFG', 6, 270.00);
SELECT add_delivery_item('BCC386', 'Se11LOVD', 6, 206.00);
SELECT add_delivery_item('BCC386', 'Se11LCtr', 7, 80.00);
SELECT add_delivery_item('BCC386', 'Se11LOVR', 5, 206.00);
SELECT add_delivery_item('BCC386', 'Se9LHr', 12, 69.00);

-- ============================================
-- BCC387 - 08/12/2025 - Client: FOD3 - Total: 535.00
-- ============================================
SELECT create_delivery('BCC387', '2025-12-08', 'FOD3', 535.00);
SELECT add_delivery_item('BCC387', 'Se9LONFG', 2, 150.00);
SELECT add_delivery_item('BCC387', 'Se9LOVR', 1, 145.00);
SELECT add_delivery_item('BCC387', 'Se9LCtr', 2, 45.00);

-- ============================================
-- BCC388 - 03/12/2025 - Client: FOD3 - Total: 120.00
-- ============================================
SELECT create_delivery('BCC388', '2025-12-03', 'FOD3', 120.00);
SELECT add_delivery_item('BCC388', 'AUT', 3, 40.00);

-- ============================================
-- BCC389 - 03/12/2025 - Client: AUT48 - Total: 405.00
-- ============================================
SELECT create_delivery('BCC389', '2025-12-03', 'AUT48', 405.00);
SELECT add_delivery_item('BCC389', 'Se9LONFG', 1, 165.00);
SELECT add_delivery_item('BCC389', 'Se9LOVE', 1, 120.00);
SELECT add_delivery_item('BCC389', 'Se9LOTR', 1, 120.00);

-- ============================================
-- BCC390 - 04/12/2025 - Client: AUT55 - Total: 620.00
-- ============================================
SELECT create_delivery('BCC390', '2025-12-04', 'AUT55', 620.00);
SELECT add_delivery_item('BCC390', 'Se9LOVR', 4, 155.00);

-- ============================================
-- BCC391 - 09/12/2025 - Client: DEP29 - Total: 10708.00
-- ============================================
SELECT create_delivery('BCC391', '2025-12-09', 'DEP29', 10708.00);
SELECT add_delivery_item('BCC391', 'Se11LOVE', 10, 156.00);
SELECT add_delivery_item('BCC391', 'Se11LOVE', 10, 180.00);
SELECT add_delivery_item('BCC391', 'Se11LOVCaB', 5, 204.00);
SELECT add_delivery_item('BCC391', 'Se11LOTR', 9, 156.00);
SELECT add_delivery_item('BCC391', 'Se11LONFG', 9, 270.00);
SELECT add_delivery_item('BCC391', 'Se11LOVD', 9, 206.00);
SELECT add_delivery_item('BCC391', 'Se11LCtr', 8, 80.00);

-- ============================================
-- BCC392 - 08/12/2025 - Client: AUT55 - Total: 960.00
-- ============================================
SELECT create_delivery('BCC392', '2025-12-08', 'AUT55', 960.00);
SELECT add_delivery_item('BCC392', 'Se9LOVE', 4, 120.00);
SELECT add_delivery_item('BCC392', 'Se9LOTR', 2, 120.00);
SELECT add_delivery_item('BCC392', 'Se9LCtr', 4, 60.00);

-- ============================================
-- Add RLS Policies for deliveries if not exist
-- ============================================
DROP POLICY IF EXISTS "Allow authenticated read deliveries" ON deliveries;
DROP POLICY IF EXISTS "Allow authenticated insert deliveries" ON deliveries;
DROP POLICY IF EXISTS "Allow authenticated update deliveries" ON deliveries;

CREATE POLICY "Allow authenticated read deliveries" ON deliveries
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert deliveries" ON deliveries
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated update deliveries" ON deliveries
  FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated read delivery_items" ON delivery_items;
DROP POLICY IF EXISTS "Allow authenticated insert delivery_items" ON delivery_items;

CREATE POLICY "Allow authenticated read delivery_items" ON delivery_items
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert delivery_items" ON delivery_items
  FOR INSERT TO authenticated WITH CHECK (true);

-- Clean up helper functions
DROP FUNCTION IF EXISTS create_delivery(TEXT, DATE, TEXT, DECIMAL);
DROP FUNCTION IF EXISTS add_delivery_item(TEXT, TEXT, INT, DECIMAL);

-- Summary
SELECT 'Deliveries inserted: 37 bons de livraison (BCC356-BCC392)' as status;
SELECT COUNT(*) as total_deliveries FROM deliveries;
SELECT COUNT(*) as total_delivery_items FROM delivery_items;
