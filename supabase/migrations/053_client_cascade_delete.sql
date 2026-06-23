-- Permettre la suppression en cascade des clients
-- Toutes les données liées seront supprimées automatiquement

-- ============================================
-- Tables qui référencent clients
-- ============================================

-- delivery_return_items -> delivery_returns (doit être fait en premier)
ALTER TABLE delivery_return_items
  DROP CONSTRAINT IF EXISTS delivery_return_items_return_id_fkey;
ALTER TABLE delivery_return_items
  ADD CONSTRAINT delivery_return_items_return_id_fkey
  FOREIGN KEY (return_id) REFERENCES delivery_returns(id) ON DELETE CASCADE;

-- delivery_returns -> clients
ALTER TABLE delivery_returns
  DROP CONSTRAINT IF EXISTS delivery_returns_client_id_fkey;
ALTER TABLE delivery_returns
  ADD CONSTRAINT delivery_returns_client_id_fkey
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;

-- delivery_returns -> deliveries
ALTER TABLE delivery_returns
  DROP CONSTRAINT IF EXISTS delivery_returns_delivery_id_fkey;
ALTER TABLE delivery_returns
  ADD CONSTRAINT delivery_returns_delivery_id_fkey
  FOREIGN KEY (delivery_id) REFERENCES deliveries(id) ON DELETE CASCADE;

-- client_quote_request_items -> client_quote_requests (doit être fait en premier)
ALTER TABLE client_quote_request_items
  DROP CONSTRAINT IF EXISTS client_quote_request_items_ddc_id_fkey;
ALTER TABLE client_quote_request_items
  ADD CONSTRAINT client_quote_request_items_ddc_id_fkey
  FOREIGN KEY (ddc_id) REFERENCES client_quote_requests(id) ON DELETE CASCADE;

-- client_quote_requests -> clients
ALTER TABLE client_quote_requests
  DROP CONSTRAINT IF EXISTS client_quote_requests_client_id_fkey;
ALTER TABLE client_quote_requests
  ADD CONSTRAINT client_quote_requests_client_id_fkey
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;

-- factures -> clients
ALTER TABLE factures
  DROP CONSTRAINT IF EXISTS factures_client_id_fkey;
ALTER TABLE factures
  ADD CONSTRAINT factures_client_id_fkey
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;

-- sales -> clients
ALTER TABLE sales
  DROP CONSTRAINT IF EXISTS sales_client_id_fkey;
ALTER TABLE sales
  ADD CONSTRAINT sales_client_id_fkey
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;

-- delivery_items -> deliveries (cascade pour pouvoir supprimer deliveries)
ALTER TABLE delivery_items
  DROP CONSTRAINT IF EXISTS delivery_items_delivery_id_fkey;
ALTER TABLE delivery_items
  ADD CONSTRAINT delivery_items_delivery_id_fkey
  FOREIGN KEY (delivery_id) REFERENCES deliveries(id) ON DELETE CASCADE;

-- deliveries -> clients
ALTER TABLE deliveries
  DROP CONSTRAINT IF EXISTS deliveries_client_id_fkey;
ALTER TABLE deliveries
  ADD CONSTRAINT deliveries_client_id_fkey
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;

-- order_items -> orders (cascade pour pouvoir supprimer orders)
ALTER TABLE order_items
  DROP CONSTRAINT IF EXISTS order_items_order_id_fkey;
ALTER TABLE order_items
  ADD CONSTRAINT order_items_order_id_fkey
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;

-- orders -> clients
ALTER TABLE orders
  DROP CONSTRAINT IF EXISTS orders_client_id_fkey;
ALTER TABLE orders
  ADD CONSTRAINT orders_client_id_fkey
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;

-- client_prices -> clients (si existe)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'client_prices') THEN
    ALTER TABLE client_prices
      DROP CONSTRAINT IF EXISTS client_prices_client_id_fkey;
    ALTER TABLE client_prices
      ADD CONSTRAINT client_prices_client_id_fkey
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;
  END IF;
END $$;

-- payments -> clients (cascade)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payments') THEN
    ALTER TABLE payments
      DROP CONSTRAINT IF EXISTS payments_client_id_fkey;
    ALTER TABLE payments
      ADD CONSTRAINT payments_client_id_fkey
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;

    ALTER TABLE payments
      DROP CONSTRAINT IF EXISTS payments_delivery_id_fkey;
    ALTER TABLE payments
      ADD CONSTRAINT payments_delivery_id_fkey
      FOREIGN KEY (delivery_id) REFERENCES deliveries(id) ON DELETE CASCADE;
  END IF;
END $$;

-- delivery_returns -> deliveries (cascade)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'delivery_returns') THEN
    ALTER TABLE delivery_returns
      DROP CONSTRAINT IF EXISTS delivery_returns_delivery_id_fkey;
    ALTER TABLE delivery_returns
      ADD CONSTRAINT delivery_returns_delivery_id_fkey
      FOREIGN KEY (delivery_id) REFERENCES deliveries(id) ON DELETE CASCADE;
  END IF;
END $$;
