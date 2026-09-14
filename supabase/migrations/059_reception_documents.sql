-- Migration: Table et Storage pour les documents de réception
-- Date: 2024

-- Créer la table reception_documents
CREATE TABLE IF NOT EXISTS public.reception_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reception_id UUID NOT NULL REFERENCES public.receptions(id) ON DELETE CASCADE,
  nom TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('pdf', 'image', 'scan')),
  chemin TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index pour les recherches par réception
CREATE INDEX IF NOT EXISTS idx_reception_documents_reception_id ON public.reception_documents(reception_id);

-- RLS policies
ALTER TABLE public.reception_documents ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "reception_documents_select_policy" ON public.reception_documents;
DROP POLICY IF EXISTS "reception_documents_insert_policy" ON public.reception_documents;
DROP POLICY IF EXISTS "reception_documents_update_policy" ON public.reception_documents;
DROP POLICY IF EXISTS "reception_documents_delete_policy" ON public.reception_documents;

-- Policy: lecture pour tous les utilisateurs authentifiés
CREATE POLICY "reception_documents_select_policy" ON public.reception_documents
  FOR SELECT TO authenticated USING (true);

-- Policy: insertion pour tous les utilisateurs authentifiés
CREATE POLICY "reception_documents_insert_policy" ON public.reception_documents
  FOR INSERT TO authenticated WITH CHECK (true);

-- Policy: mise à jour pour tous les utilisateurs authentifiés
CREATE POLICY "reception_documents_update_policy" ON public.reception_documents
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Policy: suppression pour tous les utilisateurs authentifiés
CREATE POLICY "reception_documents_delete_policy" ON public.reception_documents
  FOR DELETE TO authenticated USING (true);

-- Créer le bucket storage pour les documents de réception
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'reception-documents',
  'reception-documents',
  true,
  26214400, -- 25MB
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 26214400,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];

-- NOTE: Pour configurer les policies de storage manuellement:
-- 1. Aller dans Supabase Dashboard > Storage > reception-documents
-- 2. Cliquer sur "Policies"
-- 3. Ajouter les policies suivantes:
--
-- SELECT (lecture publique):
--   - Policy name: "Public read access"
--   - Target roles: public
--   - Using expression: true
--
-- INSERT (upload pour utilisateurs authentifiés):
--   - Policy name: "Authenticated users can upload"
--   - Target roles: authenticated
--   - With check expression: true
--
-- UPDATE (mise à jour pour utilisateurs authentifiés):
--   - Policy name: "Authenticated users can update"
--   - Target roles: authenticated
--   - Using expression: true
--
-- DELETE (suppression pour utilisateurs authentifiés):
--   - Policy name: "Authenticated users can delete"
--   - Target roles: authenticated
--   - Using expression: true
