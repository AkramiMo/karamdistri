-- ============================================
-- CONFIGURATION DU RÔLE LIVREUR
-- Script complet - Exécuter en une seule fois
-- ============================================

-- ============================================
-- 1. SUPPRIMER TOUTES LES ANCIENNES POLITIQUES
-- ============================================

DROP POLICY IF EXISTS "View delivery_rounds" ON delivery_rounds;
DROP POLICY IF EXISTS "Create delivery_rounds" ON delivery_rounds;
DROP POLICY IF EXISTS "Update delivery_rounds" ON delivery_rounds;
DROP POLICY IF EXISTS "Delete delivery_rounds" ON delivery_rounds;
DROP POLICY IF EXISTS "Users can view delivery_rounds" ON delivery_rounds;
DROP POLICY IF EXISTS "Users can insert delivery_rounds" ON delivery_rounds;
DROP POLICY IF EXISTS "Users can update delivery_rounds" ON delivery_rounds;
DROP POLICY IF EXISTS "Users can delete delivery_rounds" ON delivery_rounds;

DROP POLICY IF EXISTS "View delivery_round_items" ON delivery_round_items;
DROP POLICY IF EXISTS "Create delivery_round_items" ON delivery_round_items;
DROP POLICY IF EXISTS "Update delivery_round_items" ON delivery_round_items;
DROP POLICY IF EXISTS "Delete delivery_round_items" ON delivery_round_items;
DROP POLICY IF EXISTS "Users can view delivery_round_items" ON delivery_round_items;
DROP POLICY IF EXISTS "Users can insert delivery_round_items" ON delivery_round_items;
DROP POLICY IF EXISTS "Users can update delivery_round_items" ON delivery_round_items;
DROP POLICY IF EXISTS "Users can delete delivery_round_items" ON delivery_round_items;

DROP POLICY IF EXISTS "View deliveries" ON deliveries;
DROP POLICY IF EXISTS "Create deliveries" ON deliveries;
DROP POLICY IF EXISTS "Update deliveries" ON deliveries;

DROP POLICY IF EXISTS "View delivery_items" ON delivery_items;
DROP POLICY IF EXISTS "Manage delivery_items" ON delivery_items;
DROP POLICY IF EXISTS "View delivery items" ON delivery_items;
DROP POLICY IF EXISTS "Manage delivery items" ON delivery_items;

DROP POLICY IF EXISTS "View delivery_returns" ON delivery_returns;
DROP POLICY IF EXISTS "Create delivery_returns" ON delivery_returns;
DROP POLICY IF EXISTS "Update delivery_returns" ON delivery_returns;
DROP POLICY IF EXISTS "Delete delivery_returns" ON delivery_returns;
DROP POLICY IF EXISTS "delivery_returns_select" ON delivery_returns;
DROP POLICY IF EXISTS "delivery_returns_insert" ON delivery_returns;
DROP POLICY IF EXISTS "delivery_returns_update" ON delivery_returns;
DROP POLICY IF EXISTS "delivery_returns_delete" ON delivery_returns;

DROP POLICY IF EXISTS "View delivery_return_items" ON delivery_return_items;
DROP POLICY IF EXISTS "Manage delivery_return_items" ON delivery_return_items;
DROP POLICY IF EXISTS "delivery_return_items_select" ON delivery_return_items;
DROP POLICY IF EXISTS "delivery_return_items_insert" ON delivery_return_items;
DROP POLICY IF EXISTS "delivery_return_items_update" ON delivery_return_items;
DROP POLICY IF EXISTS "delivery_return_items_delete" ON delivery_return_items;

DROP POLICY IF EXISTS "View fiches_trajet" ON fiches_trajet;
DROP POLICY IF EXISTS "Create fiches_trajet" ON fiches_trajet;
DROP POLICY IF EXISTS "Update fiches_trajet" ON fiches_trajet;
DROP POLICY IF EXISTS "Delete fiches_trajet" ON fiches_trajet;
DROP POLICY IF EXISTS "Allow authenticated users to view fiches_trajet" ON fiches_trajet;
DROP POLICY IF EXISTS "Allow authenticated users to insert fiches_trajet" ON fiches_trajet;
DROP POLICY IF EXISTS "Allow authenticated users to update fiches_trajet" ON fiches_trajet;
DROP POLICY IF EXISTS "Allow authenticated users to delete fiches_trajet" ON fiches_trajet;

DROP POLICY IF EXISTS "View clients" ON clients;
DROP POLICY IF EXISTS "Create clients" ON clients;
DROP POLICY IF EXISTS "Update clients" ON clients;
DROP POLICY IF EXISTS "Delete clients" ON clients;

DROP POLICY IF EXISTS "View orders" ON orders;
DROP POLICY IF EXISTS "Create orders" ON orders;
DROP POLICY IF EXISTS "Update orders" ON orders;

DROP POLICY IF EXISTS "View order_items" ON order_items;
DROP POLICY IF EXISTS "Manage order_items" ON order_items;
DROP POLICY IF EXISTS "View order items" ON order_items;
DROP POLICY IF EXISTS "Manage order items" ON order_items;

-- ============================================
-- 2. FONCTION HELPER - VÉRIFIER SI L'UTILISATEUR EST LIVREUR
-- ============================================

CREATE OR REPLACE FUNCTION is_livreur()
RETURNS BOOLEAN AS $$
DECLARE
  v_role_name TEXT;
BEGIN
  SELECT r.name INTO v_role_name
  FROM public.users u
  JOIN public.roles r ON r.id = u.role_id
  WHERE u.id = auth.uid();

  RETURN COALESCE(v_role_name = 'livreur', false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================
-- 3. AJOUTER LES MODULES MANQUANTS
-- ============================================

INSERT INTO modules (code, name, icon, path, sort_order, is_active) VALUES
  ('tournees', 'Tournées de Livraison', 'Route', '/tournees', 45, true),
  ('rblt', 'Retours de Livraison', 'Truck', '/rblt', 46, true),
  ('fiches-trajet', 'Fiche de Trajet', 'FileText', '/fiches-trajet', 47, true)
ON CONFLICT (code) DO UPDATE SET is_active = true;

-- ============================================
-- 4. CONFIGURER LES PERMISSIONS DU LIVREUR
-- ============================================

DELETE FROM role_permissions
WHERE role_id = (SELECT id FROM roles WHERE name = 'livreur');

INSERT INTO role_permissions (role_id, module_id, can_view, can_create, can_edit, can_delete)
SELECT
  r.id as role_id,
  m.id as module_id,
  true as can_view,
  CASE
    WHEN m.code IN ('tournees', 'livraisons', 'rblt', 'fiches-trajet') THEN true
    ELSE false
  END as can_create,
  CASE
    WHEN m.code IN ('tournees', 'livraisons', 'rblt', 'fiches-trajet') THEN true
    ELSE false
  END as can_edit,
  false as can_delete
FROM roles r
CROSS JOIN modules m
WHERE r.name = 'livreur'
  AND m.code IN ('dashboard', 'tournees', 'livraisons', 'rblt', 'fiches-trajet', 'clients', 'commandes')
ON CONFLICT (role_id, module_id) DO UPDATE SET
  can_view = EXCLUDED.can_view,
  can_create = EXCLUDED.can_create,
  can_edit = EXCLUDED.can_edit,
  can_delete = EXCLUDED.can_delete;

-- ============================================
-- 5. POLITIQUES RLS POUR DELIVERY_ROUNDS (BLT)
-- ============================================

CREATE POLICY "View delivery_rounds" ON delivery_rounds
  FOR SELECT USING (
    CASE
      WHEN is_livreur() THEN driver_id = auth.uid()
      ELSE has_permission('tournees', 'view')
    END
  );

CREATE POLICY "Create delivery_rounds" ON delivery_rounds
  FOR INSERT WITH CHECK (has_permission('tournees', 'create'));

CREATE POLICY "Update delivery_rounds" ON delivery_rounds
  FOR UPDATE USING (
    CASE
      WHEN is_livreur() THEN driver_id = auth.uid()
      ELSE has_permission('tournees', 'edit')
    END
  );

CREATE POLICY "Delete delivery_rounds" ON delivery_rounds
  FOR DELETE USING (has_permission('tournees', 'delete'));

-- ============================================
-- 6. POLITIQUES RLS POUR DELIVERY_ROUND_ITEMS
-- ============================================

CREATE POLICY "View delivery_round_items" ON delivery_round_items
  FOR SELECT USING (
    CASE
      WHEN is_livreur() THEN
        EXISTS (
          SELECT 1 FROM delivery_rounds dr
          WHERE dr.id = round_id AND dr.driver_id = auth.uid()
        )
      ELSE has_permission('tournees', 'view')
    END
  );

CREATE POLICY "Create delivery_round_items" ON delivery_round_items
  FOR INSERT WITH CHECK (has_permission('tournees', 'create'));

CREATE POLICY "Update delivery_round_items" ON delivery_round_items
  FOR UPDATE USING (
    CASE
      WHEN is_livreur() THEN
        EXISTS (
          SELECT 1 FROM delivery_rounds dr
          WHERE dr.id = round_id AND dr.driver_id = auth.uid()
        )
      ELSE has_permission('tournees', 'edit')
    END
  );

CREATE POLICY "Delete delivery_round_items" ON delivery_round_items
  FOR DELETE USING (has_permission('tournees', 'delete'));

-- ============================================
-- 7. POLITIQUES RLS POUR DELIVERIES (BL)
-- Livreur voit UNIQUEMENT les BL dans ses BLT
-- ============================================

CREATE POLICY "View deliveries" ON deliveries
  FOR SELECT USING (
    CASE
      WHEN is_livreur() THEN
        EXISTS (
          SELECT 1 FROM delivery_round_items dri
          JOIN delivery_rounds dr ON dr.id = dri.round_id
          WHERE dri.delivery_id = deliveries.id AND dr.driver_id = auth.uid()
        )
      ELSE has_permission('livraisons', 'view')
    END
  );

CREATE POLICY "Create deliveries" ON deliveries
  FOR INSERT WITH CHECK (has_permission('livraisons', 'create'));

CREATE POLICY "Update deliveries" ON deliveries
  FOR UPDATE USING (
    CASE
      WHEN is_livreur() THEN
        EXISTS (
          SELECT 1 FROM delivery_round_items dri
          JOIN delivery_rounds dr ON dr.id = dri.round_id
          WHERE dri.delivery_id = deliveries.id AND dr.driver_id = auth.uid()
        )
      ELSE has_permission('livraisons', 'edit')
    END
  );

-- ============================================
-- 8. POLITIQUES RLS POUR DELIVERY_ITEMS
-- ============================================

CREATE POLICY "View delivery_items" ON delivery_items
  FOR SELECT USING (
    CASE
      WHEN is_livreur() THEN
        EXISTS (
          SELECT 1 FROM deliveries d
          JOIN delivery_round_items dri ON dri.delivery_id = d.id
          JOIN delivery_rounds dr ON dr.id = dri.round_id
          WHERE d.id = delivery_id AND dr.driver_id = auth.uid()
        )
      ELSE has_permission('livraisons', 'view')
    END
  );

CREATE POLICY "Manage delivery_items" ON delivery_items
  FOR ALL USING (
    CASE
      WHEN is_livreur() THEN
        EXISTS (
          SELECT 1 FROM deliveries d
          JOIN delivery_round_items dri ON dri.delivery_id = d.id
          JOIN delivery_rounds dr ON dr.id = dri.round_id
          WHERE d.id = delivery_id AND dr.driver_id = auth.uid()
        )
      ELSE has_permission('livraisons', 'edit')
    END
  );

-- ============================================
-- 9. POLITIQUES RLS POUR DELIVERY_RETURNS (RBLT)
-- ============================================

CREATE POLICY "View delivery_returns" ON delivery_returns
  FOR SELECT USING (
    CASE
      WHEN is_livreur() THEN
        EXISTS (
          SELECT 1 FROM delivery_rounds dr
          WHERE dr.id = round_id AND dr.driver_id = auth.uid()
        )
      ELSE has_permission('rblt', 'view')
    END
  );

CREATE POLICY "Create delivery_returns" ON delivery_returns
  FOR INSERT WITH CHECK (has_permission('rblt', 'create'));

CREATE POLICY "Update delivery_returns" ON delivery_returns
  FOR UPDATE USING (
    CASE
      WHEN is_livreur() THEN
        EXISTS (
          SELECT 1 FROM delivery_rounds dr
          WHERE dr.id = round_id AND dr.driver_id = auth.uid()
        )
      ELSE has_permission('rblt', 'edit')
    END
  );

CREATE POLICY "Delete delivery_returns" ON delivery_returns
  FOR DELETE USING (has_permission('rblt', 'delete'));

-- ============================================
-- 10. POLITIQUES RLS POUR DELIVERY_RETURN_ITEMS
-- ============================================

CREATE POLICY "View delivery_return_items" ON delivery_return_items
  FOR SELECT USING (
    CASE
      WHEN is_livreur() THEN
        EXISTS (
          SELECT 1 FROM delivery_returns dret
          JOIN delivery_rounds dr ON dr.id = dret.round_id
          WHERE dret.id = return_id AND dr.driver_id = auth.uid()
        )
      ELSE has_permission('rblt', 'view')
    END
  );

CREATE POLICY "Manage delivery_return_items" ON delivery_return_items
  FOR ALL USING (
    CASE
      WHEN is_livreur() THEN
        EXISTS (
          SELECT 1 FROM delivery_returns dret
          JOIN delivery_rounds dr ON dr.id = dret.round_id
          WHERE dret.id = return_id AND dr.driver_id = auth.uid()
        )
      ELSE has_permission('rblt', 'edit')
    END
  );

-- ============================================
-- 11. POLITIQUES RLS POUR FICHES_TRAJET (FT)
-- ============================================

CREATE POLICY "View fiches_trajet" ON fiches_trajet
  FOR SELECT USING (
    CASE
      WHEN is_livreur() THEN
        driver_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM delivery_rounds dr
          WHERE dr.id = round_id AND dr.driver_id = auth.uid()
        )
      ELSE has_permission('fiches-trajet', 'view')
    END
  );

CREATE POLICY "Create fiches_trajet" ON fiches_trajet
  FOR INSERT WITH CHECK (has_permission('fiches-trajet', 'create'));

CREATE POLICY "Update fiches_trajet" ON fiches_trajet
  FOR UPDATE USING (
    CASE
      WHEN is_livreur() THEN
        driver_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM delivery_rounds dr
          WHERE dr.id = round_id AND dr.driver_id = auth.uid()
        )
      ELSE has_permission('fiches-trajet', 'edit')
    END
  );

CREATE POLICY "Delete fiches_trajet" ON fiches_trajet
  FOR DELETE USING (has_permission('fiches-trajet', 'delete'));

-- ============================================
-- 12. POLITIQUES RLS POUR CLIENTS
-- Livreur voit UNIQUEMENT les clients des BL dans ses BLT
-- ============================================

CREATE POLICY "View clients" ON clients
  FOR SELECT USING (
    CASE
      WHEN is_livreur() THEN
        EXISTS (
          SELECT 1 FROM deliveries d
          JOIN delivery_round_items dri ON dri.delivery_id = d.id
          JOIN delivery_rounds dr ON dr.id = dri.round_id
          WHERE d.client_id = clients.id AND dr.driver_id = auth.uid()
        )
      ELSE has_permission('clients', 'view')
    END
  );

CREATE POLICY "Create clients" ON clients
  FOR INSERT WITH CHECK (has_permission('clients', 'create'));

CREATE POLICY "Update clients" ON clients
  FOR UPDATE USING (has_permission('clients', 'edit'));

CREATE POLICY "Delete clients" ON clients
  FOR DELETE USING (has_permission('clients', 'delete'));

-- ============================================
-- 13. POLITIQUES RLS POUR ORDERS (BC)
-- ============================================

CREATE POLICY "View orders" ON orders
  FOR SELECT USING (
    CASE
      WHEN is_livreur() THEN
        EXISTS (
          SELECT 1 FROM deliveries d
          JOIN delivery_round_items dri ON dri.delivery_id = d.id
          JOIN delivery_rounds dr ON dr.id = dri.round_id
          WHERE d.order_id = orders.id AND dr.driver_id = auth.uid()
        )
      ELSE has_permission('commandes', 'view')
    END
  );

CREATE POLICY "Create orders" ON orders
  FOR INSERT WITH CHECK (has_permission('commandes', 'create'));

CREATE POLICY "Update orders" ON orders
  FOR UPDATE USING (has_permission('commandes', 'edit'));

-- ============================================
-- 14. POLITIQUES RLS POUR ORDER_ITEMS
-- ============================================

CREATE POLICY "View order_items" ON order_items
  FOR SELECT USING (
    CASE
      WHEN is_livreur() THEN
        EXISTS (
          SELECT 1 FROM orders o
          JOIN deliveries d ON d.order_id = o.id
          JOIN delivery_round_items dri ON dri.delivery_id = d.id
          JOIN delivery_rounds dr ON dr.id = dri.round_id
          WHERE o.id = order_id AND dr.driver_id = auth.uid()
        )
      ELSE has_permission('commandes', 'view')
    END
  );

CREATE POLICY "Manage order_items" ON order_items
  FOR ALL USING (has_permission('commandes', 'edit'));

-- ============================================
-- 15. INDEX POUR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_deliveries_driver_id ON deliveries(driver_id);
CREATE INDEX IF NOT EXISTS idx_delivery_returns_user_id ON delivery_returns(user_id);
CREATE INDEX IF NOT EXISTS idx_fiches_trajet_driver_id ON fiches_trajet(driver_id);
CREATE INDEX IF NOT EXISTS idx_delivery_rounds_driver_id ON delivery_rounds(driver_id);
CREATE INDEX IF NOT EXISTS idx_delivery_round_items_round_id ON delivery_round_items(round_id);
CREATE INDEX IF NOT EXISTS idx_delivery_round_items_delivery_id ON delivery_round_items(delivery_id);
