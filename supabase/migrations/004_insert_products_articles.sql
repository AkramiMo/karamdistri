-- =====================================================
-- Migration 004: Insert Products, Packaging Types, and Articles
-- AKKA Olives & Sauces - Product Catalog
-- =====================================================

-- =====================================================
-- 1. INSERT PRODUCT CATEGORIES
-- =====================================================

INSERT INTO categories (id, name, description, parent_id) VALUES
-- Main categories
(gen_random_uuid(), 'Olives', 'Tous types d''olives', NULL),
(gen_random_uuid(), 'Sauces', 'Sauces et condiments', NULL),
(gen_random_uuid(), 'Légumes', 'Légumes en conserve', NULL),
(gen_random_uuid(), 'Emballages', 'Emballages et contenants', NULL);

-- Get category IDs for subcategories
DO $$
DECLARE
    v_olives_id UUID;
    v_sauces_id UUID;
    v_legumes_id UUID;
BEGIN
    SELECT id INTO v_olives_id FROM categories WHERE name = 'Olives';
    SELECT id INTO v_sauces_id FROM categories WHERE name = 'Sauces';
    SELECT id INTO v_legumes_id FROM categories WHERE name = 'Légumes';

    -- Olive subcategories
    INSERT INTO categories (name, description, parent_id) VALUES
    ('Olives Vertes', 'Olives vertes diverses', v_olives_id),
    ('Olives Noires', 'Olives noires diverses', v_olives_id),
    ('Olives Cocktail', 'Mélanges d''olives', v_olives_id);

    -- Sauce subcategories
    INSERT INTO categories (name, description, parent_id) VALUES
    ('Harissa', 'Sauce piquante harissa', v_sauces_id),
    ('Hot Sauce', 'Sauce piquante', v_sauces_id),
    ('Sauce Pizza', 'Sauce pour pizza', v_sauces_id),
    ('Vinaigre', 'Vinaigres', v_sauces_id);

    -- Vegetable subcategories
    INSERT INTO categories (name, description, parent_id) VALUES
    ('Cornichons', 'Cornichons en conserve', v_legumes_id),
    ('Citrons', 'Citrons confits', v_legumes_id),
    ('Câpres', 'Câpres en conserve', v_legumes_id),
    ('Variante', 'Variété de légumes', v_legumes_id);
END $$;

-- =====================================================
-- 2. INSERT PACKAGING TYPES
-- =====================================================

INSERT INTO packagings (id, name, volume, weight) VALUES
(gen_random_uuid(), 'Bocal 210 ml', 0.210, 0.350),
(gen_random_uuid(), 'Bocal 370 ml', 0.370, 0.550),
(gen_random_uuid(), 'Bocal 720 ml', 0.720, 1.000),
(gen_random_uuid(), 'Bidon 2L', 2.000, 2.500),
(gen_random_uuid(), 'Bidon 5L', 5.000, 6.000),
(gen_random_uuid(), 'Boite Métallique 5/1', 4.000, 5.000),
(gen_random_uuid(), 'Boite Métallique A10', 3.000, 3.500),
(gen_random_uuid(), 'Sachet 200g', 0.200, 0.220),
(gen_random_uuid(), 'Sachet 500g', 0.500, 0.550),
(gen_random_uuid(), 'Sachet 1kg', 1.000, 1.100),
(gen_random_uuid(), 'Sachet 5kg', 5.000, 5.500),
(gen_random_uuid(), 'Seau 9L', 9.000, 10.000),
(gen_random_uuid(), 'Seau 11L', 11.000, 12.500);

-- =====================================================
-- 3. INSERT ARTICLES
-- =====================================================

DO $$
DECLARE
    -- Packaging IDs
    v_bocal210 UUID;
    v_bocal370 UUID;
    v_bocal720 UUID;
    v_bidon2l UUID;
    v_bidon5l UUID;
    v_bm51 UUID;
    v_bma10 UUID;
    v_sachet500 UUID;
    v_sachet1kg UUID;
    v_sachet5kg UUID;
    v_seau9l UUID;
    v_seau11l UUID;
    -- Category IDs
    v_cat_olives UUID;
    v_cat_sauces UUID;
    v_cat_legumes UUID;
BEGIN
    -- Get packaging IDs
    SELECT id INTO v_bocal210 FROM packagings WHERE name = 'Bocal 210 ml';
    SELECT id INTO v_bocal370 FROM packagings WHERE name = 'Bocal 370 ml';
    SELECT id INTO v_bocal720 FROM packagings WHERE name = 'Bocal 720 ml';
    SELECT id INTO v_bidon2l FROM packagings WHERE name = 'Bidon 2L';
    SELECT id INTO v_bidon5l FROM packagings WHERE name = 'Bidon 5L';
    SELECT id INTO v_bm51 FROM packagings WHERE name = 'Boite Métallique 5/1';
    SELECT id INTO v_bma10 FROM packagings WHERE name = 'Boite Métallique A10';
    SELECT id INTO v_sachet500 FROM packagings WHERE name = 'Sachet 500g';
    SELECT id INTO v_sachet1kg FROM packagings WHERE name = 'Sachet 1kg';
    SELECT id INTO v_sachet5kg FROM packagings WHERE name = 'Sachet 5kg';
    SELECT id INTO v_seau9l FROM packagings WHERE name = 'Seau 9L';
    SELECT id INTO v_seau11l FROM packagings WHERE name = 'Seau 11L';

    -- Get category IDs
    SELECT id INTO v_cat_olives FROM categories WHERE name = 'Olives';
    SELECT id INTO v_cat_sauces FROM categories WHERE name = 'Sauces';
    SELECT id INTO v_cat_legumes FROM categories WHERE name = 'Légumes';

    -- =====================================================
    -- BIDONS (2L & 5L)
    -- =====================================================
    INSERT INTO articles (code, name, description, category_id, unit, price_ht, tva_rate, weight_net, packaging_id, is_active) VALUES
    ('Bi2LHS', 'Bidon 2 L Hot Sauce', '2 kg Hot Sauce', v_cat_sauces, 'unité', 20.00, 20.00, 2.000, v_bidon2l, true),
    ('Bi5LHr', 'Bidon 5 L Harissa', '5,5 kg Harissa', v_cat_sauces, 'unité', 0.00, 20.00, 5.500, v_bidon5l, true),
    ('Bi5LVi', 'Bidon 5 L Vinaigre', '5 L Vinaigre', v_cat_sauces, 'unité', 0.00, 20.00, 5.000, v_bidon5l, true);

    -- =====================================================
    -- BOCAUX 210 ML
    -- =====================================================
    INSERT INTO articles (code, name, description, category_id, unit, price_ht, tva_rate, weight_net, packaging_id, is_active) VALUES
    ('Bo210Cor', 'Bocal 210 ml Cornichon', '100 g Cornichon', v_cat_legumes, 'unité', 0.00, 20.00, 0.100, v_bocal210, true),
    ('Bo210Hr', 'Bocal 210 ml Harissa', '200 g Harissa', v_cat_sauces, 'unité', 0.00, 20.00, 0.200, v_bocal210, true),
    ('Bo210Cap', 'Bocal 210 ml Câpres', '120 g Câpres', v_cat_legumes, 'unité', 0.00, 20.00, 0.120, v_bocal210, true);

    -- =====================================================
    -- BOCAUX 370 ML
    -- =====================================================
    INSERT INTO articles (code, name, description, category_id, unit, price_ht, tva_rate, weight_net, packaging_id, is_active) VALUES
    ('Bo370Cor', 'Bocal 370 ml Cornichon', '200 g Cornichon', v_cat_legumes, 'unité', 0.00, 20.00, 0.200, v_bocal370, true),
    ('Bo370Hr', 'Bocal 370 ml Harissa', '360 g Harissa', v_cat_sauces, 'unité', 0.00, 20.00, 0.360, v_bocal370, true),
    ('Bo370ONR', 'Bocal 370 ml Olive Noire Rondelle', '180 g Olive Noire Rondelle', v_cat_olives, 'unité', 0.00, 20.00, 0.180, v_bocal370, true),
    ('Bo370OVR', 'Bocal 370 ml Olive Verte Rondelle', '180 g Olive Verte Rondelle', v_cat_olives, 'unité', 0.00, 20.00, 0.180, v_bocal370, true),
    ('Bo370SPi', 'Bocal 370 ml Sauce Pizza', '350 g Sauce Pizza', v_cat_sauces, 'unité', 0.00, 20.00, 0.350, v_bocal370, true),
    ('Bo370Cap', 'Bocal 370 ml Câpres', '230 g Câpres', v_cat_legumes, 'unité', 0.00, 20.00, 0.230, v_bocal370, true);

    -- =====================================================
    -- BOCAUX 720 ML
    -- =====================================================
    INSERT INTO articles (code, name, description, category_id, unit, price_ht, tva_rate, weight_net, packaging_id, is_active) VALUES
    ('Bo720Cor', 'Bocal 720 ml Cornichon', '400 g Cornichon', v_cat_legumes, 'unité', 0.00, 20.00, 0.400, v_bocal720, true),
    ('Bo720OVD', 'Bocal 720 ml Olive Verte Dénoyautée', '380 g Olive Verte Dénoyautée', v_cat_olives, 'unité', 0.00, 20.00, 0.380, v_bocal720, true),
    ('Bo720Cap', 'Bocal 720 ml Câpres', '400 g Câpres', v_cat_legumes, 'unité', 0.00, 20.00, 0.400, v_bocal720, true);

    -- =====================================================
    -- BOITES METALLIQUES 5/1
    -- =====================================================
    INSERT INTO articles (code, name, description, category_id, unit, price_ht, tva_rate, weight_net, packaging_id, is_active) VALUES
    ('BM51Cap', 'Boite Métallique 5/1 Câpres', '2,5 kg Câpres', v_cat_legumes, 'unité', 0.00, 20.00, 2.500, v_bm51, true),
    ('BM51Cor', 'Boite Métallique 5/1 Cornichon', '2,1 kg Cornichon', v_cat_legumes, 'unité', 46.00, 20.00, 2.100, v_bm51, true),
    ('BM51CorR', 'Boite Métallique 5/1 Cornichon Rondelle', '2,1 kg Cornichon', v_cat_legumes, 'unité', 0.00, 20.00, 2.100, v_bm51, true),
    ('BM51ONE', 'Boite Métallique 5/1 Olive Noire Entière', '2,75 kg Olive Noire Entière', v_cat_olives, 'unité', 72.00, 20.00, 2.750, v_bm51, true),
    ('BM51SPi', 'Boite Métallique 5/1 Sauce Pizza', '4,5 kg Sauce Pizza', v_cat_sauces, 'unité', 0.00, 20.00, 4.500, v_bm51, true);

    -- =====================================================
    -- BOITES METALLIQUES A10
    -- =====================================================
    INSERT INTO articles (code, name, description, category_id, unit, price_ht, tva_rate, weight_net, packaging_id, is_active) VALUES
    ('BMA10Cor', 'Boite Métallique A10 Cornichon', '1,5 kg Cornichon', v_cat_legumes, 'unité', 35.00, 20.00, 1.500, v_bma10, true),
    ('BMA10ONR', 'Boite Métallique A10 Olive Noire Rondelle', '1,5 kg Olive Noire Rondelle', v_cat_olives, 'unité', 0.00, 20.00, 1.500, v_bma10, true),
    ('BMA10OVR', 'Boite Métallique A10 Olive Verte Rondelle', '1,5 kg Olive Verte Rondelle', v_cat_olives, 'unité', 47.00, 20.00, 1.500, v_bma10, true);

    -- =====================================================
    -- SACHETS SOUS VIDE
    -- =====================================================
    INSERT INTO articles (code, name, description, category_id, unit, price_ht, tva_rate, weight_net, packaging_id, is_active) VALUES
    ('SaONBr500', 'Sachet sous vide Olive Noire Brisure 500 g', '500 g Olive Noire Brisure', v_cat_olives, 'unité', 0.00, 20.00, 0.500, v_sachet500, true),
    ('SaONBr1', 'Sachet sous vide Olive Noire Brisure 1 kg', '1 kg Olive Noire Brisure', v_cat_olives, 'unité', 0.00, 20.00, 1.000, v_sachet1kg, true),
    ('SaONBr5', 'Sachet sous vide Olive Noire Brisure 5 kg', '5 kg Olive Noire Brisure', v_cat_olives, 'unité', 0.00, 20.00, 5.000, v_sachet5kg, true),
    ('SaCorP5', 'Sachet sous vide Cornichon 5 Pièces', '100 g Cornichon', v_cat_legumes, 'unité', 0.00, 20.00, 0.100, NULL, true),
    ('SaCtrP2', 'Sachet sous vide Citron 2 Pièces', '270 g Citron', v_cat_legumes, 'unité', 0.00, 20.00, 0.270, NULL, true),
    ('SaSPi5', '5 kg Sachet Sauce Pizza', '5 kg Sachet sous vide Hot Sauce', v_cat_sauces, 'unité', 78.00, 20.00, 5.000, v_sachet5kg, true);

    -- =====================================================
    -- SEAUX 9L
    -- =====================================================
    INSERT INTO articles (code, name, description, category_id, unit, price_ht, tva_rate, weight_net, packaging_id, is_active) VALUES
    ('Se9LCor', 'Seau 9 L Cornichon', '5 kg Cornichon', v_cat_legumes, 'unité', 147.01, 20.00, 5.000, v_seau9l, true),
    ('Se9LHr', 'Seau 9 L Harissa', '5 kg Harissa', v_cat_sauces, 'unité', 40.00, 20.00, 5.000, v_seau9l, true),
    ('Se9LCtr', 'Seau 9 L Citron', '5 kg Citron', v_cat_legumes, 'unité', 40.00, 20.00, 5.000, v_seau9l, true),
    ('Se9LOCkt', 'Seau 9 L Olive Cocktail', '5 kg Olive Cocktail', v_cat_olives, 'unité', 95.00, 20.00, 5.000, v_seau9l, true),
    ('Se9LOCktM', 'Seau 9 L Olive Cocktail Mariné', '5 kg Olive Cocktail Mariné', v_cat_olives, 'unité', 95.00, 20.00, 5.000, v_seau9l, true),
    ('Se9LONB', 'Seau 9 L Olive Noire Brisure', '5 kg Olive Noire Brisure', v_cat_olives, 'unité', 0.00, 20.00, 5.000, v_seau9l, true),
    ('Se9LONR', 'Seau 9 L Olive Noire Rondelle', '5 kg Olive Noire Rondelle', v_cat_olives, 'unité', 0.00, 20.00, 5.000, v_seau9l, true),
    ('Se9LOND', 'Seau 9 L Olive Noire Dénoyautée', '5 kg Olive Noire Dénoyautée', v_cat_olives, 'unité', 0.00, 20.00, 5.000, v_seau9l, true),
    ('Se9LOTR', 'Seau 9 L Olive Tournante Rouge', '5 kg Olive Tournante Rouge', v_cat_olives, 'unité', 105.00, 20.00, 5.000, v_seau9l, true),
    ('Se9LOVCa', 'Seau 9 L Olive Verte Cassée', '5 kg Olive Verte Cassée', v_cat_olives, 'unité', 95.00, 20.00, 5.000, v_seau9l, true),
    ('Se9LOVBCa', 'Seau 9 L Olive Verte Beldi Cassée', '5 kg Olive Verte Beldi Cassée', v_cat_olives, 'unité', 95.00, 20.00, 5.000, v_seau9l, true),
    ('Se9LOVD', 'Seau 9 L Olive Verte Dénoyautée', '5 kg Olive Verte Dénoyautée', v_cat_olives, 'unité', 130.00, 20.00, 5.000, v_seau9l, true),
    ('Se9LOVE', 'Seau 9 L Olive Verte Entière', '5 kg Olive Verte Entière', v_cat_olives, 'unité', 105.00, 20.00, 5.000, v_seau9l, true),
    ('Se9LOVET', 'Seau 9 L Olive Verte Entière Thym', '5 kg Olive Verte Entière Thym', v_cat_olives, 'unité', 105.00, 20.00, 5.000, v_seau9l, true),
    ('Se9LOVR', 'Seau 9 L Olive Verte Rondelle', '5 kg Olive Verte Rondelle', v_cat_olives, 'unité', 130.00, 20.00, 5.000, v_seau9l, true),
    ('Se9LONFG', 'Seau 9 L Olive Noire Façon Grèce', '5 kg Olive Noire Façon Grèce', v_cat_olives, 'unité', 140.00, 20.00, 5.000, v_seau9l, true),
    ('Se9LVar', 'Seau 9L Variété de légumes', '5 kg Variété de légumes', v_cat_legumes, 'unité', 70.00, 20.00, 5.000, v_seau9l, true);

    -- =====================================================
    -- SEAUX 11L
    -- =====================================================
    INSERT INTO articles (code, name, description, category_id, unit, price_ht, tva_rate, weight_net, packaging_id, is_active) VALUES
    ('Se11LOVE', 'Seau 11 L Olive Verte Entière', '7 kg Olive Verte Entière', v_cat_olives, 'unité', 205.47, 20.00, 7.000, v_seau11l, true),
    ('Se11LOTR', 'Seau 11 L Olive Tournante Rouge', '7 kg Olive Tournante Rouge', v_cat_olives, 'unité', 205.47, 20.00, 7.000, v_seau11l, true),
    ('Se11LOVD', 'Seau 11 L Olive Noire Dénoyautée', '7 kg Olive Noire Dénoyautée', v_cat_olives, 'unité', 233.21, 20.00, 7.000, v_seau11l, true),
    ('Se11LONFG', 'Seau 11 L Olive Noire Façon Grèce', '8 kg Olive Noire Façon Grèce', v_cat_olives, 'unité', 273.01, 20.00, 8.000, v_seau11l, true),
    ('Se11LCtr', 'Seau 11 L Citron', '7 kg Citron', v_cat_legumes, 'unité', 89.69, 20.00, 7.000, v_seau11l, true),
    ('Se11LOVCaB', 'Seau 11 L Olive Verte Cassée Beldi', '8 kg Olive Verte Cassée Beldi', v_cat_olives, 'unité', 225.84, 20.00, 8.000, v_seau11l, true),
    ('Se11LOVR', 'Seau 11 L Olive Verte Rondelle', '7 kg Olive Verte Rondelle', v_cat_olives, 'unité', 200.00, 20.00, 7.000, v_seau11l, true);

    -- =====================================================
    -- EMBALLAGES / AUTRES
    -- =====================================================
    INSERT INTO articles (code, name, description, category_id, unit, price_ht, tva_rate, weight_net, packaging_id, is_active) VALUES
    ('Seau9L', 'Emballage seau 9 L', 'Emballage seau 9 L', NULL, 'unité', 15.00, 20.00, 0.500, NULL, true),
    ('AUT', 'Autre', 'AUTRE', NULL, 'unité', 0.00, 20.00, 0.000, NULL, true),
    ('AUT-ONFG', 'Olive Noire Façon Grèce (Vrac)', 'Olive Noire Façon Grèce', v_cat_olives, 'kg', 30.00, 20.00, 1.000, NULL, true),
    ('AUT-Ctr', 'Citron (Vrac)', 'Citron', v_cat_legumes, 'kg', 9.00, 20.00, 1.000, NULL, true),
    ('AUT-OTR', 'Olive Tournante Rouge (Vrac)', 'Olive Tournante Rouge', v_cat_olives, 'kg', 23.00, 20.00, 1.000, NULL, true),
    ('AUT-OVD', 'Olive Verte Dénoyautée (Vrac)', 'Olive Verte Dénoyautée', v_cat_olives, 'kg', 28.00, 20.00, 1.000, NULL, true),
    ('AUT-ONR', 'Olive Noire Rondelle (Vrac)', 'Olive Noire Rondelle', v_cat_olives, 'kg', 45.00, 20.00, 1.000, NULL, true),
    ('AUT-OVE', 'Olive Verte Entière (Vrac)', 'Olive Verte Entière', v_cat_olives, 'kg', 23.00, 20.00, 1.000, NULL, true),
    ('AUT-OCKtM', 'Olive Cocktail Mariné (Vrac)', 'Olive Cocktail Mariné', v_cat_olives, 'kg', 22.00, 20.00, 1.000, NULL, true);

END $$;

-- =====================================================
-- 4. INSERT INITIAL STOCK FOR ALL ARTICLES
-- =====================================================

INSERT INTO stock (article_id, quantity, warehouse)
SELECT id, 0, 'principal'
FROM articles
WHERE NOT EXISTS (
    SELECT 1 FROM stock WHERE stock.article_id = articles.id
);

-- =====================================================
-- 5. VERIFICATION
-- =====================================================
-- Note: RLS policies are managed in 003_fix_rls_policies.sql
-- Run that script if you have permission issues

SELECT 'Migration 004 completed: ' || COUNT(*) || ' articles inserted' FROM articles;
