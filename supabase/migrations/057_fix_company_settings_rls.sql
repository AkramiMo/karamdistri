-- Migration: Permettre à tous les utilisateurs authentifiés de lire company_settings

-- Supprimer les anciennes politiques
DROP POLICY IF EXISTS "Admin manages company settings" ON public.company_settings;
DROP POLICY IF EXISTS "All users can view company settings" ON public.company_settings;

-- Politique pour LIRE - tous les utilisateurs authentifiés
CREATE POLICY "All users can view company settings" ON public.company_settings
  FOR SELECT TO authenticated
  USING (true);

-- Politique pour MODIFIER - uniquement les admins
CREATE POLICY "Admin manages company settings" ON public.company_settings
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      JOIN public.roles r ON u.role_id = r.id
      WHERE u.id = auth.uid() AND r.name = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      JOIN public.roles r ON u.role_id = r.id
      WHERE u.id = auth.uid() AND r.name = 'admin'
    )
  );
