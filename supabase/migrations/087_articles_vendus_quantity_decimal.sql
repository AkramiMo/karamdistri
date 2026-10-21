-- Migration: Permettre les quantités décimales dans articles_vendus
-- Pour les articles vendus en kg (ex: 10.5 kg de ONFG-Vrac)

ALTER TABLE articles_vendus
  ALTER COLUMN quantity_sold TYPE NUMERIC(10,2) USING quantity_sold::NUMERIC(10,2);

COMMENT ON COLUMN articles_vendus.quantity_sold IS 'Quantité vendue (peut être décimale pour les ventes en kg)';
