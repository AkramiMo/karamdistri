-- ============================================
-- Migration: Réactiver RLS sur toutes les tables
-- Description: Sécuriser la base de données contre les accès anonymes
-- Version: Compatible avec les tables existantes uniquement
-- ============================================

-- ============================================
-- 1. RÉACTIVER RLS SUR TOUTES LES TABLES
-- ============================================

-- Tables d'authentification et permissions
ALTER TABLE IF EXISTS users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS role_permissions ENABLE ROW LEVEL SECURITY;

-- Tables principales
ALTER TABLE IF EXISTS articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS articles_vendus ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS cash_register ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS client_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS company_settings ENABLE ROW LEVEL SECURITY;

-- Commandes et livraisons
ALTER TABLE IF EXISTS orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS delivery_items ENABLE ROW LEVEL SECURITY;

-- Tournées et retours
ALTER TABLE IF EXISTS delivery_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS delivery_round_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS delivery_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS delivery_return_items ENABLE ROW LEVEL SECURITY;

-- Ventes
ALTER TABLE IF EXISTS sales ENABLE ROW LEVEL SECURITY;

-- Devis client
ALTER TABLE IF EXISTS client_quote_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS client_quote_request_items ENABLE ROW LEVEL SECURITY;

-- Devis fournisseur
ALTER TABLE IF EXISTS supplier_quote_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS supplier_quote_request_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS supplier_quote_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS supplier_quote_response_items ENABLE ROW LEVEL SECURITY;

-- Achats et fournisseurs
ALTER TABLE IF EXISTS suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS receptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS reception_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS reception_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS supplies ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS supply_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS supply_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS supply_stock_movements ENABLE ROW LEVEL SECURITY;

-- Facturation et paiements
ALTER TABLE IF EXISTS invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS factures ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS payments ENABLE ROW LEVEL SECURITY;

-- Stock
ALTER TABLE IF EXISTS stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS lots ENABLE ROW LEVEL SECURITY;

-- Configuration et autres
ALTER TABLE IF EXISTS packagings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS emballages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS document_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS fiches_trajet ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 2. SUPPRIMER LES ANCIENNES POLITIQUES
-- ============================================

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- ============================================
-- 3. CRÉER LES POLITIQUES DYNAMIQUEMENT
-- Stratégie: Accès complet pour les utilisateurs authentifiés
-- Protection contre les accès anonymes
-- ============================================

DO $$
DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY[
    'users', 'roles', 'modules', 'role_permissions',
    'articles', 'articles_vendus', 'cash_register', 'categories',
    'client_prices', 'clients', 'company_settings',
    'orders', 'order_items', 'deliveries', 'delivery_items',
    'delivery_rounds', 'delivery_round_items', 'delivery_returns', 'delivery_return_items',
    'sales',
    'client_quote_requests', 'client_quote_request_items',
    'supplier_quote_requests', 'supplier_quote_request_items',
    'supplier_quote_responses', 'supplier_quote_response_items',
    'suppliers', 'purchase_orders', 'purchase_order_items',
    'receptions', 'reception_items', 'reception_documents',
    'supplies', 'supply_categories', 'supply_stock', 'supply_stock_movements',
    'invoices', 'invoice_items', 'factures', 'payments',
    'stock', 'stock_movements', 'lots',
    'packagings', 'emballages', 'packs', 'document_sequences', 'fiches_trajet'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    -- Vérifier si la table existe
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
      -- Créer les 4 politiques pour chaque table
      EXECUTE format('CREATE POLICY %I ON %I FOR SELECT TO authenticated USING (true)', tbl || '_select', tbl);
      EXECUTE format('CREATE POLICY %I ON %I FOR INSERT TO authenticated WITH CHECK (true)', tbl || '_insert', tbl);
      EXECUTE format('CREATE POLICY %I ON %I FOR UPDATE TO authenticated USING (true)', tbl || '_update', tbl);
      EXECUTE format('CREATE POLICY %I ON %I FOR DELETE TO authenticated USING (true)', tbl || '_delete', tbl);
      RAISE NOTICE 'Politiques créées pour: %', tbl;
    ELSE
      RAISE NOTICE 'Table ignorée (inexistante): %', tbl;
    END IF;
  END LOOP;
END $$;

-- ============================================
-- FIN DE LA MIGRATION
-- ============================================
-- Note: Les permissions fines sont gérées au niveau de l'application
-- via usePermissions() et ProtectedModule
-- Cette migration protège contre les accès anonymes non authentifiés
