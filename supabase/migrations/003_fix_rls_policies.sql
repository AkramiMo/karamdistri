-- Fix RLS policies to allow authenticated users to read all data
-- Execute this script if data is not showing up

-- Option 1: Create permissive policies for all tables (recommended for development)

-- Drop existing restrictive policies if they exist
DROP POLICY IF EXISTS "Users can view clients" ON clients;
DROP POLICY IF EXISTS "Users can insert clients" ON clients;
DROP POLICY IF EXISTS "Users can update clients" ON clients;
DROP POLICY IF EXISTS "Users can delete clients" ON clients;

DROP POLICY IF EXISTS "Users can view articles" ON articles;
DROP POLICY IF EXISTS "Users can insert articles" ON articles;
DROP POLICY IF EXISTS "Users can update articles" ON articles;
DROP POLICY IF EXISTS "Users can delete articles" ON articles;

DROP POLICY IF EXISTS "Users can view orders" ON orders;
DROP POLICY IF EXISTS "Users can view deliveries" ON deliveries;
DROP POLICY IF EXISTS "Users can view sales" ON sales;
DROP POLICY IF EXISTS "Users can view stock" ON stock;
DROP POLICY IF EXISTS "Users can view suppliers" ON suppliers;
DROP POLICY IF EXISTS "Users can view purchase_orders" ON purchase_orders;
DROP POLICY IF EXISTS "Users can view cash_register" ON cash_register;

-- Create permissive read policies for authenticated users
CREATE POLICY "Allow authenticated read clients" ON clients
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert clients" ON clients
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated update clients" ON clients
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated delete clients" ON clients
  FOR DELETE TO authenticated USING (true);

-- Articles
CREATE POLICY "Allow authenticated read articles" ON articles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert articles" ON articles
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated update articles" ON articles
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated delete articles" ON articles
  FOR DELETE TO authenticated USING (true);

-- Orders
CREATE POLICY "Allow authenticated read orders" ON orders
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert orders" ON orders
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated update orders" ON orders
  FOR UPDATE TO authenticated USING (true);

-- Deliveries
CREATE POLICY "Allow authenticated read deliveries" ON deliveries
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert deliveries" ON deliveries
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated update deliveries" ON deliveries
  FOR UPDATE TO authenticated USING (true);

-- Sales
CREATE POLICY "Allow authenticated read sales" ON sales
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert sales" ON sales
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated update sales" ON sales
  FOR UPDATE TO authenticated USING (true);

-- Stock
CREATE POLICY "Allow authenticated read stock" ON stock
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert stock" ON stock
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated update stock" ON stock
  FOR UPDATE TO authenticated USING (true);

-- Stock Movements
CREATE POLICY "Allow authenticated read stock_movements" ON stock_movements
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert stock_movements" ON stock_movements
  FOR INSERT TO authenticated WITH CHECK (true);

-- Suppliers
CREATE POLICY "Allow authenticated read suppliers" ON suppliers
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert suppliers" ON suppliers
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated update suppliers" ON suppliers
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated delete suppliers" ON suppliers
  FOR DELETE TO authenticated USING (true);

-- Purchase Orders
CREATE POLICY "Allow authenticated read purchase_orders" ON purchase_orders
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert purchase_orders" ON purchase_orders
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated update purchase_orders" ON purchase_orders
  FOR UPDATE TO authenticated USING (true);

-- Cash Register
CREATE POLICY "Allow authenticated read cash_register" ON cash_register
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert cash_register" ON cash_register
  FOR INSERT TO authenticated WITH CHECK (true);

-- Order Items
CREATE POLICY "Allow authenticated read order_items" ON order_items
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert order_items" ON order_items
  FOR INSERT TO authenticated WITH CHECK (true);

-- Delivery Items
CREATE POLICY "Allow authenticated read delivery_items" ON delivery_items
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert delivery_items" ON delivery_items
  FOR INSERT TO authenticated WITH CHECK (true);

-- Categories
CREATE POLICY "Allow authenticated read categories" ON categories
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert categories" ON categories
  FOR INSERT TO authenticated WITH CHECK (true);

-- Also allow anon access for public data (optional, for testing)
CREATE POLICY "Allow anon read clients" ON clients
  FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anon read articles" ON articles
  FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anon read suppliers" ON suppliers
  FOR SELECT TO anon USING (true);
