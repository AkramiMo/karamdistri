-- Migration: Lots (Suivi des lots d'olives)
-- Date: 2026-03-26
-- Description: Table pour le suivi des lots d'olives avec traçabilité complète

-- Table des lots
CREATE TABLE IF NOT EXISTS public.lots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Numéro de lot: AAAAMMJJ-FOURNISSEUR-ORIGINE-CALIBRE-TYPE
  -- Exemple: 20260325-AGR01-MEK-18/20-NOIR
  lot_number TEXT UNIQUE NOT NULL,

  -- Référence fournisseur
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,

  -- Informations du lot
  origin TEXT,                                    -- Origine (MEK, FES, etc.)
  olive_type TEXT NOT NULL,                       -- Type d'olive (noir, vert, tournant, etc.)
  caliber TEXT,                                   -- Calibre (18/20, 20/22, etc.)

  -- Dates
  purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reception_id UUID REFERENCES public.receptions(id) ON DELETE SET NULL,

  -- Quantités et prix
  quantity_kg DECIMAL(12, 2) NOT NULL,            -- Quantité en kg
  purchase_price_kg DECIMAL(10, 2) NOT NULL,      -- Prix d'achat par kg (important pour calcul bénéfice)
  total_amount DECIMAL(12, 2) GENERATED ALWAYS AS (quantity_kg * purchase_price_kg) STORED,

  -- Quantité restante (pour suivi de consommation)
  remaining_quantity_kg DECIMAL(12, 2),

  -- État du lot
  state TEXT DEFAULT 'brut' CHECK (state IN ('brut', 'fermente', 'pret_a_conditionner', 'conditionne', 'epuise')),

  -- Caractéristiques techniques
  salt_rate DECIMAL(5, 2),                        -- Taux de sel/saumure en %
  brine_density DECIMAL(5, 2),                    -- Densité de la saumure (optionnel)

  -- Qualité
  quality_grade TEXT CHECK (quality_grade IN ('A', 'B', 'C', 'D')),
  quality_remarks TEXT,

  -- Métadonnées
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index pour recherche rapide par numéro de lot
CREATE INDEX IF NOT EXISTS idx_lots_lot_number ON public.lots(lot_number);
CREATE INDEX IF NOT EXISTS idx_lots_supplier_id ON public.lots(supplier_id);
CREATE INDEX IF NOT EXISTS idx_lots_purchase_date ON public.lots(purchase_date);
CREATE INDEX IF NOT EXISTS idx_lots_state ON public.lots(state);
CREATE INDEX IF NOT EXISTS idx_lots_olive_type ON public.lots(olive_type);

-- Initialiser remaining_quantity_kg avec quantity_kg lors de l'insertion
CREATE OR REPLACE FUNCTION public.init_lot_remaining_quantity()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.remaining_quantity_kg IS NULL THEN
    NEW.remaining_quantity_kg := NEW.quantity_kg;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_lot_remaining_quantity
  BEFORE INSERT ON public.lots
  FOR EACH ROW EXECUTE FUNCTION public.init_lot_remaining_quantity();

-- Trigger pour updated_at
CREATE TRIGGER update_lots_updated_at
  BEFORE UPDATE ON public.lots
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Fonction pour générer automatiquement le numéro de lot
CREATE OR REPLACE FUNCTION public.generate_lot_number(
  p_purchase_date DATE,
  p_supplier_code TEXT,
  p_origin TEXT,
  p_caliber TEXT,
  p_olive_type TEXT
)
RETURNS TEXT AS $$
DECLARE
  v_date_part TEXT;
  v_lot_number TEXT;
  v_counter INT := 1;
BEGIN
  -- Format date: AAAAMMJJ
  v_date_part := TO_CHAR(p_purchase_date, 'YYYYMMDD');

  -- Construire le numéro de lot
  v_lot_number := v_date_part || '-' ||
                  UPPER(COALESCE(p_supplier_code, 'XXX')) || '-' ||
                  UPPER(COALESCE(p_origin, 'XXX')) || '-' ||
                  COALESCE(p_caliber, 'XX') || '-' ||
                  UPPER(COALESCE(p_olive_type, 'XXX'));

  -- Vérifier si ce numéro existe déjà, si oui ajouter un suffixe
  WHILE EXISTS (SELECT 1 FROM public.lots WHERE lot_number = v_lot_number || CASE WHEN v_counter > 1 THEN '-' || v_counter ELSE '' END) LOOP
    v_counter := v_counter + 1;
  END LOOP;

  IF v_counter > 1 THEN
    v_lot_number := v_lot_number || '-' || v_counter;
  END IF;

  RETURN v_lot_number;
END;
$$ LANGUAGE plpgsql;

-- Enable RLS
ALTER TABLE public.lots ENABLE ROW LEVEL SECURITY;

-- Policies pour les lots (utilise le module achats/receptions)
CREATE POLICY "View lots" ON public.lots
  FOR SELECT USING (has_permission('achats', 'view'));

CREATE POLICY "Create lots" ON public.lots
  FOR INSERT WITH CHECK (has_permission('achats', 'create'));

CREATE POLICY "Update lots" ON public.lots
  FOR UPDATE USING (has_permission('achats', 'edit'));

CREATE POLICY "Delete lots" ON public.lots
  FOR DELETE USING (has_permission('achats', 'delete'));

-- Grant permissions
GRANT ALL ON public.lots TO authenticated;

-- Ajouter un module "Lots" dans la navigation (optionnel - sous-module de Achats)
INSERT INTO public.modules (code, name, icon, path, sort_order, is_active)
VALUES ('lots', 'Lots', 'Layers', '/lots', 11, true)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  icon = EXCLUDED.icon,
  path = EXCLUDED.path,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active;

-- Ajouter les permissions pour le rôle admin
INSERT INTO public.role_permissions (role_id, module_id, can_view, can_create, can_edit, can_delete)
SELECT
  r.id as role_id,
  m.id as module_id,
  true, true, true, true
FROM public.roles r
CROSS JOIN public.modules m
WHERE r.name = 'admin'
AND m.code = 'lots'
ON CONFLICT (role_id, module_id) DO NOTHING;

-- Commentaires
COMMENT ON TABLE public.lots IS 'Suivi des lots d''olives avec traçabilité complète';
COMMENT ON COLUMN public.lots.lot_number IS 'Numéro unique du lot format: AAAAMMJJ-FOURNISSEUR-ORIGINE-CALIBRE-TYPE';
COMMENT ON COLUMN public.lots.purchase_price_kg IS 'Prix d''achat par kg - essentiel pour calcul des bénéfices';
COMMENT ON COLUMN public.lots.state IS 'État du lot: brut, fermente, pret_a_conditionner, conditionne, epuise';
COMMENT ON COLUMN public.lots.salt_rate IS 'Taux de sel/saumure en pourcentage';
COMMENT ON COLUMN public.lots.remaining_quantity_kg IS 'Quantité restante après utilisation/conditionnement';
