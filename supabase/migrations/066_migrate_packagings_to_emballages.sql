-- Migration: Remplacer packagings par emballages dans les articles
-- Cette migration:
-- 1. Copie les données de packagings vers emballages (si pas déjà présentes)
-- 2. Met à jour les articles pour référencer emballages au lieu de packagings
-- 3. Supprime l'ancienne contrainte et crée la nouvelle

-- 1. Copier les packagings existants vers emballages (si pas déjà présents)
INSERT INTO emballages (id, code, name, capacity, unit, is_active)
SELECT
    p.id,
    UPPER(REPLACE(REPLACE(p.name, ' ', ''), 'ml', 'ML')),
    p.name,
    p.volume,
    CASE
        WHEN p.name LIKE '%ml%' THEN 'ml'
        WHEN p.name LIKE '%L%' THEN 'L'
        WHEN p.name LIKE '%kg%' OR p.name LIKE '%g%' THEN 'kg'
        ELSE 'unité'
    END,
    true
FROM packagings p
WHERE NOT EXISTS (
    SELECT 1 FROM emballages e WHERE e.name = p.name
)
ON CONFLICT (id) DO NOTHING;

-- 2. Supprimer l'ancienne contrainte de clé étrangère
ALTER TABLE articles
DROP CONSTRAINT IF EXISTS articles_packaging_id_fkey;

-- 3. Créer la nouvelle contrainte vers emballages
ALTER TABLE articles
ADD CONSTRAINT articles_packaging_id_fkey
FOREIGN KEY (packaging_id) REFERENCES emballages(id) ON DELETE SET NULL;

-- 4. Créer un index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_articles_packaging_id ON articles(packaging_id);

-- Note: La table packagings n'est pas supprimée pour éviter les erreurs
-- Vous pouvez la supprimer manuellement plus tard si nécessaire:
-- DROP TABLE IF EXISTS packagings;
