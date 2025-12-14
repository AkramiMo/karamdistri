-- ============================================
-- AKKA ERP - Schema Initial
-- ============================================

-- ============================================
-- 1. SYSTÈME D'AUTHENTIFICATION & PERMISSIONS
-- ============================================

-- Table des rôles
CREATE TABLE IF NOT EXISTS public.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Table des modules
CREATE TABLE IF NOT EXISTS public.modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  icon TEXT,
  path TEXT NOT NULL,
  parent_id UUID REFERENCES public.modules(id),
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true
);

-- Table des permissions (rôle <-> module)
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE,
  module_id UUID REFERENCES public.modules(id) ON DELETE CASCADE,
  can_view BOOLEAN DEFAULT false,
  can_create BOOLEAN DEFAULT false,
  can_edit BOOLEAN DEFAULT false,
  can_delete BOOLEAN DEFAULT false,
  UNIQUE(role_id, module_id)
);

-- Table des utilisateurs (extension de auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role_id UUID REFERENCES public.roles(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 2. ENTITÉS MÉTIER
-- ============================================

-- Catégories de produits
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  parent_id UUID REFERENCES public.categories(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Emballages
CREATE TABLE IF NOT EXISTS public.packagings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  volume DECIMAL(10, 2),
  weight DECIMAL(10, 3),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Articles / Produits
CREATE TABLE IF NOT EXISTS public.articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  barcode TEXT,
  name TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES public.categories(id),
  unit TEXT DEFAULT 'unité',
  price_ht DECIMAL(10, 2) NOT NULL,
  tva_rate DECIMAL(5, 2) DEFAULT 20.00,
  weight_net DECIMAL(10, 3),
  weight_gross DECIMAL(10, 3),
  packaging_id UUID REFERENCES public.packagings(id),
  min_stock INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Clients
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  category TEXT,
  name TEXT NOT NULL,
  contact_name TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  gps_lat DECIMAL(10, 8),
  gps_lng DECIMAL(11, 8),
  image_url TEXT,
  commercial_id UUID REFERENCES public.users(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Fournisseurs
CREATE TABLE IF NOT EXISTS public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  contact_name TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Stock
CREATE TABLE IF NOT EXISTS public.stock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID REFERENCES public.articles(id) ON DELETE CASCADE,
  quantity INT NOT NULL DEFAULT 0,
  warehouse TEXT DEFAULT 'principal',
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(article_id, warehouse)
);

-- Mouvements de stock
CREATE TABLE IF NOT EXISTS public.stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID REFERENCES public.articles(id),
  quantity INT NOT NULL,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('in', 'out', 'adjustment')),
  reference_type TEXT,
  reference_id UUID,
  notes TEXT,
  user_id UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Commandes clients
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE NOT NULL,
  client_id UUID REFERENCES public.clients(id),
  commercial_id UUID REFERENCES public.users(id),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed', 'in_progress', 'delivered', 'cancelled')),
  order_date DATE DEFAULT CURRENT_DATE,
  delivery_date DATE,
  total_ht DECIMAL(12, 2) DEFAULT 0,
  total_tva DECIMAL(12, 2) DEFAULT 0,
  total_ttc DECIMAL(12, 2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Lignes de commande
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  article_id UUID REFERENCES public.articles(id),
  quantity INT NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  discount_percent DECIMAL(5, 2) DEFAULT 0,
  total_ht DECIMAL(12, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Bons de livraison
CREATE TABLE IF NOT EXISTS public.deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_number TEXT UNIQUE NOT NULL,
  order_id UUID REFERENCES public.orders(id),
  client_id UUID REFERENCES public.clients(id),
  driver_id UUID REFERENCES public.users(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'delivered', 'partial', 'returned')),
  delivery_date DATE,
  total_ht DECIMAL(12, 2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Lignes de livraison
CREATE TABLE IF NOT EXISTS public.delivery_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id UUID REFERENCES public.deliveries(id) ON DELETE CASCADE,
  article_id UUID REFERENCES public.articles(id),
  quantity_ordered INT,
  quantity_delivered INT,
  quantity_returned INT DEFAULT 0,
  unit_price DECIMAL(10, 2),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Ventes / Encaissements
CREATE TABLE IF NOT EXISTS public.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_number TEXT UNIQUE NOT NULL,
  delivery_id UUID REFERENCES public.deliveries(id),
  client_id UUID REFERENCES public.clients(id),
  sale_date DATE DEFAULT CURRENT_DATE,
  total_ht DECIMAL(12, 2),
  total_ttc DECIMAL(12, 2),
  payment_method TEXT CHECK (payment_method IN ('cash', 'check', 'transfer', 'card')),
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'partial', 'paid')),
  user_id UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Caisse
CREATE TABLE IF NOT EXISTS public.cash_register (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_date DATE DEFAULT CURRENT_DATE,
  category TEXT,
  operation_type TEXT CHECK (operation_type IN ('in', 'out')),
  amount DECIMAL(12, 2) NOT NULL,
  reference TEXT,
  reference_id UUID,
  notes TEXT,
  user_id UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Bons de commande fournisseur
CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number TEXT UNIQUE NOT NULL,
  supplier_id UUID REFERENCES public.suppliers(id),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'partial', 'received', 'cancelled')),
  order_date DATE DEFAULT CURRENT_DATE,
  total_ht DECIMAL(12, 2),
  notes TEXT,
  user_id UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Lignes de bon de commande fournisseur
CREATE TABLE IF NOT EXISTS public.purchase_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  article_id UUID REFERENCES public.articles(id),
  quantity INT NOT NULL,
  unit_price DECIMAL(10, 2),
  total_ht DECIMAL(12, 2),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Bons de réception
CREATE TABLE IF NOT EXISTS public.receptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reception_number TEXT UNIQUE NOT NULL,
  purchase_order_id UUID REFERENCES public.purchase_orders(id),
  supplier_id UUID REFERENCES public.suppliers(id),
  reception_date DATE DEFAULT CURRENT_DATE,
  total_ht DECIMAL(12, 2),
  notes TEXT,
  user_id UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Lignes de réception
CREATE TABLE IF NOT EXISTS public.reception_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reception_id UUID REFERENCES public.receptions(id) ON DELETE CASCADE,
  article_id UUID REFERENCES public.articles(id),
  quantity_expected INT,
  quantity_received INT,
  unit_price DECIMAL(10, 2),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 3. FONCTIONS UTILITAIRES
-- ============================================

-- Fonction pour générer des numéros séquentiels
CREATE OR REPLACE FUNCTION generate_sequence_number(prefix TEXT, table_name TEXT)
RETURNS TEXT AS $$
DECLARE
  next_num INT;
  result TEXT;
BEGIN
  EXECUTE format('SELECT COALESCE(MAX(CAST(SUBSTRING(%I FROM ''[0-9]+$'') AS INT)), 0) + 1 FROM %I',
    CASE
      WHEN table_name = 'orders' THEN 'order_number'
      WHEN table_name = 'deliveries' THEN 'delivery_number'
      WHEN table_name = 'sales' THEN 'sale_number'
      WHEN table_name = 'purchase_orders' THEN 'po_number'
      WHEN table_name = 'receptions' THEN 'reception_number'
      ELSE 'code'
    END,
    table_name
  ) INTO next_num;

  result := prefix || LPAD(next_num::TEXT, 6, '0');
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour vérifier les permissions
CREATE OR REPLACE FUNCTION has_permission(
  p_module_code TEXT,
  p_permission TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_role_id UUID;
  v_has_perm BOOLEAN;
BEGIN
  SELECT role_id INTO v_role_id
  FROM public.users
  WHERE id = auth.uid();

  IF EXISTS (SELECT 1 FROM public.roles WHERE id = v_role_id AND name = 'admin') THEN
    RETURN TRUE;
  END IF;

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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 4. ROW LEVEL SECURITY (RLS)
-- ============================================

-- Activer RLS sur toutes les tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_register ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receptions ENABLE ROW LEVEL SECURITY;

-- Policies pour les utilisateurs
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Policies pour les rôles (lecture seule pour tous les authentifiés)
CREATE POLICY "Authenticated users can view roles" ON public.roles
  FOR SELECT TO authenticated USING (true);

-- Policies pour les modules (lecture seule pour tous les authentifiés)
CREATE POLICY "Authenticated users can view modules" ON public.modules
  FOR SELECT TO authenticated USING (true);

-- Policies pour les permissions
CREATE POLICY "Authenticated users can view permissions" ON public.role_permissions
  FOR SELECT TO authenticated USING (true);

-- Policies génériques basées sur les permissions
CREATE POLICY "View clients" ON public.clients
  FOR SELECT USING (has_permission('clients', 'view'));

CREATE POLICY "Create clients" ON public.clients
  FOR INSERT WITH CHECK (has_permission('clients', 'create'));

CREATE POLICY "Update clients" ON public.clients
  FOR UPDATE USING (has_permission('clients', 'edit'));

CREATE POLICY "Delete clients" ON public.clients
  FOR DELETE USING (has_permission('clients', 'delete'));

-- Articles
CREATE POLICY "View articles" ON public.articles
  FOR SELECT USING (has_permission('articles', 'view'));

CREATE POLICY "Create articles" ON public.articles
  FOR INSERT WITH CHECK (has_permission('articles', 'create'));

CREATE POLICY "Update articles" ON public.articles
  FOR UPDATE USING (has_permission('articles', 'edit'));

CREATE POLICY "Delete articles" ON public.articles
  FOR DELETE USING (has_permission('articles', 'delete'));

-- Categories (lecture pour tous)
CREATE POLICY "View categories" ON public.categories
  FOR SELECT TO authenticated USING (true);

-- Commandes
CREATE POLICY "View orders" ON public.orders
  FOR SELECT USING (has_permission('commandes', 'view'));

CREATE POLICY "Create orders" ON public.orders
  FOR INSERT WITH CHECK (has_permission('commandes', 'create'));

CREATE POLICY "Update orders" ON public.orders
  FOR UPDATE USING (has_permission('commandes', 'edit'));

-- Order items
CREATE POLICY "View order items" ON public.order_items
  FOR SELECT USING (has_permission('commandes', 'view'));

CREATE POLICY "Manage order items" ON public.order_items
  FOR ALL USING (has_permission('commandes', 'edit'));

-- Livraisons
CREATE POLICY "View deliveries" ON public.deliveries
  FOR SELECT USING (has_permission('livraisons', 'view'));

CREATE POLICY "Create deliveries" ON public.deliveries
  FOR INSERT WITH CHECK (has_permission('livraisons', 'create'));

CREATE POLICY "Update deliveries" ON public.deliveries
  FOR UPDATE USING (has_permission('livraisons', 'edit'));

-- Delivery items
CREATE POLICY "View delivery items" ON public.delivery_items
  FOR SELECT USING (has_permission('livraisons', 'view'));

CREATE POLICY "Manage delivery items" ON public.delivery_items
  FOR ALL USING (has_permission('livraisons', 'edit'));

-- Ventes
CREATE POLICY "View sales" ON public.sales
  FOR SELECT USING (has_permission('ventes', 'view'));

CREATE POLICY "Create sales" ON public.sales
  FOR INSERT WITH CHECK (has_permission('ventes', 'create'));

CREATE POLICY "Update sales" ON public.sales
  FOR UPDATE USING (has_permission('ventes', 'edit'));

-- Caisse
CREATE POLICY "View cash register" ON public.cash_register
  FOR SELECT USING (has_permission('caisse', 'view'));

CREATE POLICY "Create cash entry" ON public.cash_register
  FOR INSERT WITH CHECK (has_permission('caisse', 'create'));

-- Stock
CREATE POLICY "View stock" ON public.stock
  FOR SELECT USING (has_permission('stocks', 'view'));

CREATE POLICY "Manage stock" ON public.stock
  FOR ALL USING (has_permission('stocks', 'edit'));

-- Stock movements
CREATE POLICY "View stock movements" ON public.stock_movements
  FOR SELECT USING (has_permission('stocks', 'view'));

CREATE POLICY "Create stock movements" ON public.stock_movements
  FOR INSERT WITH CHECK (has_permission('stocks', 'create'));

-- Fournisseurs
CREATE POLICY "View suppliers" ON public.suppliers
  FOR SELECT TO authenticated USING (true);

-- Purchase orders & Receptions
CREATE POLICY "View purchase orders" ON public.purchase_orders
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "View receptions" ON public.receptions
  FOR SELECT TO authenticated USING (true);

-- ============================================
-- 5. DONNÉES INITIALES
-- ============================================

-- Insérer les rôles par défaut
INSERT INTO public.roles (name, description) VALUES
  ('admin', 'Administrateur avec tous les droits'),
  ('commercial', 'Commercial - Gestion clients et commandes'),
  ('livreur', 'Livreur - Gestion des livraisons'),
  ('caissier', 'Caissier - Gestion de caisse')
ON CONFLICT (name) DO NOTHING;

-- Insérer les modules
INSERT INTO public.modules (code, name, icon, path, sort_order) VALUES
  ('dashboard', 'Tableau de bord', 'LayoutDashboard', '/', 0),
  ('clients', 'Clients', 'Users', '/clients', 1),
  ('articles', 'Articles', 'Package', '/articles', 2),
  ('commandes', 'Commandes', 'ShoppingCart', '/commandes', 3),
  ('livraisons', 'Livraisons', 'Truck', '/livraisons', 4),
  ('ventes', 'Ventes', 'DollarSign', '/ventes', 5),
  ('stocks', 'Stocks', 'Warehouse', '/stocks', 6),
  ('caisse', 'Caisse', 'Wallet', '/caisse', 7),
  ('fournisseurs', 'Fournisseurs', 'Building2', '/fournisseurs', 8),
  ('achats', 'Achats', 'FileText', '/achats', 9),
  ('admin', 'Administration', 'Settings', '/admin', 99)
ON CONFLICT (code) DO NOTHING;

-- Attribuer toutes les permissions au rôle admin
INSERT INTO public.role_permissions (role_id, module_id, can_view, can_create, can_edit, can_delete)
SELECT r.id, m.id, true, true, true, true
FROM public.roles r
CROSS JOIN public.modules m
WHERE r.name = 'admin'
ON CONFLICT (role_id, module_id) DO NOTHING;

-- Permissions pour le commercial
INSERT INTO public.role_permissions (role_id, module_id, can_view, can_create, can_edit, can_delete)
SELECT r.id, m.id, true, true, true, false
FROM public.roles r
CROSS JOIN public.modules m
WHERE r.name = 'commercial' AND m.code IN ('dashboard', 'clients', 'articles', 'commandes', 'stocks')
ON CONFLICT (role_id, module_id) DO NOTHING;

-- Permissions pour le livreur
INSERT INTO public.role_permissions (role_id, module_id, can_view, can_create, can_edit, can_delete)
SELECT r.id, m.id,
  true,
  CASE WHEN m.code = 'livraisons' THEN true ELSE false END,
  CASE WHEN m.code = 'livraisons' THEN true ELSE false END,
  false
FROM public.roles r
CROSS JOIN public.modules m
WHERE r.name = 'livreur' AND m.code IN ('dashboard', 'livraisons', 'clients')
ON CONFLICT (role_id, module_id) DO NOTHING;

-- Permissions pour le caissier
INSERT INTO public.role_permissions (role_id, module_id, can_view, can_create, can_edit, can_delete)
SELECT r.id, m.id, true, true, true, false
FROM public.roles r
CROSS JOIN public.modules m
WHERE r.name = 'caissier' AND m.code IN ('dashboard', 'caisse', 'ventes')
ON CONFLICT (role_id, module_id) DO NOTHING;

-- ============================================
-- 6. TRIGGERS
-- ============================================

-- Trigger pour créer automatiquement un profil utilisateur
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  default_role_id UUID;
BEGIN
  -- Récupérer l'ID du rôle commercial par défaut
  SELECT id INTO default_role_id FROM public.roles WHERE name = 'commercial' LIMIT 1;

  INSERT INTO public.users (id, email, full_name, role_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    default_role_id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Créer le trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_articles_updated_at BEFORE UPDATE ON public.articles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_deliveries_updated_at BEFORE UPDATE ON public.deliveries
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
