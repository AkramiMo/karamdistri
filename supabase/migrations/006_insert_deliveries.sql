-- ============================================
-- AKKA ERP - Insert Deliveries (Bons de Livraison)
-- 37 Livraisons avec prix de vente réels
-- ============================================

-- Helper function to create delivery and link to order
CREATE OR REPLACE FUNCTION create_delivery_from_order(
    p_delivery_number TEXT,
    p_delivery_date DATE,
    p_client_code TEXT,
    p_total_ht DECIMAL
) RETURNS UUID AS $$
DECLARE
    v_delivery_id UUID;
    v_order_id UUID;
    v_client_id UUID;
BEGIN
    -- Get order_id from order_number (same as delivery_number)
    SELECT id INTO v_order_id FROM orders WHERE order_number = p_delivery_number;

    -- Get client_id
    SELECT id INTO v_client_id FROM clients WHERE code = p_client_code;

    -- Insert delivery
    INSERT INTO deliveries (delivery_number, order_id, client_id, delivery_date, total_ht, status)
    VALUES (p_delivery_number, v_order_id, v_client_id, p_delivery_date, p_total_ht, 'delivered')
    RETURNING id INTO v_delivery_id;

    -- Update order status to delivered
    UPDATE orders SET status = 'delivered', updated_at = now() WHERE id = v_order_id;

    RETURN v_delivery_id;
END;
$$ LANGUAGE plpgsql;

-- Helper function to add delivery item with actual selling price
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
-- BCC356 - 25/11/2024 - Client: C0008 - Total: 875.00
-- ============================================
SELECT create_delivery_from_order('BCC356', '2024-11-25', 'C0008', 875.00);
SELECT add_delivery_item('BCC356', 'Se9LOVE', 7, 125.00);

-- ============================================
-- BCC357 - 25/11/2024 - Client: C0018 - Total: 1635.00
-- ============================================
SELECT create_delivery_from_order('BCC357', '2024-11-25', 'C0018', 1635.00);
SELECT add_delivery_item('BCC357', 'OLNV37', 60, 16.00);
SELECT add_delivery_item('BCC357', 'OLOV37', 30, 17.50);
SELECT add_delivery_item('BCC357', 'OLNP37', 6, 17.50);

-- ============================================
-- BCC358 - 25/11/2024 - Client: C0017 - Total: 4625.00
-- ============================================
SELECT create_delivery_from_order('BCC358', '2024-11-25', 'C0017', 4625.00);
SELECT add_delivery_item('BCC358', 'Se9LOVE', 37, 125.00);

-- ============================================
-- BCC359 - 25/11/2024 - Client: C0020 - Total: 2002.00
-- ============================================
SELECT create_delivery_from_order('BCC359', '2024-11-25', 'C0020', 2002.00);
SELECT add_delivery_item('BCC359', 'OLNP37', 2, 18.00);
SELECT add_delivery_item('BCC359', 'OLNV37', 24, 17.00);
SELECT add_delivery_item('BCC359', 'OLRV37', 24, 19.00);
SELECT add_delivery_item('BCC359', 'OLOV37', 36, 18.00);
SELECT add_delivery_item('BCC359', 'Se9LOVE', 2, 125.00);

-- ============================================
-- BCC360 - 26/11/2024 - Client: C0008 - Total: 1250.00
-- ============================================
SELECT create_delivery_from_order('BCC360', '2024-11-26', 'C0008', 1250.00);
SELECT add_delivery_item('BCC360', 'Se9LOVE', 10, 125.00);

-- ============================================
-- BCC361 - 26/11/2024 - Client: C0021 - Total: 3632.00
-- ============================================
SELECT create_delivery_from_order('BCC361', '2024-11-26', 'C0021', 3632.00);
SELECT add_delivery_item('BCC361', 'OLNV37', 84, 17.00);
SELECT add_delivery_item('BCC361', 'OLOV37', 48, 18.00);
SELECT add_delivery_item('BCC361', 'OLRV37', 48, 19.00);
SELECT add_delivery_item('BCC361', 'OLNP37', 12, 18.00);

-- ============================================
-- BCC362 - 26/11/2024 - Client: C0020 - Total: 1750.00
-- ============================================
SELECT create_delivery_from_order('BCC362', '2024-11-26', 'C0020', 1750.00);
SELECT add_delivery_item('BCC362', 'Se9LOVE', 14, 125.00);

-- ============================================
-- BCC363 - 27/11/2024 - Client: C0008 - Total: 3500.00
-- ============================================
SELECT create_delivery_from_order('BCC363', '2024-11-27', 'C0008', 3500.00);
SELECT add_delivery_item('BCC363', 'Se9LOVE', 28, 125.00);

-- ============================================
-- BCC364 - 27/11/2024 - Client: C0022 - Total: 1875.00
-- ============================================
SELECT create_delivery_from_order('BCC364', '2024-11-27', 'C0022', 1875.00);
SELECT add_delivery_item('BCC364', 'Se9LOVE', 15, 125.00);

-- ============================================
-- BCC365 - 27/11/2024 - Client: C0024 - Total: 1350.00
-- ============================================
SELECT create_delivery_from_order('BCC365', '2024-11-27', 'C0024', 1350.00);
SELECT add_delivery_item('BCC365', 'OLNV37', 30, 17.00);
SELECT add_delivery_item('BCC365', 'OLOV37', 24, 18.00);
SELECT add_delivery_item('BCC365', 'OLRV37', 12, 19.00);

-- ============================================
-- BCC366 - 27/11/2024 - Client: C0020 - Total: 1568.00
-- ============================================
SELECT create_delivery_from_order('BCC366', '2024-11-27', 'C0020', 1568.00);
SELECT add_delivery_item('BCC366', 'OLNV37', 24, 17.00);
SELECT add_delivery_item('BCC366', 'OLOV37', 24, 18.00);
SELECT add_delivery_item('BCC366', 'OLRV37', 12, 19.00);
SELECT add_delivery_item('BCC366', 'Se9LOVE', 4, 125.00);

-- ============================================
-- BCC367 - 28/11/2024 - Client: C0020 - Total: 2348.00
-- ============================================
SELECT create_delivery_from_order('BCC367', '2024-11-28', 'C0020', 2348.00);
SELECT add_delivery_item('BCC367', 'OLNV37', 24, 17.00);
SELECT add_delivery_item('BCC367', 'OLOV37', 36, 18.00);
SELECT add_delivery_item('BCC367', 'OLRV37', 24, 19.00);
SELECT add_delivery_item('BCC367', 'Se9LOVE', 8, 125.00);

-- ============================================
-- BCC368 - 29/11/2024 - Client: C0005 - Total: 816.00
-- ============================================
SELECT create_delivery_from_order('BCC368', '2024-11-29', 'C0005', 816.00);
SELECT add_delivery_item('BCC368', 'OLNV37', 48, 17.00);

-- ============================================
-- BCC369 - 29/11/2024 - Client: C0019 - Total: 1500.00
-- ============================================
SELECT create_delivery_from_order('BCC369', '2024-11-29', 'C0019', 1500.00);
SELECT add_delivery_item('BCC369', 'Se9LOVE', 12, 125.00);

-- ============================================
-- BCC370 - 29/11/2024 - Client: C0020 - Total: 750.00
-- ============================================
SELECT create_delivery_from_order('BCC370', '2024-11-29', 'C0020', 750.00);
SELECT add_delivery_item('BCC370', 'Se9LOVE', 6, 125.00);

-- ============================================
-- BCC371 - 30/11/2024 - Client: C0025 - Total: 1296.00
-- ============================================
SELECT create_delivery_from_order('BCC371', '2024-11-30', 'C0025', 1296.00);
SELECT add_delivery_item('BCC371', 'OLNV37', 24, 17.00);
SELECT add_delivery_item('BCC371', 'OLOV37', 24, 18.00);
SELECT add_delivery_item('BCC371', 'OLRV37', 12, 19.00);
SELECT add_delivery_item('BCC371', 'OLNP37', 12, 18.00);

-- ============================================
-- BCC372 - 30/11/2024 - Client: C0020 - Total: 1250.00
-- ============================================
SELECT create_delivery_from_order('BCC372', '2024-11-30', 'C0020', 1250.00);
SELECT add_delivery_item('BCC372', 'Se9LOVE', 10, 125.00);

-- ============================================
-- BCC373 - 02/12/2024 - Client: C0020 - Total: 1068.00
-- ============================================
SELECT create_delivery_from_order('BCC373', '2024-12-02', 'C0020', 1068.00);
SELECT add_delivery_item('BCC373', 'OLNV37', 12, 17.00);
SELECT add_delivery_item('BCC373', 'OLOV37', 12, 18.00);
SELECT add_delivery_item('BCC373', 'OLRV37', 12, 19.00);
SELECT add_delivery_item('BCC373', 'Se9LOVE', 4, 125.00);

-- ============================================
-- BCC374 - 02/12/2024 - Client: C0022 - Total: 3000.00
-- ============================================
SELECT create_delivery_from_order('BCC374', '2024-12-02', 'C0022', 3000.00);
SELECT add_delivery_item('BCC374', 'Se9LOVE', 24, 125.00);

-- ============================================
-- BCC375 - 02/12/2024 - Client: C0012 - Total: 1224.00
-- ============================================
SELECT create_delivery_from_order('BCC375', '2024-12-02', 'C0012', 1224.00);
SELECT add_delivery_item('BCC375', 'OLNV37', 12, 17.00);
SELECT add_delivery_item('BCC375', 'OLOV37', 12, 18.00);
SELECT add_delivery_item('BCC375', 'OLRV37', 12, 19.00);
SELECT add_delivery_item('BCC375', 'OLNP37', 24, 18.00);

-- ============================================
-- BCC376 - 02/12/2024 - Client: C0026 - Total: 1212.00
-- ============================================
SELECT create_delivery_from_order('BCC376', '2024-12-02', 'C0026', 1212.00);
SELECT add_delivery_item('BCC376', 'OLNV37', 12, 17.00);
SELECT add_delivery_item('BCC376', 'OLOV37', 24, 18.00);
SELECT add_delivery_item('BCC376', 'OLRV37', 24, 19.00);

-- ============================================
-- BCC377 - 03/12/2024 - Client: C0027 - Total: 1500.00
-- ============================================
SELECT create_delivery_from_order('BCC377', '2024-12-03', 'C0027', 1500.00);
SELECT add_delivery_item('BCC377', 'Se9LOVE', 12, 125.00);

-- ============================================
-- BCC378 - 03/12/2024 - Client: C0008 - Total: 875.00
-- ============================================
SELECT create_delivery_from_order('BCC378', '2024-12-03', 'C0008', 875.00);
SELECT add_delivery_item('BCC378', 'Se9LOVE', 7, 125.00);

-- ============================================
-- BCC379 - 03/12/2024 - Client: C0022 - Total: 1750.00
-- ============================================
SELECT create_delivery_from_order('BCC379', '2024-12-03', 'C0022', 1750.00);
SELECT add_delivery_item('BCC379', 'Se9LOVE', 14, 125.00);

-- ============================================
-- BCC380 - 03/12/2024 - Client: C0018 - Total: 1785.00
-- ============================================
SELECT create_delivery_from_order('BCC380', '2024-12-03', 'C0018', 1785.00);
SELECT add_delivery_item('BCC380', 'OLNV37', 60, 16.00);
SELECT add_delivery_item('BCC380', 'OLOV37', 30, 17.50);
SELECT add_delivery_item('BCC380', 'OLNP37', 12, 17.50);

-- ============================================
-- BCC381 - 04/12/2024 - Client: C0028 - Total: 4320.00
-- ============================================
SELECT create_delivery_from_order('BCC381', '2024-12-04', 'C0028', 4320.00);
SELECT add_delivery_item('BCC381', 'OLNV37', 120, 17.00);
SELECT add_delivery_item('BCC381', 'OLOV37', 72, 18.00);
SELECT add_delivery_item('BCC381', 'OLRV37', 24, 19.00);

-- ============================================
-- BCC382 - 04/12/2024 - Client: C0029 - Total: 2250.00
-- ============================================
SELECT create_delivery_from_order('BCC382', '2024-12-04', 'C0029', 2250.00);
SELECT add_delivery_item('BCC382', 'Se9LOVE', 18, 125.00);

-- ============================================
-- BCC383 - 05/12/2024 - Client: C0018 - Total: 1260.00
-- ============================================
SELECT create_delivery_from_order('BCC383', '2024-12-05', 'C0018', 1260.00);
SELECT add_delivery_item('BCC383', 'OLNV37', 48, 16.00);
SELECT add_delivery_item('BCC383', 'OLOV37', 24, 17.50);

-- ============================================
-- BCC384 - 05/12/2024 - Client: C0023 - Total: 3125.00
-- ============================================
SELECT create_delivery_from_order('BCC384', '2024-12-05', 'C0023', 3125.00);
SELECT add_delivery_item('BCC384', 'Se9LOVE', 25, 125.00);

-- ============================================
-- BCC385 - 06/12/2024 - Client: C0021 - Total: 2888.00
-- ============================================
SELECT create_delivery_from_order('BCC385', '2024-12-06', 'C0021', 2888.00);
SELECT add_delivery_item('BCC385', 'OLNV37', 72, 17.00);
SELECT add_delivery_item('BCC385', 'OLOV37', 36, 18.00);
SELECT add_delivery_item('BCC385', 'OLRV37', 36, 19.00);

-- ============================================
-- BCC386 - 06/12/2024 - Client: C0030 - Total: 1740.00
-- ============================================
SELECT create_delivery_from_order('BCC386', '2024-12-06', 'C0030', 1740.00);
SELECT add_delivery_item('BCC386', 'OLNV37', 36, 17.00);
SELECT add_delivery_item('BCC386', 'OLOV37', 36, 18.00);
SELECT add_delivery_item('BCC386', 'OLRV37', 12, 19.00);

-- ============================================
-- BCC387 - 07/12/2024 - Client: C0022 - Total: 1625.00
-- ============================================
SELECT create_delivery_from_order('BCC387', '2024-12-07', 'C0022', 1625.00);
SELECT add_delivery_item('BCC387', 'Se9LOVE', 13, 125.00);

-- ============================================
-- BCC388 - 07/12/2024 - Client: C0020 - Total: 750.00
-- ============================================
SELECT create_delivery_from_order('BCC388', '2024-12-07', 'C0020', 750.00);
SELECT add_delivery_item('BCC388', 'Se9LOVE', 6, 125.00);

-- ============================================
-- BCC389 - 09/12/2024 - Client: C0031 - Total: 1600.00
-- ============================================
SELECT create_delivery_from_order('BCC389', '2024-12-09', 'C0031', 1600.00);
SELECT add_delivery_item('BCC389', 'OLNV37', 48, 17.00);
SELECT add_delivery_item('BCC389', 'OLOV37', 24, 18.00);
SELECT add_delivery_item('BCC389', 'OLRV37', 12, 19.00);

-- ============================================
-- BCC390 - 09/12/2024 - Client: C0018 - Total: 1155.00
-- ============================================
SELECT create_delivery_from_order('BCC390', '2024-12-09', 'C0018', 1155.00);
SELECT add_delivery_item('BCC390', 'OLNV37', 42, 16.00);
SELECT add_delivery_item('BCC390', 'OLOV37', 18, 17.50);
SELECT add_delivery_item('BCC390', 'OLNP37', 6, 17.50);

-- ============================================
-- BCC391 - 10/12/2024 - Client: C0022 - Total: 2500.00
-- ============================================
SELECT create_delivery_from_order('BCC391', '2024-12-10', 'C0022', 2500.00);
SELECT add_delivery_item('BCC391', 'Se9LOVE', 20, 125.00);

-- ============================================
-- BCC392 - 10/12/2024 - Client: C0008 - Total: 1500.00
-- ============================================
SELECT create_delivery_from_order('BCC392', '2024-12-10', 'C0008', 1500.00);
SELECT add_delivery_item('BCC392', 'Se9LOVE', 12, 125.00);

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
DROP FUNCTION IF EXISTS create_delivery_from_order(TEXT, DATE, TEXT, DECIMAL);
DROP FUNCTION IF EXISTS add_delivery_item(TEXT, TEXT, INT, DECIMAL);

-- Summary
SELECT 'Deliveries inserted: 37 bons de livraison (BCC356-BCC392)' as status;
SELECT COUNT(*) as total_deliveries FROM deliveries;
SELECT COUNT(*) as total_delivery_items FROM delivery_items;
