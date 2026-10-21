-- Migration: Permettre sale_id NULL dans articles_vendus
-- Pour les BL validés directement (sans passer par RBLT)

-- Supprimer la contrainte NOT NULL sur sale_id
ALTER TABLE articles_vendus
  ALTER COLUMN sale_id DROP NOT NULL;

-- Modifier la contrainte de clé étrangère pour SET NULL au lieu de CASCADE
ALTER TABLE articles_vendus
  DROP CONSTRAINT IF EXISTS articles_vendus_sale_id_fkey;

ALTER TABLE articles_vendus
  ADD CONSTRAINT articles_vendus_sale_id_fkey
  FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE SET NULL;

COMMENT ON COLUMN articles_vendus.sale_id IS 'ID de la vente associée (NULL pour BL validés directement sans RBLT)';
