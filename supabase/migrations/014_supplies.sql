-- Migration: Supplies (Fournitures) for purchasing
-- Date: 2025-01-15
-- Description: Add supplies table separate from sales articles

-- Supply categories
CREATE TABLE IF NOT EXISTS public.supply_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Supplies table
CREATE TABLE IF NOT EXISTS public.supplies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES public.supply_categories(id),
  unit TEXT DEFAULT 'unité',
  price_ht DECIMAL(10, 2) DEFAULT 0,
  is_custom BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default categories
INSERT INTO public.supply_categories (name, description, sort_order) VALUES
  ('Olives', 'Olives et produits dérivés', 1),
  ('Etiquettes', 'Etiquettes et labels', 2),
  ('Emballage', 'Matériaux d''emballage', 3),
  ('Autre', 'Fournitures personnalisées', 4)
ON CONFLICT DO NOTHING;

-- Insert predefined supplies (Olives category)
INSERT INTO public.supplies (code, name, category_id, unit)
SELECT code, name, (SELECT id FROM public.supply_categories WHERE name = 'Olives'), unit
FROM (VALUES
  ('OVE', 'Olives Vertes Entières', 'kg'),
  ('OVET', 'Olives Vertes Tournantes', 'kg'),
  ('OVD', 'Olives Vertes Dénoyautées', 'kg'),
  ('OVR', 'Olives Vertes Rondelles', 'kg'),
  ('OTR', 'Olives Tournantes Rondelles', 'kg'),
  ('OVCa', 'Olives Vertes Cassées', 'kg'),
  ('OVBCa', 'Olives Vertes/Brunes Cassées', 'kg'),
  ('OCkt', 'Olives Cocktail', 'kg'),
  ('OCktM', 'Olives Cocktail Mix', 'kg'),
  ('ONFG', 'Olives Noires Façon Grecque', 'kg'),
  ('ONE', 'Olives Noires Entières', 'kg'),
  ('ONFGD', 'Olives Noires FG Dénoyautées', 'kg'),
  ('ONR', 'Olives Noires Rondelles', 'kg'),
  ('ONBr', 'Olives Noires Brunes', 'kg'),
  ('Cor', 'Cornichons', 'kg'),
  ('CorR', 'Cornichons Rondelles', 'kg'),
  ('Ctr', 'Citrons', 'kg'),
  ('Var', 'Variantes', 'kg')
) AS t(code, name, unit)
ON CONFLICT (code) DO NOTHING;

-- Update purchase_order_items to reference supplies instead of articles
ALTER TABLE public.purchase_order_items
  ADD COLUMN IF NOT EXISTS supply_id UUID REFERENCES public.supplies(id);

-- Add comments
COMMENT ON TABLE public.supply_categories IS 'Categories for purchase supplies';
COMMENT ON TABLE public.supplies IS 'Supplies/materials for purchasing (separate from sales articles)';
COMMENT ON COLUMN public.supplies.is_custom IS 'True if this is a custom/user-added supply';

-- Enable RLS
ALTER TABLE public.supply_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplies ENABLE ROW LEVEL SECURITY;

-- Policies for supply_categories
CREATE POLICY "View supply categories" ON public.supply_categories
  FOR SELECT USING (has_permission('achats', 'view'));

CREATE POLICY "Manage supply categories" ON public.supply_categories
  FOR ALL USING (has_permission('achats', 'create'));

-- Policies for supplies
CREATE POLICY "View supplies" ON public.supplies
  FOR SELECT USING (has_permission('achats', 'view'));

CREATE POLICY "Create supplies" ON public.supplies
  FOR INSERT WITH CHECK (has_permission('achats', 'create'));

CREATE POLICY "Update supplies" ON public.supplies
  FOR UPDATE USING (has_permission('achats', 'edit'));

CREATE POLICY "Delete supplies" ON public.supplies
  FOR DELETE USING (has_permission('achats', 'delete'));

-- Grant permissions
GRANT ALL ON public.supply_categories TO authenticated;
GRANT ALL ON public.supplies TO authenticated;
