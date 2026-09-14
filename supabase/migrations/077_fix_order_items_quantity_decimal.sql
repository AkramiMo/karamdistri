-- Fix order_items quantity to support decimal values (e.g., 3.5 kg)
ALTER TABLE order_items
ALTER COLUMN quantity TYPE NUMERIC(10,2) USING quantity::NUMERIC(10,2);

-- Also fix delivery_items if it has the same issue
ALTER TABLE delivery_items
ALTER COLUMN quantity_ordered TYPE NUMERIC(10,2) USING quantity_ordered::NUMERIC(10,2);

ALTER TABLE delivery_items
ALTER COLUMN quantity_delivered TYPE NUMERIC(10,2) USING quantity_delivered::NUMERIC(10,2);

ALTER TABLE delivery_items
ALTER COLUMN quantity_returned TYPE NUMERIC(10,2) USING quantity_returned::NUMERIC(10,2);
