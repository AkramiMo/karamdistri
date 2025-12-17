-- Migration: Setup Storage Bucket for Client Images
-- Date: 2024
-- NOTE: Les policies sur storage.objects doivent être créées manuellement
--       dans Supabase Dashboard > Storage > Policies

-- Create storage bucket for client images (if not exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'client-images',
  'client-images',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

-- NOTE: Pour configurer les policies manuellement:
-- 1. Aller dans Supabase Dashboard > Storage > client-images
-- 2. Cliquer sur "Policies"
-- 3. Ajouter les policies suivantes:
--
-- SELECT (lecture publique):
--   - Policy name: "Public read access"
--   - Target roles: public
--   - Using expression: true
--
-- INSERT (upload pour utilisateurs authentifies):
--   - Policy name: "Authenticated users can upload"
--   - Target roles: authenticated
--   - With check expression: true
--
-- UPDATE (mise à jour pour utilisateurs authentifies):
--   - Policy name: "Authenticated users can update"
--   - Target roles: authenticated
--   - Using expression: true
--
-- DELETE (suppression pour utilisateurs authentifies):
--   - Policy name: "Authenticated users can delete"
--   - Target roles: authenticated
--   - Using expression: true
