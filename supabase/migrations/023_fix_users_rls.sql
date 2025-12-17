-- Migration: Fix users RLS to allow admins to view all users
-- Date: 2024

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;

-- Create new policies that allow admins to manage all users
-- Admins can view all users, others can only view their own profile
CREATE POLICY "Users can view users" ON public.users
  FOR SELECT USING (
    auth.uid() = id
    OR has_permission('admin', 'view')
    OR EXISTS (
      SELECT 1 FROM public.users u
      JOIN public.roles r ON u.role_id = r.id
      WHERE u.id = auth.uid() AND r.name = 'admin'
    )
  );

-- Admins can update all users, others can only update their own profile
CREATE POLICY "Users can update users" ON public.users
  FOR UPDATE USING (
    auth.uid() = id
    OR has_permission('admin', 'edit')
    OR EXISTS (
      SELECT 1 FROM public.users u
      JOIN public.roles r ON u.role_id = r.id
      WHERE u.id = auth.uid() AND r.name = 'admin'
    )
  );

-- Admins can insert new users
CREATE POLICY "Admins can insert users" ON public.users
  FOR INSERT WITH CHECK (
    has_permission('admin', 'create')
    OR EXISTS (
      SELECT 1 FROM public.users u
      JOIN public.roles r ON u.role_id = r.id
      WHERE u.id = auth.uid() AND r.name = 'admin'
    )
  );

-- Admins can delete users
CREATE POLICY "Admins can delete users" ON public.users
  FOR DELETE USING (
    has_permission('admin', 'delete')
    OR EXISTS (
      SELECT 1 FROM public.users u
      JOIN public.roles r ON u.role_id = r.id
      WHERE u.id = auth.uid() AND r.name = 'admin'
    )
  );
