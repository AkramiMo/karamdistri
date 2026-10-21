-- Migration: Permettre les quantités décimales dans reception_items
-- Les quantités de réception peuvent être des décimaux (ex: 10.5 kg)

-- Modifier le type des colonnes quantity_expected et quantity_received
ALTER TABLE reception_items
  ALTER COLUMN quantity_expected TYPE NUMERIC(10,2) USING quantity_expected::NUMERIC(10,2),
  ALTER COLUMN quantity_received TYPE NUMERIC(10,2) USING quantity_received::NUMERIC(10,2);

-- Ajouter un commentaire pour documenter
COMMENT ON COLUMN reception_items.quantity_expected IS 'Quantité attendue (peut être décimale)';
COMMENT ON COLUMN reception_items.quantity_received IS 'Quantité reçue (peut être décimale)';
