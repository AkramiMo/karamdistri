-- Migration: Fix users RLS infinite recursion
-- Date: 2024
-- Problem: Previous policies caused infinite recursion by querying users table within users policy

-- First, drop ALL existing policies on users table
DROP POLICY IF EXISTS "Users can view users" ON public.users;
DROP POLICY IF EXISTS "Users can update users" ON public.users;
DROP POLICY IF EXISTS "Admins can insert users" ON public.users;
DROP POLICY IF EXISTS "Admins can delete users" ON public.users;
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;

-- Create a SECURITY DEFINER function to check if user is admin
-- This bypasses RLS to avoid infinite recursion
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
DECLARE
  v_role_name TEXT;
BEGIN
  -- Get role name directly from roles table using the user's role_id from users table
  -- This function runs with SECURITY DEFINER so it bypasses RLS
  SELECT r.name INTO v_role_name
  FROM public.users u
  JOIN public.roles r ON u.role_id = r.id
  WHERE u.id = auth.uid();

  RETURN v_role_name = 'admin';
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;

-- Now create simple policies that don't cause recursion

-- SELECT: Users can view their own profile, admins can view all
CREATE POLICY "users_select_policy" ON public.users
  FOR SELECT USING (
    auth.uid() = id  -- User can always see their own profile
    OR is_admin()    -- Admin can see all (uses SECURITY DEFINER function)
  );

-- UPDATE: Users can update their own profile, admins can update all
CREATE POLICY "users_update_policy" ON public.users
  FOR UPDATE USING (
    auth.uid() = id
    OR is_admin()
  );

-- INSERT: Only admins can insert new users
CREATE POLICY "users_insert_policy" ON public.users
  FOR INSERT WITH CHECK (
    is_admin()
  );

-- DELETE: Only admins can delete users
CREATE POLICY "users_delete_policy" ON public.users
  FOR DELETE USING (
    is_admin()
  );

-- Also fix the has_permission function to use the new is_admin function
CREATE OR REPLACE FUNCTION has_permission(
  p_module_code TEXT,
  p_permission TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_role_id UUID;
  v_has_perm BOOLEAN;
BEGIN
  -- Check if admin first (uses is_admin which bypasses RLS)
  IF is_admin() THEN
    RETURN TRUE;
  END IF;

  -- Get role_id directly (this function is SECURITY DEFINER so no RLS)
  SELECT role_id INTO v_role_id
  FROM public.users
  WHERE id = auth.uid();

  IF v_role_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Check permission
  SELECT
    CASE p_permission
      WHEN 'view' THEN can_view
      WHEN 'create' THEN can_create
      WHEN 'edit' THEN can_edit
      WHEN 'delete' THEN can_delete
    END INTO v_has_perm
  FROM public.role_permissions rp
  JOIN public.modules m ON m.id = rp.module_id
  WHERE rp.role_id = v_role_id AND m.code = p_module_code;

  RETURN COALESCE(v_has_perm, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
