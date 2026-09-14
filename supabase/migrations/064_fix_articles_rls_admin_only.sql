-- Migration: Fix articles RLS - Admin only can modify
-- Description: Only admin can insert/update/delete articles, all authenticated users can read

-- Drop existing policies on articles
DROP POLICY IF EXISTS "Allow authenticated read articles" ON articles;
DROP POLICY IF EXISTS "Allow authenticated insert articles" ON articles;
DROP POLICY IF EXISTS "Allow authenticated update articles" ON articles;
DROP POLICY IF EXISTS "Allow authenticated delete articles" ON articles;
DROP POLICY IF EXISTS "Allow anon read articles" ON articles;
DROP POLICY IF EXISTS "Admin can insert articles" ON articles;
DROP POLICY IF EXISTS "Admin can update articles" ON articles;
DROP POLICY IF EXISTS "Admin can delete articles" ON articles;

-- Create new policies

-- All authenticated users can read articles
CREATE POLICY "Allow authenticated read articles" ON articles
  FOR SELECT TO authenticated USING (true);

-- Only admin can insert articles
CREATE POLICY "Admin can insert articles" ON articles
  FOR INSERT TO authenticated
  WITH CHECK (is_admin());

-- Only admin can update articles (with WITH CHECK for the new values)
CREATE POLICY "Admin can update articles" ON articles
  FOR UPDATE TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Only admin can delete articles
CREATE POLICY "Admin can delete articles" ON articles
  FOR DELETE TO authenticated
  USING (is_admin());
