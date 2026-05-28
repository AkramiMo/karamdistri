-- ============================================
-- RBLT - Bons de Retour de Livraison
-- ============================================

-- Table des bons de retour
CREATE TABLE IF NOT EXISTS public.delivery_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_number TEXT UNIQUE NOT NULL,
  delivery_id UUID REFERENCES public.deliveries(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id),
  return_date DATE DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'validated', 'cancelled')),
  return_reason TEXT,
  total_ht DECIMAL(12, 2) DEFAULT 0,
  notes TEXT,
  user_id UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table des lignes de retour
CREATE TABLE IF NOT EXISTS public.delivery_return_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id UUID REFERENCES public.delivery_returns(id) ON DELETE CASCADE,
  delivery_item_id UUID REFERENCES public.delivery_items(id),
  article_id UUID REFERENCES public.articles(id),
  quantity_returned INT NOT NULL,
  unit_price DECIMAL(10, 2),
  return_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_delivery_returns_delivery_id ON public.delivery_returns(delivery_id);
CREATE INDEX IF NOT EXISTS idx_delivery_returns_client_id ON public.delivery_returns(client_id);
CREATE INDEX IF NOT EXISTS idx_delivery_returns_return_date ON public.delivery_returns(return_date);
CREATE INDEX IF NOT EXISTS idx_delivery_return_items_return_id ON public.delivery_return_items(return_id);

-- RLS Policies
ALTER TABLE public.delivery_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_return_items ENABLE ROW LEVEL SECURITY;

-- Politique pour delivery_returns
CREATE POLICY "delivery_returns_select" ON public.delivery_returns
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "delivery_returns_insert" ON public.delivery_returns
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "delivery_returns_update" ON public.delivery_returns
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "delivery_returns_delete" ON public.delivery_returns
  FOR DELETE TO authenticated USING (true);

-- Politique pour delivery_return_items
CREATE POLICY "delivery_return_items_select" ON public.delivery_return_items
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "delivery_return_items_insert" ON public.delivery_return_items
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "delivery_return_items_update" ON public.delivery_return_items
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "delivery_return_items_delete" ON public.delivery_return_items
  FOR DELETE TO authenticated USING (true);
