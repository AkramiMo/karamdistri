-- Fix all foreign key constraints to allow deletion
-- Using SET NULL to preserve historical data

-- ============================================
-- CLIENTS
-- ============================================

-- orders -> clients
ALTER TABLE orders
  DROP CONSTRAINT IF EXISTS orders_client_id_fkey;
ALTER TABLE orders
  ADD CONSTRAINT orders_client_id_fkey
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL;

-- deliveries -> clients
ALTER TABLE deliveries
  DROP CONSTRAINT IF EXISTS deliveries_client_id_fkey;
ALTER TABLE deliveries
  ADD CONSTRAINT deliveries_client_id_fkey
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL;

-- sales -> clients
ALTER TABLE sales
  DROP CONSTRAINT IF EXISTS sales_client_id_fkey;
ALTER TABLE sales
  ADD CONSTRAINT sales_client_id_fkey
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL;

-- ============================================
-- SUPPLIERS (Fournisseurs)
-- ============================================

-- purchase_orders -> suppliers
ALTER TABLE purchase_orders
  DROP CONSTRAINT IF EXISTS purchase_orders_supplier_id_fkey;
ALTER TABLE purchase_orders
  ADD CONSTRAINT purchase_orders_supplier_id_fkey
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL;

-- receptions -> suppliers
ALTER TABLE receptions
  DROP CONSTRAINT IF EXISTS receptions_supplier_id_fkey;
ALTER TABLE receptions
  ADD CONSTRAINT receptions_supplier_id_fkey
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL;

-- ============================================
-- CATEGORIES
-- ============================================

-- articles -> categories
ALTER TABLE articles
  DROP CONSTRAINT IF EXISTS articles_category_id_fkey;
ALTER TABLE articles
  ADD CONSTRAINT articles_category_id_fkey
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL;

-- categories -> categories (parent)
ALTER TABLE categories
  DROP CONSTRAINT IF EXISTS categories_parent_id_fkey;
ALTER TABLE categories
  ADD CONSTRAINT categories_parent_id_fkey
  FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL;

-- ============================================
-- PACKAGINGS (Emballages)
-- ============================================

-- articles -> packagings
ALTER TABLE articles
  DROP CONSTRAINT IF EXISTS articles_packaging_id_fkey;
ALTER TABLE articles
  ADD CONSTRAINT articles_packaging_id_fkey
  FOREIGN KEY (packaging_id) REFERENCES packagings(id) ON DELETE SET NULL;

-- ============================================
-- ORDERS (Commandes)
-- ============================================

-- deliveries -> orders
ALTER TABLE deliveries
  DROP CONSTRAINT IF EXISTS deliveries_order_id_fkey;
ALTER TABLE deliveries
  ADD CONSTRAINT deliveries_order_id_fkey
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL;

-- ============================================
-- DELIVERIES (Livraisons)
-- ============================================

-- sales -> deliveries
ALTER TABLE sales
  DROP CONSTRAINT IF EXISTS sales_delivery_id_fkey;
ALTER TABLE sales
  ADD CONSTRAINT sales_delivery_id_fkey
  FOREIGN KEY (delivery_id) REFERENCES deliveries(id) ON DELETE SET NULL;

-- ============================================
-- PURCHASE ORDERS (Bons de commande)
-- ============================================

-- receptions -> purchase_orders
ALTER TABLE receptions
  DROP CONSTRAINT IF EXISTS receptions_purchase_order_id_fkey;
ALTER TABLE receptions
  ADD CONSTRAINT receptions_purchase_order_id_fkey
  FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE SET NULL;

-- ============================================
-- USERS references
-- ============================================

-- clients -> users (commercial)
ALTER TABLE clients
  DROP CONSTRAINT IF EXISTS clients_commercial_id_fkey;
ALTER TABLE clients
  ADD CONSTRAINT clients_commercial_id_fkey
  FOREIGN KEY (commercial_id) REFERENCES users(id) ON DELETE SET NULL;

-- orders -> users (commercial)
ALTER TABLE orders
  DROP CONSTRAINT IF EXISTS orders_commercial_id_fkey;
ALTER TABLE orders
  ADD CONSTRAINT orders_commercial_id_fkey
  FOREIGN KEY (commercial_id) REFERENCES users(id) ON DELETE SET NULL;

-- deliveries -> users (driver)
ALTER TABLE deliveries
  DROP CONSTRAINT IF EXISTS deliveries_driver_id_fkey;
ALTER TABLE deliveries
  ADD CONSTRAINT deliveries_driver_id_fkey
  FOREIGN KEY (driver_id) REFERENCES users(id) ON DELETE SET NULL;

-- sales -> users
ALTER TABLE sales
  DROP CONSTRAINT IF EXISTS sales_user_id_fkey;
ALTER TABLE sales
  ADD CONSTRAINT sales_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

-- cash_register -> users
ALTER TABLE cash_register
  DROP CONSTRAINT IF EXISTS cash_register_user_id_fkey;
ALTER TABLE cash_register
  ADD CONSTRAINT cash_register_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

-- purchase_orders -> users
ALTER TABLE purchase_orders
  DROP CONSTRAINT IF EXISTS purchase_orders_user_id_fkey;
ALTER TABLE purchase_orders
  ADD CONSTRAINT purchase_orders_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

-- receptions -> users
ALTER TABLE receptions
  DROP CONSTRAINT IF EXISTS receptions_user_id_fkey;
ALTER TABLE receptions
  ADD CONSTRAINT receptions_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

-- stock_movements -> users
ALTER TABLE stock_movements
  DROP CONSTRAINT IF EXISTS stock_movements_user_id_fkey;
ALTER TABLE stock_movements
  ADD CONSTRAINT stock_movements_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
