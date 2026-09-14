-- Migration: Storage policies pour reception-documents
-- Date: 2024

-- Créer le bucket s'il n'existe pas
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'reception-documents',
  'reception-documents',
  true,
  26214400,
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "reception_documents_storage_select" ON storage.objects;
DROP POLICY IF EXISTS "reception_documents_storage_insert" ON storage.objects;
DROP POLICY IF EXISTS "reception_documents_storage_update" ON storage.objects;
DROP POLICY IF EXISTS "reception_documents_storage_delete" ON storage.objects;

-- Policy: lecture publique
CREATE POLICY "reception_documents_storage_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'reception-documents');

-- Policy: upload pour utilisateurs authentifiés
CREATE POLICY "reception_documents_storage_insert" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'reception-documents');

-- Policy: mise à jour pour utilisateurs authentifiés
CREATE POLICY "reception_documents_storage_update" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'reception-documents');

-- Policy: suppression pour utilisateurs authentifiés
CREATE POLICY "reception_documents_storage_delete" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'reception-documents');
