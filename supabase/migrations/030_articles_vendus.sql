-- Migration: Create articles_vendus table
-- Stores sold articles (per article, per client) extracted from delivery round BLs upon RBLT validation

CREATE TABLE public.articles_vendus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  sale_date DATE NOT NULL,
  sale_number TEXT NOT NULL,
  article_id UUID NOT NULL REFERENCES public.articles(id),
  article_code TEXT NOT NULL,
  client_id UUID NOT NULL REFERENCES public.clients(id),
  client_code TEXT NOT NULL,
  quantity_sold INT NOT NULL,
  delivery_id UUID REFERENCES public.deliveries(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_articles_vendus_sale_id ON public.articles_vendus(sale_id);
CREATE INDEX idx_articles_vendus_article_id ON public.articles_vendus(article_id);
CREATE INDEX idx_articles_vendus_client_id ON public.articles_vendus(client_id);
CREATE INDEX idx_articles_vendus_sale_date ON public.articles_vendus(sale_date);
CREATE INDEX idx_articles_vendus_article_code ON public.articles_vendus(article_code);
CREATE INDEX idx_articles_vendus_client_code ON public.articles_vendus(client_code);

-- RLS
ALTER TABLE public.articles_vendus ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read articles_vendus"
  ON public.articles_vendus FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert articles_vendus"
  ON public.articles_vendus FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update articles_vendus"
  ON public.articles_vendus FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete articles_vendus"
  ON public.articles_vendus FOR DELETE
  TO authenticated
  USING (true);

-- Register module in modules table
INSERT INTO public.modules (code, name, icon, path, sort_order, is_active)
VALUES ('articles-vendus', 'Articles Vendus', 'FileText', '/articles-vendus', 5, true)
ON CONFLICT (code) DO NOTHING;

-- Grant all permissions to admin role for the new module
INSERT INTO public.role_permissions (role_id, module_id, can_view, can_create, can_edit, can_delete)
SELECT r.id, m.id, true, true, true, true
FROM public.roles r, public.modules m
WHERE r.name = 'admin' AND m.code = 'articles-vendus'
AND NOT EXISTS (
  SELECT 1 FROM public.role_permissions rp
  WHERE rp.role_id = r.id AND rp.module_id = m.id
);
