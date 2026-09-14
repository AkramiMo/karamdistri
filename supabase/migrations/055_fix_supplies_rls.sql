-- Migration: Corriger les politiques RLS sur supplies pour les admins
-- Les admins doivent pouvoir créer/modifier/supprimer sans restriction

-- Supprimer les anciennes politiques
DROP POLICY IF EXISTS "View supplies" ON public.supplies;
DROP POLICY IF EXISTS "Create supplies" ON public.supplies;
DROP POLICY IF EXISTS "Update supplies" ON public.supplies;
DROP POLICY IF EXISTS "Delete supplies" ON public.supplies;

-- Recréer avec bypass admin
CREATE POLICY "View supplies" ON public.supplies
  FOR SELECT TO authenticated
  USING (is_admin() OR has_permission('achats', 'view'));

CREATE POLICY "Create supplies" ON public.supplies
  FOR INSERT TO authenticated
  WITH CHECK (is_admin() OR has_permission('achats', 'create'));

CREATE POLICY "Update supplies" ON public.supplies
  FOR UPDATE TO authenticated
  USING (is_admin() OR has_permission('achats', 'edit'));

CREATE POLICY "Delete supplies" ON public.supplies
  FOR DELETE TO authenticated
  USING (is_admin() OR has_permission('achats', 'delete'));

-- Faire pareil pour supply_categories
DROP POLICY IF EXISTS "View supply categories" ON public.supply_categories;
DROP POLICY IF EXISTS "Manage supply categories" ON public.supply_categories;

CREATE POLICY "View supply categories" ON public.supply_categories
  FOR SELECT TO authenticated
  USING (is_admin() OR has_permission('achats', 'view'));

CREATE POLICY "Manage supply categories" ON public.supply_categories
  FOR ALL TO authenticated
  USING (is_admin() OR has_permission('achats', 'create'));
