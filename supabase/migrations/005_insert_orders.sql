-- =====================================================
-- Migration 005: Insert Sample Orders
-- AKKA Olives & Sauces - Commandes
-- =====================================================

-- Create orders from the provided data
DO $$
DECLARE
    v_client_id UUID;
    v_order_id UUID;
    v_article_id UUID;
    v_order_date DATE;
    v_total_ht DECIMAL(12,2);
BEGIN
    -- =====================================================
    -- BCC355 - DEP29 - 10/11/2025
    -- =====================================================
    SELECT id INTO v_client_id FROM clients WHERE code = 'DEP29';
    IF v_client_id IS NOT NULL THEN
        INSERT INTO orders (id, order_number, client_id, status, order_date, notes, created_at)
        VALUES (gen_random_uuid(), 'BCC355', v_client_id, 'confirmed', '2025-11-10', '60 articles', '2025-11-10 15:02:00')
        RETURNING id INTO v_order_id;

        -- Order items
        SELECT id INTO v_article_id FROM articles WHERE code = 'Se11LOVD';
        IF v_article_id IS NOT NULL THEN
            INSERT INTO order_items (order_id, article_id, quantity, unit_price, total_ht)
            VALUES (v_order_id, v_article_id, 15, 233.21, 15 * 233.21);
        END IF;

        SELECT id INTO v_article_id FROM articles WHERE code = 'Se11LOTR';
        IF v_article_id IS NOT NULL THEN
            INSERT INTO order_items (order_id, article_id, quantity, unit_price, total_ht)
            VALUES (v_order_id, v_article_id, 15, 205.47, 15 * 205.47);
        END IF;

        SELECT id INTO v_article_id FROM articles WHERE code = 'Se11LOVE';
        IF v_article_id IS NOT NULL THEN
            INSERT INTO order_items (order_id, article_id, quantity, unit_price, total_ht)
            VALUES (v_order_id, v_article_id, 18, 205.47, 18 * 205.47);
        END IF;

        SELECT id INTO v_article_id FROM articles WHERE code = 'Se9LHr';
        IF v_article_id IS NOT NULL THEN
            INSERT INTO order_items (order_id, article_id, quantity, unit_price, total_ht)
            VALUES (v_order_id, v_article_id, 2, 40.00, 2 * 40.00);
        END IF;

        SELECT id INTO v_article_id FROM articles WHERE code = 'Se9LCor';
        IF v_article_id IS NOT NULL THEN
            INSERT INTO order_items (order_id, article_id, quantity, unit_price, total_ht)
            VALUES (v_order_id, v_article_id, 5, 147.01, 5 * 147.01);
        END IF;

        SELECT id INTO v_article_id FROM articles WHERE code = 'Se9LVar';
        IF v_article_id IS NOT NULL THEN
            INSERT INTO order_items (order_id, article_id, quantity, unit_price, total_ht)
            VALUES (v_order_id, v_article_id, 5, 70.00, 5 * 70.00);
        END IF;

        -- Update order total
        UPDATE orders SET total_ht = (SELECT SUM(total_ht) FROM order_items WHERE order_id = v_order_id),
                         total_tva = (SELECT SUM(total_ht) FROM order_items WHERE order_id = v_order_id) * 0.20,
                         total_ttc = (SELECT SUM(total_ht) FROM order_items WHERE order_id = v_order_id) * 1.20
        WHERE id = v_order_id;
    END IF;

    -- =====================================================
    -- BCC356 - AUT48 - 03/11/2025
    -- =====================================================
    SELECT id INTO v_client_id FROM clients WHERE code = 'AUT48';
    IF v_client_id IS NOT NULL THEN
        INSERT INTO orders (id, order_number, client_id, status, order_date, notes, created_at)
        VALUES (gen_random_uuid(), 'BCC356', v_client_id, 'confirmed', '2025-11-03', '3 articles', '2025-11-03 13:22:00')
        RETURNING id INTO v_order_id;

        SELECT id INTO v_article_id FROM articles WHERE code = 'Se9LOVE';
        IF v_article_id IS NOT NULL THEN
            INSERT INTO order_items (order_id, article_id, quantity, unit_price, total_ht)
            VALUES (v_order_id, v_article_id, 1, 105.00, 105.00);
        END IF;

        SELECT id INTO v_article_id FROM articles WHERE code = 'Se9LOTR';
        IF v_article_id IS NOT NULL THEN
            INSERT INTO order_items (order_id, article_id, quantity, unit_price, total_ht)
            VALUES (v_order_id, v_article_id, 1, 105.00, 105.00);
        END IF;

        SELECT id INTO v_article_id FROM articles WHERE code = 'Se9LONFG';
        IF v_article_id IS NOT NULL THEN
            INSERT INTO order_items (order_id, article_id, quantity, unit_price, total_ht)
            VALUES (v_order_id, v_article_id, 1, 140.00, 140.00);
        END IF;

        UPDATE orders SET total_ht = (SELECT COALESCE(SUM(total_ht), 0) FROM order_items WHERE order_id = v_order_id),
                         total_tva = (SELECT COALESCE(SUM(total_ht), 0) FROM order_items WHERE order_id = v_order_id) * 0.20,
                         total_ttc = (SELECT COALESCE(SUM(total_ht), 0) FROM order_items WHERE order_id = v_order_id) * 1.20
        WHERE id = v_order_id;
    END IF;

    -- =====================================================
    -- BCC357 - FOD9 - 05/11/2025
    -- =====================================================
    SELECT id INTO v_client_id FROM clients WHERE code = 'FOD9';
    IF v_client_id IS NOT NULL THEN
        INSERT INTO orders (id, order_number, client_id, status, order_date, notes, created_at)
        VALUES (gen_random_uuid(), 'BCC357', v_client_id, 'confirmed', '2025-11-05', '4 articles', '2025-11-05 13:33:00')
        RETURNING id INTO v_order_id;

        SELECT id INTO v_article_id FROM articles WHERE code = 'Se9LCor';
        IF v_article_id IS NOT NULL THEN
            INSERT INTO order_items (order_id, article_id, quantity, unit_price, total_ht)
            VALUES (v_order_id, v_article_id, 4, 147.01, 4 * 147.01);
        END IF;

        UPDATE orders SET total_ht = (SELECT COALESCE(SUM(total_ht), 0) FROM order_items WHERE order_id = v_order_id),
                         total_tva = (SELECT COALESCE(SUM(total_ht), 0) FROM order_items WHERE order_id = v_order_id) * 0.20,
                         total_ttc = (SELECT COALESCE(SUM(total_ht), 0) FROM order_items WHERE order_id = v_order_id) * 1.20
        WHERE id = v_order_id;
    END IF;

    -- =====================================================
    -- BCC358 - AUT55 - 05/11/2025
    -- =====================================================
    SELECT id INTO v_client_id FROM clients WHERE code = 'AUT55';
    IF v_client_id IS NOT NULL THEN
        INSERT INTO orders (id, order_number, client_id, status, order_date, notes, created_at)
        VALUES (gen_random_uuid(), 'BCC358', v_client_id, 'confirmed', '2025-11-05', '13 articles', '2025-11-05 13:45:00')
        RETURNING id INTO v_order_id;

        SELECT id INTO v_article_id FROM articles WHERE code = 'Se9LOVR';
        IF v_article_id IS NOT NULL THEN
            INSERT INTO order_items (order_id, article_id, quantity, unit_price, total_ht)
            VALUES (v_order_id, v_article_id, 1, 130.00, 130.00);
        END IF;

        SELECT id INTO v_article_id FROM articles WHERE code = 'Se9LONR';
        IF v_article_id IS NOT NULL THEN
            INSERT INTO order_items (order_id, article_id, quantity, unit_price, total_ht)
            VALUES (v_order_id, v_article_id, 2, 0.00, 0.00);
        END IF;

        SELECT id INTO v_article_id FROM articles WHERE code = 'Se9LONFG';
        IF v_article_id IS NOT NULL THEN
            INSERT INTO order_items (order_id, article_id, quantity, unit_price, total_ht)
            VALUES (v_order_id, v_article_id, 2, 140.00, 280.00);
        END IF;

        SELECT id INTO v_article_id FROM articles WHERE code = 'Se9LOTR';
        IF v_article_id IS NOT NULL THEN
            INSERT INTO order_items (order_id, article_id, quantity, unit_price, total_ht)
            VALUES (v_order_id, v_article_id, 2, 105.00, 210.00);
        END IF;

        SELECT id INTO v_article_id FROM articles WHERE code = 'Se9LOVE';
        IF v_article_id IS NOT NULL THEN
            INSERT INTO order_items (order_id, article_id, quantity, unit_price, total_ht)
            VALUES (v_order_id, v_article_id, 2, 105.00, 210.00);
        END IF;

        SELECT id INTO v_article_id FROM articles WHERE code = 'Se9LHr';
        IF v_article_id IS NOT NULL THEN
            INSERT INTO order_items (order_id, article_id, quantity, unit_price, total_ht)
            VALUES (v_order_id, v_article_id, 2, 40.00, 80.00);
        END IF;

        SELECT id INTO v_article_id FROM articles WHERE code = 'Se9LCtr';
        IF v_article_id IS NOT NULL THEN
            INSERT INTO order_items (order_id, article_id, quantity, unit_price, total_ht)
            VALUES (v_order_id, v_article_id, 2, 40.00, 80.00);
        END IF;

        UPDATE orders SET total_ht = (SELECT COALESCE(SUM(total_ht), 0) FROM order_items WHERE order_id = v_order_id),
                         total_tva = (SELECT COALESCE(SUM(total_ht), 0) FROM order_items WHERE order_id = v_order_id) * 0.20,
                         total_ttc = (SELECT COALESCE(SUM(total_ht), 0) FROM order_items WHERE order_id = v_order_id) * 1.20
        WHERE id = v_order_id;
    END IF;

    -- =====================================================
    -- BCC361 - FOD66 - 04/11/2025 (Large order)
    -- =====================================================
    SELECT id INTO v_client_id FROM clients WHERE code = 'FOD66';
    IF v_client_id IS NOT NULL THEN
        INSERT INTO orders (id, order_number, client_id, status, order_date, notes, created_at)
        VALUES (gen_random_uuid(), 'BCC361', v_client_id, 'confirmed', '2025-11-04', '54 articles', '2025-11-04 14:14:00')
        RETURNING id INTO v_order_id;

        SELECT id INTO v_article_id FROM articles WHERE code = 'Se9LOTR';
        IF v_article_id IS NOT NULL THEN
            INSERT INTO order_items (order_id, article_id, quantity, unit_price, total_ht)
            VALUES (v_order_id, v_article_id, 8, 105.00, 8 * 105.00);
        END IF;

        SELECT id INTO v_article_id FROM articles WHERE code = 'Se9LONFG';
        IF v_article_id IS NOT NULL THEN
            INSERT INTO order_items (order_id, article_id, quantity, unit_price, total_ht)
            VALUES (v_order_id, v_article_id, 20, 140.00, 20 * 140.00);
        END IF;

        SELECT id INTO v_article_id FROM articles WHERE code = 'Se9LOVBCa';
        IF v_article_id IS NOT NULL THEN
            INSERT INTO order_items (order_id, article_id, quantity, unit_price, total_ht)
            VALUES (v_order_id, v_article_id, 8, 95.00, 8 * 95.00);
        END IF;

        SELECT id INTO v_article_id FROM articles WHERE code = 'Se9LOVD';
        IF v_article_id IS NOT NULL THEN
            INSERT INTO order_items (order_id, article_id, quantity, unit_price, total_ht)
            VALUES (v_order_id, v_article_id, 4, 130.00, 4 * 130.00);
        END IF;

        SELECT id INTO v_article_id FROM articles WHERE code = 'Se9LOVR';
        IF v_article_id IS NOT NULL THEN
            INSERT INTO order_items (order_id, article_id, quantity, unit_price, total_ht)
            VALUES (v_order_id, v_article_id, 8, 130.00, 8 * 130.00);
        END IF;

        SELECT id INTO v_article_id FROM articles WHERE code = 'Se9LCtr';
        IF v_article_id IS NOT NULL THEN
            INSERT INTO order_items (order_id, article_id, quantity, unit_price, total_ht)
            VALUES (v_order_id, v_article_id, 10, 40.00, 10 * 40.00);
        END IF;

        UPDATE orders SET total_ht = (SELECT COALESCE(SUM(total_ht), 0) FROM order_items WHERE order_id = v_order_id),
                         total_tva = (SELECT COALESCE(SUM(total_ht), 0) FROM order_items WHERE order_id = v_order_id) * 0.20,
                         total_ttc = (SELECT COALESCE(SUM(total_ht), 0) FROM order_items WHERE order_id = v_order_id) * 1.20
        WHERE id = v_order_id;
    END IF;

    -- =====================================================
    -- BCC365 - FOD9 - 08/11/2025
    -- =====================================================
    SELECT id INTO v_client_id FROM clients WHERE code = 'FOD9';
    IF v_client_id IS NOT NULL THEN
        INSERT INTO orders (id, order_number, client_id, status, order_date, notes, created_at)
        VALUES (gen_random_uuid(), 'BCC365', v_client_id, 'confirmed', '2025-11-08', '14 articles', '2025-11-08 14:34:00')
        RETURNING id INTO v_order_id;

        SELECT id INTO v_article_id FROM articles WHERE code = 'Se9LCor';
        IF v_article_id IS NOT NULL THEN
            INSERT INTO order_items (order_id, article_id, quantity, unit_price, total_ht)
            VALUES (v_order_id, v_article_id, 6, 147.01, 6 * 147.01);
        END IF;

        SELECT id INTO v_article_id FROM articles WHERE code = 'Bi5LHr';
        IF v_article_id IS NOT NULL THEN
            INSERT INTO order_items (order_id, article_id, quantity, unit_price, total_ht)
            VALUES (v_order_id, v_article_id, 8, 0.00, 0.00);
        END IF;

        UPDATE orders SET total_ht = (SELECT COALESCE(SUM(total_ht), 0) FROM order_items WHERE order_id = v_order_id),
                         total_tva = (SELECT COALESCE(SUM(total_ht), 0) FROM order_items WHERE order_id = v_order_id) * 0.20,
                         total_ttc = (SELECT COALESCE(SUM(total_ht), 0) FROM order_items WHERE order_id = v_order_id) * 1.20
        WHERE id = v_order_id;
    END IF;

    -- =====================================================
    -- BCC368 - EPC20 - 15/11/2025
    -- =====================================================
    SELECT id INTO v_client_id FROM clients WHERE code = 'EPC20';
    IF v_client_id IS NOT NULL THEN
        INSERT INTO orders (id, order_number, client_id, status, order_date, notes, created_at)
        VALUES (gen_random_uuid(), 'BCC368', v_client_id, 'confirmed', '2025-11-15', '6 articles', '2025-11-15 17:25:00')
        RETURNING id INTO v_order_id;

        SELECT id INTO v_article_id FROM articles WHERE code = 'Se9LONFG';
        IF v_article_id IS NOT NULL THEN
            INSERT INTO order_items (order_id, article_id, quantity, unit_price, total_ht)
            VALUES (v_order_id, v_article_id, 1, 140.00, 140.00);
        END IF;

        SELECT id INTO v_article_id FROM articles WHERE code = 'Se9LOCktM';
        IF v_article_id IS NOT NULL THEN
            INSERT INTO order_items (order_id, article_id, quantity, unit_price, total_ht)
            VALUES (v_order_id, v_article_id, 1, 95.00, 95.00);
        END IF;

        SELECT id INTO v_article_id FROM articles WHERE code = 'Se9LOVR';
        IF v_article_id IS NOT NULL THEN
            INSERT INTO order_items (order_id, article_id, quantity, unit_price, total_ht)
            VALUES (v_order_id, v_article_id, 1, 130.00, 130.00);
        END IF;

        SELECT id INTO v_article_id FROM articles WHERE code = 'Se9LOVD';
        IF v_article_id IS NOT NULL THEN
            INSERT INTO order_items (order_id, article_id, quantity, unit_price, total_ht)
            VALUES (v_order_id, v_article_id, 1, 130.00, 130.00);
        END IF;

        SELECT id INTO v_article_id FROM articles WHERE code = 'Se9LCtr';
        IF v_article_id IS NOT NULL THEN
            INSERT INTO order_items (order_id, article_id, quantity, unit_price, total_ht)
            VALUES (v_order_id, v_article_id, 1, 40.00, 40.00);
        END IF;

        SELECT id INTO v_article_id FROM articles WHERE code = 'Bi5LHr';
        IF v_article_id IS NOT NULL THEN
            INSERT INTO order_items (order_id, article_id, quantity, unit_price, total_ht)
            VALUES (v_order_id, v_article_id, 1, 0.00, 0.00);
        END IF;

        UPDATE orders SET total_ht = (SELECT COALESCE(SUM(total_ht), 0) FROM order_items WHERE order_id = v_order_id),
                         total_tva = (SELECT COALESCE(SUM(total_ht), 0) FROM order_items WHERE order_id = v_order_id) * 0.20,
                         total_ttc = (SELECT COALESCE(SUM(total_ht), 0) FROM order_items WHERE order_id = v_order_id) * 1.20
        WHERE id = v_order_id;
    END IF;

    -- =====================================================
    -- BCC382 - FOD66 - 28/11/2025 (Large order)
    -- =====================================================
    SELECT id INTO v_client_id FROM clients WHERE code = 'FOD66';
    IF v_client_id IS NOT NULL THEN
        INSERT INTO orders (id, order_number, client_id, status, order_date, notes, created_at)
        VALUES (gen_random_uuid(), 'BCC382', v_client_id, 'confirmed', '2025-11-28', '51 articles', '2025-11-28 11:14:00')
        RETURNING id INTO v_order_id;

        SELECT id INTO v_article_id FROM articles WHERE code = 'Se9LONFG';
        IF v_article_id IS NOT NULL THEN
            INSERT INTO order_items (order_id, article_id, quantity, unit_price, total_ht)
            VALUES (v_order_id, v_article_id, 20, 140.00, 20 * 140.00);
        END IF;

        SELECT id INTO v_article_id FROM articles WHERE code = 'Se9LOTR';
        IF v_article_id IS NOT NULL THEN
            INSERT INTO order_items (order_id, article_id, quantity, unit_price, total_ht)
            VALUES (v_order_id, v_article_id, 4, 105.00, 4 * 105.00);
        END IF;

        SELECT id INTO v_article_id FROM articles WHERE code = 'Se9LOVR';
        IF v_article_id IS NOT NULL THEN
            INSERT INTO order_items (order_id, article_id, quantity, unit_price, total_ht)
            VALUES (v_order_id, v_article_id, 6, 130.00, 6 * 130.00);
        END IF;

        SELECT id INTO v_article_id FROM articles WHERE code = 'Se9LOVD';
        IF v_article_id IS NOT NULL THEN
            INSERT INTO order_items (order_id, article_id, quantity, unit_price, total_ht)
            VALUES (v_order_id, v_article_id, 4, 130.00, 4 * 130.00);
        END IF;

        SELECT id INTO v_article_id FROM articles WHERE code = 'Se9LOVBCa';
        IF v_article_id IS NOT NULL THEN
            INSERT INTO order_items (order_id, article_id, quantity, unit_price, total_ht)
            VALUES (v_order_id, v_article_id, 10, 95.00, 10 * 95.00);
        END IF;

        SELECT id INTO v_article_id FROM articles WHERE code = 'Se9LCtr';
        IF v_article_id IS NOT NULL THEN
            INSERT INTO order_items (order_id, article_id, quantity, unit_price, total_ht)
            VALUES (v_order_id, v_article_id, 4, 40.00, 4 * 40.00);
        END IF;

        SELECT id INTO v_article_id FROM articles WHERE code = 'Se9LHr';
        IF v_article_id IS NOT NULL THEN
            INSERT INTO order_items (order_id, article_id, quantity, unit_price, total_ht)
            VALUES (v_order_id, v_article_id, 3, 40.00, 3 * 40.00);
        END IF;

        UPDATE orders SET total_ht = (SELECT COALESCE(SUM(total_ht), 0) FROM order_items WHERE order_id = v_order_id),
                         total_tva = (SELECT COALESCE(SUM(total_ht), 0) FROM order_items WHERE order_id = v_order_id) * 0.20,
                         total_ttc = (SELECT COALESCE(SUM(total_ht), 0) FROM order_items WHERE order_id = v_order_id) * 1.20
        WHERE id = v_order_id;
    END IF;

    -- =====================================================
    -- BCC386 - DEP29 - 03/12/2025 (Large order)
    -- =====================================================
    SELECT id INTO v_client_id FROM clients WHERE code = 'DEP29';
    IF v_client_id IS NOT NULL THEN
        INSERT INTO orders (id, order_number, client_id, status, order_date, notes, created_at)
        VALUES (gen_random_uuid(), 'BCC386', v_client_id, 'confirmed', '2025-12-03', '60 articles', '2025-12-03 16:40:00')
        RETURNING id INTO v_order_id;

        SELECT id INTO v_article_id FROM articles WHERE code = 'Se11LOVE';
        IF v_article_id IS NOT NULL THEN
            INSERT INTO order_items (order_id, article_id, quantity, unit_price, total_ht)
            VALUES (v_order_id, v_article_id, 12, 205.47, 12 * 205.47);
        END IF;

        SELECT id INTO v_article_id FROM articles WHERE code = 'Se11LOTR';
        IF v_article_id IS NOT NULL THEN
            INSERT INTO order_items (order_id, article_id, quantity, unit_price, total_ht)
            VALUES (v_order_id, v_article_id, 6, 205.47, 6 * 205.47);
        END IF;

        SELECT id INTO v_article_id FROM articles WHERE code = 'Se11LOVCaB';
        IF v_article_id IS NOT NULL THEN
            INSERT INTO order_items (order_id, article_id, quantity, unit_price, total_ht)
            VALUES (v_order_id, v_article_id, 6, 225.84, 6 * 225.84);
        END IF;

        SELECT id INTO v_article_id FROM articles WHERE code = 'Se11LONFG';
        IF v_article_id IS NOT NULL THEN
            INSERT INTO order_items (order_id, article_id, quantity, unit_price, total_ht)
            VALUES (v_order_id, v_article_id, 6, 273.01, 6 * 273.01);
        END IF;

        SELECT id INTO v_article_id FROM articles WHERE code = 'Se11LOVD';
        IF v_article_id IS NOT NULL THEN
            INSERT INTO order_items (order_id, article_id, quantity, unit_price, total_ht)
            VALUES (v_order_id, v_article_id, 6, 233.21, 6 * 233.21);
        END IF;

        SELECT id INTO v_article_id FROM articles WHERE code = 'Se11LCtr';
        IF v_article_id IS NOT NULL THEN
            INSERT INTO order_items (order_id, article_id, quantity, unit_price, total_ht)
            VALUES (v_order_id, v_article_id, 7, 89.69, 7 * 89.69);
        END IF;

        SELECT id INTO v_article_id FROM articles WHERE code = 'Se11LOVR';
        IF v_article_id IS NOT NULL THEN
            INSERT INTO order_items (order_id, article_id, quantity, unit_price, total_ht)
            VALUES (v_order_id, v_article_id, 5, 200.00, 5 * 200.00);
        END IF;

        SELECT id INTO v_article_id FROM articles WHERE code = 'Se9LHr';
        IF v_article_id IS NOT NULL THEN
            INSERT INTO order_items (order_id, article_id, quantity, unit_price, total_ht)
            VALUES (v_order_id, v_article_id, 12, 40.00, 12 * 40.00);
        END IF;

        UPDATE orders SET total_ht = (SELECT COALESCE(SUM(total_ht), 0) FROM order_items WHERE order_id = v_order_id),
                         total_tva = (SELECT COALESCE(SUM(total_ht), 0) FROM order_items WHERE order_id = v_order_id) * 0.20,
                         total_ttc = (SELECT COALESCE(SUM(total_ht), 0) FROM order_items WHERE order_id = v_order_id) * 1.20
        WHERE id = v_order_id;
    END IF;

    -- =====================================================
    -- BCC391 - DEP29 - 09/12/2025 (Large order)
    -- =====================================================
    SELECT id INTO v_client_id FROM clients WHERE code = 'DEP29';
    IF v_client_id IS NOT NULL THEN
        INSERT INTO orders (id, order_number, client_id, status, order_date, notes, created_at)
        VALUES (gen_random_uuid(), 'BCC391', v_client_id, 'delivered', '2025-12-09', '60 articles', '2025-12-09 13:49:00')
        RETURNING id INTO v_order_id;

        SELECT id INTO v_article_id FROM articles WHERE code = 'Se11LOVE';
        IF v_article_id IS NOT NULL THEN
            INSERT INTO order_items (order_id, article_id, quantity, unit_price, total_ht)
            VALUES (v_order_id, v_article_id, 20, 205.47, 20 * 205.47);
        END IF;

        SELECT id INTO v_article_id FROM articles WHERE code = 'Se11LOVCaB';
        IF v_article_id IS NOT NULL THEN
            INSERT INTO order_items (order_id, article_id, quantity, unit_price, total_ht)
            VALUES (v_order_id, v_article_id, 5, 225.84, 5 * 225.84);
        END IF;

        SELECT id INTO v_article_id FROM articles WHERE code = 'Se11LOTR';
        IF v_article_id IS NOT NULL THEN
            INSERT INTO order_items (order_id, article_id, quantity, unit_price, total_ht)
            VALUES (v_order_id, v_article_id, 9, 205.47, 9 * 205.47);
        END IF;

        SELECT id INTO v_article_id FROM articles WHERE code = 'Se11LONFG';
        IF v_article_id IS NOT NULL THEN
            INSERT INTO order_items (order_id, article_id, quantity, unit_price, total_ht)
            VALUES (v_order_id, v_article_id, 9, 273.01, 9 * 273.01);
        END IF;

        SELECT id INTO v_article_id FROM articles WHERE code = 'Se11LOVD';
        IF v_article_id IS NOT NULL THEN
            INSERT INTO order_items (order_id, article_id, quantity, unit_price, total_ht)
            VALUES (v_order_id, v_article_id, 9, 233.21, 9 * 233.21);
        END IF;

        SELECT id INTO v_article_id FROM articles WHERE code = 'Se11LCtr';
        IF v_article_id IS NOT NULL THEN
            INSERT INTO order_items (order_id, article_id, quantity, unit_price, total_ht)
            VALUES (v_order_id, v_article_id, 8, 89.69, 8 * 89.69);
        END IF;

        UPDATE orders SET total_ht = (SELECT COALESCE(SUM(total_ht), 0) FROM order_items WHERE order_id = v_order_id),
                         total_tva = (SELECT COALESCE(SUM(total_ht), 0) FROM order_items WHERE order_id = v_order_id) * 0.20,
                         total_ttc = (SELECT COALESCE(SUM(total_ht), 0) FROM order_items WHERE order_id = v_order_id) * 1.20
        WHERE id = v_order_id;
    END IF;

END $$;

-- =====================================================
-- Add some additional sample orders with different statuses
-- =====================================================

-- Add a draft order
DO $$
DECLARE
    v_client_id UUID;
    v_order_id UUID;
    v_article_id UUID;
BEGIN
    SELECT id INTO v_client_id FROM clients WHERE code = 'FOD3';
    IF v_client_id IS NOT NULL THEN
        INSERT INTO orders (id, order_number, client_id, status, order_date, notes)
        VALUES (gen_random_uuid(), 'BCC400', v_client_id, 'draft', CURRENT_DATE, 'Commande en cours')
        RETURNING id INTO v_order_id;

        SELECT id INTO v_article_id FROM articles WHERE code = 'Se9LOVR';
        IF v_article_id IS NOT NULL THEN
            INSERT INTO order_items (order_id, article_id, quantity, unit_price, total_ht)
            VALUES (v_order_id, v_article_id, 3, 130.00, 3 * 130.00);
        END IF;

        SELECT id INTO v_article_id FROM articles WHERE code = 'Se9LCtr';
        IF v_article_id IS NOT NULL THEN
            INSERT INTO order_items (order_id, article_id, quantity, unit_price, total_ht)
            VALUES (v_order_id, v_article_id, 5, 40.00, 5 * 40.00);
        END IF;

        UPDATE orders SET total_ht = (SELECT COALESCE(SUM(total_ht), 0) FROM order_items WHERE order_id = v_order_id),
                         total_tva = (SELECT COALESCE(SUM(total_ht), 0) FROM order_items WHERE order_id = v_order_id) * 0.20,
                         total_ttc = (SELECT COALESCE(SUM(total_ht), 0) FROM order_items WHERE order_id = v_order_id) * 1.20
        WHERE id = v_order_id;
    END IF;
END $$;

SELECT 'Migration 005 completed: ' || COUNT(*) || ' orders created' FROM orders;
