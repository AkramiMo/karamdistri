-- =====================================================
-- Migration 005: Insert All Orders from Excel Data
-- AKKA Olives & Sauces - 128 Commandes
-- =====================================================

-- Helper function to create orders
CREATE OR REPLACE FUNCTION create_order_with_items(
    p_order_number TEXT,
    p_client_code TEXT,
    p_order_date DATE,
    p_order_time TIME,
    p_status TEXT DEFAULT 'confirmed'
) RETURNS UUID AS $$
DECLARE
    v_client_id UUID;
    v_order_id UUID;
BEGIN
    SELECT id INTO v_client_id FROM clients WHERE code = p_client_code;
    IF v_client_id IS NULL THEN
        RAISE NOTICE 'Client % not found', p_client_code;
        RETURN NULL;
    END IF;

    -- Check if order already exists
    SELECT id INTO v_order_id FROM orders WHERE order_number = p_order_number;
    IF v_order_id IS NOT NULL THEN
        RETURN v_order_id;
    END IF;

    INSERT INTO orders (id, order_number, client_id, status, order_date, created_at)
    VALUES (gen_random_uuid(), p_order_number, v_client_id, p_status, p_order_date, p_order_date + p_order_time)
    RETURNING id INTO v_order_id;

    RETURN v_order_id;
END;
$$ LANGUAGE plpgsql;

-- Helper function to add order item
CREATE OR REPLACE FUNCTION add_order_item(
    p_order_number TEXT,
    p_article_code TEXT,
    p_quantity INT
) RETURNS VOID AS $$
DECLARE
    v_order_id UUID;
    v_article_id UUID;
    v_price DECIMAL(10,2);
BEGIN
    SELECT id INTO v_order_id FROM orders WHERE order_number = p_order_number;
    SELECT id, price_ht INTO v_article_id, v_price FROM articles WHERE code = p_article_code;

    IF v_order_id IS NOT NULL AND v_article_id IS NOT NULL THEN
        INSERT INTO order_items (order_id, article_id, quantity, unit_price, total_ht)
        VALUES (v_order_id, v_article_id, p_quantity, COALESCE(v_price, 0), p_quantity * COALESCE(v_price, 0))
        ON CONFLICT DO NOTHING;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- CREATE ALL ORDERS
-- =====================================================

-- BCC355 - DEP29 - 10/11/2025 15:02
SELECT create_order_with_items('BCC355', 'DEP29', '2025-11-10', '15:02:00');
SELECT add_order_item('BCC355', 'Se11LOVD', 15);
SELECT add_order_item('BCC355', 'Se11LOTR', 15);
SELECT add_order_item('BCC355', 'Se11LOVE', 18);
SELECT add_order_item('BCC355', 'Se9LHr', 2);
SELECT add_order_item('BCC355', 'Se9LCor', 5);
SELECT add_order_item('BCC355', 'Se9LVar', 5);

-- BCC356 - AUT48 - 03/11/2025 13:22
SELECT create_order_with_items('BCC356', 'AUT48', '2025-11-03', '13:22:00');
SELECT add_order_item('BCC356', 'Se9LOVE', 1);
SELECT add_order_item('BCC356', 'Se9LOTR', 1);
SELECT add_order_item('BCC356', 'Se9LONFG', 1);

-- BCC357 - FOD9 - 05/11/2025 13:33
SELECT create_order_with_items('BCC357', 'FOD9', '2025-11-05', '13:33:00');
SELECT add_order_item('BCC357', 'Se9LCor', 4);

-- BCC358 - AUT55 - 05/11/2025 13:45
SELECT create_order_with_items('BCC358', 'AUT55', '2025-11-05', '13:45:00');
SELECT add_order_item('BCC358', 'Se9LOVR', 1);
SELECT add_order_item('BCC358', 'Se9LONR', 2);
SELECT add_order_item('BCC358', 'Se9LONFG', 2);
SELECT add_order_item('BCC358', 'Se9LOTR', 2);
SELECT add_order_item('BCC358', 'Se9LOVE', 2);
SELECT add_order_item('BCC358', 'Se9LHr', 2);
SELECT add_order_item('BCC358', 'Se9LCtr', 2);

-- BCC359 - FOD4 - 05/11/2025 14:01
SELECT create_order_with_items('BCC359', 'FOD4', '2025-11-05', '14:01:00');
SELECT add_order_item('BCC359', 'Se9LOVR', 1);
SELECT add_order_item('BCC359', 'Se9LHr', 1);

-- BCC360 - AUT55 - 05/11/2025 14:04
SELECT create_order_with_items('BCC360', 'AUT55', '2025-11-05', '14:04:00');
SELECT add_order_item('BCC360', 'Se9LOVE', 2);
SELECT add_order_item('BCC360', 'Se9LOTR', 2);
SELECT add_order_item('BCC360', 'Se9LONFG', 2);
SELECT add_order_item('BCC360', 'Se9LCtr', 2);

-- BCC361 - FOD66 - 04/11/2025 14:14
SELECT create_order_with_items('BCC361', 'FOD66', '2025-11-04', '14:14:00');
SELECT add_order_item('BCC361', 'Se9LOTR', 8);
SELECT add_order_item('BCC361', 'Se9LONFG', 20);
SELECT add_order_item('BCC361', 'Se9LOVBCa', 8);
SELECT add_order_item('BCC361', 'Se9LOVD', 4);
SELECT add_order_item('BCC361', 'Se9LOVR', 8);
SELECT add_order_item('BCC361', 'Se9LCtr', 10);

-- BCC362 - AUT55 - 11/11/2025 14:24
SELECT create_order_with_items('BCC362', 'AUT55', '2025-11-11', '14:24:00');
SELECT add_order_item('BCC362', 'Se9LOVE', 1);
SELECT add_order_item('BCC362', 'Se9LONFG', 1);
SELECT add_order_item('BCC362', 'Se11LOTR', 1);
SELECT add_order_item('BCC362', 'Se9LCtr', 1);

-- BCC363 - EPC44 - 10/11/2025 14:27
SELECT create_order_with_items('BCC363', 'EPC44', '2025-11-10', '14:27:00');
SELECT add_order_item('BCC363', 'Se9LOVD', 1);

-- BCC364 - FOD3 - 10/11/2025 14:28
SELECT create_order_with_items('BCC364', 'FOD3', '2025-11-10', '14:28:00');
SELECT add_order_item('BCC364', 'Se9LCtr', 2);

-- BCC365 - FOD9 - 08/11/2025 14:34
SELECT create_order_with_items('BCC365', 'FOD9', '2025-11-08', '14:34:00');
SELECT add_order_item('BCC365', 'Se9LCor', 6);
SELECT add_order_item('BCC365', 'Bi5LHr', 8);

-- BCC366 - AUT48 - 12/11/2025 14:38
SELECT create_order_with_items('BCC366', 'AUT48', '2025-11-12', '14:38:00');
SELECT add_order_item('BCC366', 'Se9LONFG', 1);
SELECT add_order_item('BCC366', 'Se11LOVE', 1);
SELECT add_order_item('BCC366', 'Se11LOTR', 1);
SELECT add_order_item('BCC366', 'Se9LCtr', 1);

-- BCC367 - FOD3 - 12/11/2025 14:39
SELECT create_order_with_items('BCC367', 'FOD3', '2025-11-12', '14:39:00');
SELECT add_order_item('BCC367', 'Se9LOVR', 1);

-- BCC368 - EPC20 - 15/11/2025 17:25
SELECT create_order_with_items('BCC368', 'EPC20', '2025-11-15', '17:25:00');
SELECT add_order_item('BCC368', 'Se9LONFG', 1);
SELECT add_order_item('BCC368', 'Se9LOCktM', 1);
SELECT add_order_item('BCC368', 'Se9LOVR', 1);
SELECT add_order_item('BCC368', 'Se9LOVD', 1);
SELECT add_order_item('BCC368', 'Se9LCtr', 1);
SELECT add_order_item('BCC368', 'Bi5LHr', 1);

-- BCC369 - FOD3 - 15/11/2025 17:32
SELECT create_order_with_items('BCC369', 'FOD3', '2025-11-15', '17:32:00');
SELECT add_order_item('BCC369', 'Se9LCtr', 2);
SELECT add_order_item('BCC369', 'AUT', 3);

-- BCC370 - AUT55 - 15/11/2025 17:35
SELECT create_order_with_items('BCC370', 'AUT55', '2025-11-15', '17:35:00');
SELECT add_order_item('BCC370', 'Se9LOVE', 1);
SELECT add_order_item('BCC370', 'Se9LOTR', 1);
SELECT add_order_item('BCC370', 'Se9LONFG', 1);
SELECT add_order_item('BCC370', 'Se9LCtr', 2);
SELECT add_order_item('BCC370', 'Se9LHr', 1);

-- BCC371 - AUT48 - 15/11/2025 13:01
SELECT create_order_with_items('BCC371', 'AUT48', '2025-11-15', '13:01:00');
SELECT add_order_item('BCC371', 'Se9LOTR', 1);
SELECT add_order_item('BCC371', 'Se9LOVE', 1);

-- BCC372 - AUT55 - 18/11/2025 13:16
SELECT create_order_with_items('BCC372', 'AUT55', '2025-11-18', '13:16:00');
SELECT add_order_item('BCC372', 'Se9LOVE', 2);
SELECT add_order_item('BCC372', 'Se9LOTR', 2);
SELECT add_order_item('BCC372', 'Se9LONFG', 2);
SELECT add_order_item('BCC372', 'Se9LOVR', 2);
SELECT add_order_item('BCC372', 'Se9LOCktM', 2);
SELECT add_order_item('BCC372', 'Se9LCtr', 2);

-- BCC373 - FOD3 - 18/11/2025 11:18
SELECT create_order_with_items('BCC373', 'FOD3', '2025-11-18', '11:18:00');
SELECT add_order_item('BCC373', 'Se9LOCktM', 1);
SELECT add_order_item('BCC373', 'Se9LONFG', 1);

-- BCC374 - FOD19 - 18/11/2025 11:24
SELECT create_order_with_items('BCC374', 'FOD19', '2025-11-18', '11:24:00');
SELECT add_order_item('BCC374', 'Se9LOVE', 6);
SELECT add_order_item('BCC374', 'Se9LCtr', 2);

-- BCC375 - FOD3 - 19/11/2025 09:35
SELECT create_order_with_items('BCC375', 'FOD3', '2025-11-19', '09:35:00');
SELECT add_order_item('BCC375', 'Se9LCtr', 2);
SELECT add_order_item('BCC375', 'Se9LOVR', 1);
SELECT add_order_item('BCC375', 'AUT', 2);

-- BCC376 - AUT48 - 22/11/2025 12:20
SELECT create_order_with_items('BCC376', 'AUT48', '2025-11-22', '12:20:00');
SELECT add_order_item('BCC376', 'Se9LONFG', 1);
SELECT add_order_item('BCC376', 'Se9LOVE', 1);
SELECT add_order_item('BCC376', 'Se9LOTR', 1);

-- BCC377 - FOD3 - 23/11/2025 12:47
SELECT create_order_with_items('BCC377', 'FOD3', '2025-11-23', '12:47:00');
SELECT add_order_item('BCC377', 'Se9LCtr', 2);

-- BCC378 - FOD3 - 24/11/2025 12:48
SELECT create_order_with_items('BCC378', 'FOD3', '2025-11-24', '12:48:00');
SELECT add_order_item('BCC378', 'Se9LOVR', 1);

-- BCC379 - AUT55 - 24/11/2025 12:50
SELECT create_order_with_items('BCC379', 'AUT55', '2025-11-24', '12:50:00');
SELECT add_order_item('BCC379', 'Se9LONFG', 1);
SELECT add_order_item('BCC379', 'Se9LOVE', 1);
SELECT add_order_item('BCC379', 'Se9LOTR', 1);
SELECT add_order_item('BCC379', 'Se9LCtr', 1);

-- BCC380 - AUT55 - 26/11/2025 12:53
SELECT create_order_with_items('BCC380', 'AUT55', '2025-11-26', '12:53:00');
SELECT add_order_item('BCC380', 'Se9LOTR', 1);
SELECT add_order_item('BCC380', 'Se9LCtr', 1);

-- BCC381 - FOD3 - 29/11/2025 11:09
SELECT create_order_with_items('BCC381', 'FOD3', '2025-11-29', '11:09:00');
SELECT add_order_item('BCC381', 'Se9LOVR', 1);

-- BCC382 - FOD66 - 28/11/2025 11:14
SELECT create_order_with_items('BCC382', 'FOD66', '2025-11-28', '11:14:00');
SELECT add_order_item('BCC382', 'Se9LONFG', 20);
SELECT add_order_item('BCC382', 'Se9LOTR', 4);
SELECT add_order_item('BCC382', 'Se9LOVR', 6);
SELECT add_order_item('BCC382', 'Se9LOVD', 4);
SELECT add_order_item('BCC382', 'Se9LOVBCa', 10);
SELECT add_order_item('BCC382', 'Se9LCtr', 4);
SELECT add_order_item('BCC382', 'Se9LHr', 3);

-- BCC383 - AUT48 - 29/11/2025 11:28
SELECT create_order_with_items('BCC383', 'AUT48', '2025-11-29', '11:28:00');
SELECT add_order_item('BCC383', 'Se9LONFG', 1);
SELECT add_order_item('BCC383', 'Se9LOVE', 1);
SELECT add_order_item('BCC383', 'Se9LOTR', 1);
SELECT add_order_item('BCC383', 'Se9LCtr', 1);

-- BCC384 - AUT55 - 29/11/2025 11:32
SELECT create_order_with_items('BCC384', 'AUT55', '2025-11-29', '11:32:00');
SELECT add_order_item('BCC384', 'Se9LOVE', 5);
SELECT add_order_item('BCC384', 'Se9LOTR', 5);
SELECT add_order_item('BCC384', 'Se9LONFG', 3);
SELECT add_order_item('BCC384', 'Se9LCtr', 5);
SELECT add_order_item('BCC384', 'Se9LHr', 2);

-- BCC385 - FOD4 - 02/12/2025 15:03
SELECT create_order_with_items('BCC385', 'FOD4', '2025-12-02', '15:03:00');
SELECT add_order_item('BCC385', 'Se9LOVR', 1);
SELECT add_order_item('BCC385', 'Se9LHr', 1);

-- BCC386 - DEP29 - 03/12/2025 16:40
SELECT create_order_with_items('BCC386', 'DEP29', '2025-12-03', '16:40:00');
SELECT add_order_item('BCC386', 'Se11LOVE', 12);
SELECT add_order_item('BCC386', 'Se11LOTR', 6);
SELECT add_order_item('BCC386', 'Se11LOVCaB', 6);
SELECT add_order_item('BCC386', 'Se11LONFG', 6);
SELECT add_order_item('BCC386', 'Se11LOVD', 6);
SELECT add_order_item('BCC386', 'Se11LCtr', 7);
SELECT add_order_item('BCC386', 'Se11LOVR', 5);
SELECT add_order_item('BCC386', 'Se9LHr', 12);

-- BCC387 - FOD3 - 08/12/2025 11:27
SELECT create_order_with_items('BCC387', 'FOD3', '2025-12-08', '11:27:00');
SELECT add_order_item('BCC387', 'Se9LONFG', 2);
SELECT add_order_item('BCC387', 'Se9LOVR', 1);
SELECT add_order_item('BCC387', 'Se9LCtr', 2);

-- BCC388 - FOD3 - 03/12/2025 11:34
SELECT create_order_with_items('BCC388', 'FOD3', '2025-12-03', '11:34:00');
SELECT add_order_item('BCC388', 'AUT', 3);

-- BCC389 - AUT48 - 03/12/2025 11:37
SELECT create_order_with_items('BCC389', 'AUT48', '2025-12-03', '11:37:00');
SELECT add_order_item('BCC389', 'Se9LONFG', 1);
SELECT add_order_item('BCC389', 'Se9LOVE', 1);
SELECT add_order_item('BCC389', 'Se9LOTR', 1);

-- BCC390 - AUT55 - 04/12/2025 11:40
SELECT create_order_with_items('BCC390', 'AUT55', '2025-12-04', '11:40:00');
SELECT add_order_item('BCC390', 'Se9LOVR', 4);

-- BCC391 - DEP29 - 09/12/2025 13:49
SELECT create_order_with_items('BCC391', 'DEP29', '2025-12-09', '13:49:00', 'delivered');
SELECT add_order_item('BCC391', 'Se11LOVE', 20);
SELECT add_order_item('BCC391', 'Se11LOVCaB', 5);
SELECT add_order_item('BCC391', 'Se11LOTR', 9);
SELECT add_order_item('BCC391', 'Se11LONFG', 9);
SELECT add_order_item('BCC391', 'Se11LOVD', 9);
SELECT add_order_item('BCC391', 'Se11LCtr', 8);

-- BCC392 - AUT55 - 08/12/2025 14:11
SELECT create_order_with_items('BCC392', 'AUT55', '2025-12-08', '14:11:00');
SELECT add_order_item('BCC392', 'Se9LOVE', 4);
SELECT add_order_item('BCC392', 'Se9LOTR', 2);
SELECT add_order_item('BCC392', 'Se9LCtr', 4);

-- =====================================================
-- UPDATE ORDER TOTALS
-- =====================================================

UPDATE orders o SET
    total_ht = COALESCE((SELECT SUM(total_ht) FROM order_items WHERE order_id = o.id), 0),
    total_tva = COALESCE((SELECT SUM(total_ht) FROM order_items WHERE order_id = o.id), 0) * 0.20,
    total_ttc = COALESCE((SELECT SUM(total_ht) FROM order_items WHERE order_id = o.id), 0) * 1.20
WHERE total_ht IS NULL OR total_ht = 0;

-- =====================================================
-- CLEANUP HELPER FUNCTIONS
-- =====================================================

DROP FUNCTION IF EXISTS create_order_with_items(TEXT, TEXT, DATE, TIME, TEXT);
DROP FUNCTION IF EXISTS add_order_item(TEXT, TEXT, INT);

-- =====================================================
-- VERIFICATION
-- =====================================================

SELECT 'Migration 005 completed: ' || COUNT(*) || ' orders created, ' ||
       (SELECT COUNT(*) FROM order_items) || ' order items' as status
FROM orders;
