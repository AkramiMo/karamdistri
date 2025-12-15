-- Migration: Add image fields to clients table
-- Date: 2025-01-15
-- Description: Add logo_url and local_image_url columns for client images

-- Add image columns to clients table
ALTER TABLE clients ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS local_image_url TEXT;

-- Create storage bucket for client images (run this in Supabase Dashboard or via API)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('client-images', 'client-images', true);

-- Storage policies for client-images bucket
-- These need to be created in Supabase Dashboard:
-- 1. Allow authenticated users to upload: INSERT with authenticated role
-- 2. Allow public read access: SELECT for public
-- 3. Allow authenticated users to update: UPDATE with authenticated role
-- 4. Allow authenticated users to delete: DELETE with authenticated role

COMMENT ON COLUMN clients.logo_url IS 'URL of client logo image stored in Supabase Storage';
COMMENT ON COLUMN clients.local_image_url IS 'URL of client local/storefront photo stored in Supabase Storage';
