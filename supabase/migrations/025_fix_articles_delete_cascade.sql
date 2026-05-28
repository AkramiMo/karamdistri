-- Fix foreign key constraints on articles to allow deletion
-- Using SET NULL to preserve historical data in orders, deliveries, etc.

-- order_items: allow article deletion
ALTER TABLE order_items
  DROP CONSTRAINT IF EXISTS order_items_article_id_fkey;
ALTER TABLE order_items
  ADD CONSTRAINT order_items_article_id_fkey
  FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE SET NULL;

-- delivery_items: allow article deletion
ALTER TABLE delivery_items
  DROP CONSTRAINT IF EXISTS delivery_items_article_id_fkey;
ALTER TABLE delivery_items
  ADD CONSTRAINT delivery_items_article_id_fkey
  FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE SET NULL;

-- stock_movements: allow article deletion
ALTER TABLE stock_movements
  DROP CONSTRAINT IF EXISTS stock_movements_article_id_fkey;
ALTER TABLE stock_movements
  ADD CONSTRAINT stock_movements_article_id_fkey
  FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE SET NULL;

-- purchase_order_items: allow article deletion
ALTER TABLE purchase_order_items
  DROP CONSTRAINT IF EXISTS purchase_order_items_article_id_fkey;
ALTER TABLE purchase_order_items
  ADD CONSTRAINT purchase_order_items_article_id_fkey
  FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE SET NULL;

-- reception_items: allow article deletion
ALTER TABLE reception_items
  DROP CONSTRAINT IF EXISTS reception_items_article_id_fkey;
ALTER TABLE reception_items
  ADD CONSTRAINT reception_items_article_id_fkey
  FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE SET NULL;
