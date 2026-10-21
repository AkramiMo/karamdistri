-- Migration: Ajouter l'URL de l'image du bon de réception
-- Description: Permet de stocker directement l'URL de l'image du bon fournisseur

-- Ajouter la colonne bon_image_url à la table receptions
ALTER TABLE public.receptions
ADD COLUMN IF NOT EXISTS bon_image_url TEXT;

-- Commentaire pour documentation
COMMENT ON COLUMN public.receptions.bon_image_url IS 'URL de l''image du bon de réception fournisseur (stockée dans Supabase Storage)';
