-- Migration: Supprimer les sous-catégories et garder uniquement les 5 catégories principales
-- Catégories principales: Olives, Sauces, Légumes, Etiquettes, Emballages

-- 1. S'assurer que les 5 catégories principales existent
INSERT INTO categories (name, description, parent_id)
SELECT 'Olives', 'Produits à base d''olives', NULL
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Olives' AND parent_id IS NULL);

INSERT INTO categories (name, description, parent_id)
SELECT 'Sauces', 'Sauces et condiments', NULL
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Sauces' AND parent_id IS NULL);

INSERT INTO categories (name, description, parent_id)
SELECT 'Légumes', 'Légumes marinés et conservés', NULL
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Légumes' AND parent_id IS NULL);

INSERT INTO categories (name, description, parent_id)
SELECT 'Etiquettes', 'Etiquettes pour produits', NULL
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Etiquettes' AND parent_id IS NULL);

INSERT INTO categories (name, description, parent_id)
SELECT 'Emballages', 'Emballages et contenants', NULL
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Emballages' AND parent_id IS NULL);

-- 2. Assigner tous les articles commençant par ETQ à la catégorie Etiquettes
UPDATE articles
SET category_id = (SELECT id FROM categories WHERE name = 'Etiquettes' AND parent_id IS NULL LIMIT 1)
WHERE code LIKE 'ETQ%';

-- 2b. Assigner aussi dans la table supplies (fournitures)
UPDATE supplies
SET category_id = (SELECT id FROM categories WHERE name = 'Etiquettes' AND parent_id IS NULL LIMIT 1)
WHERE code LIKE 'ETQ%';

-- 3. Réassigner les articles des sous-catégories vers leurs catégories parentes
UPDATE articles
SET category_id = (
  SELECT parent_id
  FROM categories
  WHERE categories.id = articles.category_id
)
WHERE category_id IN (
  SELECT id FROM categories WHERE parent_id IS NOT NULL
);

-- 4. Supprimer toutes les sous-catégories (celles qui ont un parent_id)
DELETE FROM categories WHERE parent_id IS NOT NULL;
