-- ============================================
-- FIX DELIVERY_ROUNDS RLS POLICIES
-- Politiques simplifiées pour tous les utilisateurs authentifiés
-- ============================================

-- Supprimer toutes les politiques existantes sur delivery_rounds
DROP POLICY IF EXISTS "View delivery_rounds" ON delivery_rounds;
DROP POLICY IF EXISTS "Create delivery_rounds" ON delivery_rounds;
DROP POLICY IF EXISTS "Update delivery_rounds" ON delivery_rounds;
DROP POLICY IF EXISTS "Delete delivery_rounds" ON delivery_rounds;
DROP POLICY IF EXISTS "Users can view delivery_rounds" ON delivery_rounds;
DROP POLICY IF EXISTS "Users can insert delivery_rounds" ON delivery_rounds;
DROP POLICY IF EXISTS "Users can update delivery_rounds" ON delivery_rounds;
DROP POLICY IF EXISTS "Users can delete delivery_rounds" ON delivery_rounds;
DROP POLICY IF EXISTS "delivery_rounds_select" ON delivery_rounds;
DROP POLICY IF EXISTS "delivery_rounds_insert" ON delivery_rounds;
DROP POLICY IF EXISTS "delivery_rounds_update" ON delivery_rounds;
DROP POLICY IF EXISTS "delivery_rounds_delete" ON delivery_rounds;

-- Créer des politiques simples qui permettent tout pour les utilisateurs authentifiés
CREATE POLICY "delivery_rounds_select" ON delivery_rounds
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "delivery_rounds_insert" ON delivery_rounds
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "delivery_rounds_update" ON delivery_rounds
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "delivery_rounds_delete" ON delivery_rounds
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- ============================================
-- FIX DELIVERY_ROUND_ITEMS RLS POLICIES
-- ============================================

DROP POLICY IF EXISTS "View delivery_round_items" ON delivery_round_items;
DROP POLICY IF EXISTS "Create delivery_round_items" ON delivery_round_items;
DROP POLICY IF EXISTS "Update delivery_round_items" ON delivery_round_items;
DROP POLICY IF EXISTS "Delete delivery_round_items" ON delivery_round_items;
DROP POLICY IF EXISTS "Users can view delivery_round_items" ON delivery_round_items;
DROP POLICY IF EXISTS "Users can insert delivery_round_items" ON delivery_round_items;
DROP POLICY IF EXISTS "Users can update delivery_round_items" ON delivery_round_items;
DROP POLICY IF EXISTS "Users can delete delivery_round_items" ON delivery_round_items;
DROP POLICY IF EXISTS "delivery_round_items_select" ON delivery_round_items;
DROP POLICY IF EXISTS "delivery_round_items_insert" ON delivery_round_items;
DROP POLICY IF EXISTS "delivery_round_items_update" ON delivery_round_items;
DROP POLICY IF EXISTS "delivery_round_items_delete" ON delivery_round_items;

CREATE POLICY "delivery_round_items_select" ON delivery_round_items
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "delivery_round_items_insert" ON delivery_round_items
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "delivery_round_items_update" ON delivery_round_items
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "delivery_round_items_delete" ON delivery_round_items
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- ============================================
-- FIX CLIENTS RLS POLICIES
-- Permettre aux livreurs de voir les clients de leurs tournées
-- ============================================

DROP POLICY IF EXISTS "View clients" ON clients;
DROP POLICY IF EXISTS "Create clients" ON clients;
DROP POLICY IF EXISTS "Update clients" ON clients;
DROP POLICY IF EXISTS "Delete clients" ON clients;
DROP POLICY IF EXISTS "clients_select" ON clients;
DROP POLICY IF EXISTS "clients_insert" ON clients;
DROP POLICY IF EXISTS "clients_update" ON clients;
DROP POLICY IF EXISTS "clients_delete" ON clients;

-- SELECT: Tous les utilisateurs authentifiés peuvent voir les clients
CREATE POLICY "clients_select" ON clients
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- INSERT: Utilisateurs authentifiés (sauf livreurs via l'app)
CREATE POLICY "clients_insert" ON clients
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- UPDATE: Utilisateurs authentifiés (sauf livreurs via l'app)
CREATE POLICY "clients_update" ON clients
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- DELETE: Utilisateurs authentifiés (sauf livreurs via l'app)
CREATE POLICY "clients_delete" ON clients
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- ============================================
-- FIX DELIVERIES RLS POLICIES
-- ============================================

DROP POLICY IF EXISTS "View deliveries" ON deliveries;
DROP POLICY IF EXISTS "Create deliveries" ON deliveries;
DROP POLICY IF EXISTS "Update deliveries" ON deliveries;
DROP POLICY IF EXISTS "Delete deliveries" ON deliveries;
DROP POLICY IF EXISTS "deliveries_select" ON deliveries;
DROP POLICY IF EXISTS "deliveries_insert" ON deliveries;
DROP POLICY IF EXISTS "deliveries_update" ON deliveries;
DROP POLICY IF EXISTS "deliveries_delete" ON deliveries;

CREATE POLICY "deliveries_select" ON deliveries
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "deliveries_insert" ON deliveries
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "deliveries_update" ON deliveries
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "deliveries_delete" ON deliveries
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- ============================================
-- FIX DELIVERY_ITEMS RLS POLICIES
-- ============================================

DROP POLICY IF EXISTS "View delivery_items" ON delivery_items;
DROP POLICY IF EXISTS "Manage delivery_items" ON delivery_items;
DROP POLICY IF EXISTS "delivery_items_select" ON delivery_items;
DROP POLICY IF EXISTS "delivery_items_insert" ON delivery_items;
DROP POLICY IF EXISTS "delivery_items_update" ON delivery_items;
DROP POLICY IF EXISTS "delivery_items_delete" ON delivery_items;

CREATE POLICY "delivery_items_select" ON delivery_items
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "delivery_items_insert" ON delivery_items
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "delivery_items_update" ON delivery_items
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "delivery_items_delete" ON delivery_items
  FOR DELETE USING (auth.uid() IS NOT NULL);
