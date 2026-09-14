-- Migration: Ajouter les politiques RLS pour INSERT/DELETE sur role_permissions
-- Permet aux admins de modifier les permissions des rôles

-- Supprimer les anciennes politiques si elles existent
DROP POLICY IF EXISTS "Admins can insert permissions" ON public.role_permissions;
DROP POLICY IF EXISTS "Admins can update permissions" ON public.role_permissions;
DROP POLICY IF EXISTS "Admins can delete permissions" ON public.role_permissions;

-- Politique pour INSERT (création de permissions)
CREATE POLICY "Admins can insert permissions" ON public.role_permissions
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      JOIN public.roles r ON r.id = u.role_id
      WHERE u.id = auth.uid() AND r.name = 'admin'
    )
  );

-- Politique pour UPDATE (modification de permissions)
CREATE POLICY "Admins can update permissions" ON public.role_permissions
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      JOIN public.roles r ON r.id = u.role_id
      WHERE u.id = auth.uid() AND r.name = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      JOIN public.roles r ON r.id = u.role_id
      WHERE u.id = auth.uid() AND r.name = 'admin'
    )
  );

-- Politique pour DELETE (suppression de permissions)
CREATE POLICY "Admins can delete permissions" ON public.role_permissions
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      JOIN public.roles r ON r.id = u.role_id
      WHERE u.id = auth.uid() AND r.name = 'admin'
    )
  );
