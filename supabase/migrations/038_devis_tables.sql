-- Migration: Create devis tables (DDC, DDF, RDF)
-- Date: 2026-03-02
-- Description: Tables for client quote requests, supplier quote requests, and supplier quote responses

-- =============================================
-- DDC: Demande de Devis Client
-- =============================================

CREATE TABLE IF NOT EXISTS public.client_quote_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ddc_number TEXT NOT NULL UNIQUE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  request_date DATE NOT NULL DEFAULT CURRENT_DATE,
  validity_date DATE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'expired')),
  total_ht DECIMAL(12,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.client_quote_request_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ddc_id UUID NOT NULL REFERENCES public.client_quote_requests(id) ON DELETE CASCADE,
  article_id UUID REFERENCES public.articles(id) ON DELETE SET NULL,
  article_code TEXT NOT NULL,
  article_name TEXT NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  unit_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for DDC
CREATE INDEX IF NOT EXISTS idx_client_quote_requests_client_id ON public.client_quote_requests(client_id);
CREATE INDEX IF NOT EXISTS idx_client_quote_requests_status ON public.client_quote_requests(status);
CREATE INDEX IF NOT EXISTS idx_client_quote_requests_request_date ON public.client_quote_requests(request_date);
CREATE INDEX IF NOT EXISTS idx_client_quote_request_items_ddc_id ON public.client_quote_request_items(ddc_id);

-- =============================================
-- DDF: Demande de Devis Fournisseur
-- =============================================

CREATE TABLE IF NOT EXISTS public.supplier_quote_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ddf_number TEXT NOT NULL UNIQUE,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  request_date DATE NOT NULL DEFAULT CURRENT_DATE,
  response_deadline DATE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'received', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.supplier_quote_request_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ddf_id UUID NOT NULL REFERENCES public.supplier_quote_requests(id) ON DELETE CASCADE,
  supply_id UUID REFERENCES public.supplies(id) ON DELETE SET NULL,
  supply_code TEXT NOT NULL,
  supply_name TEXT NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  estimated_price DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for DDF
CREATE INDEX IF NOT EXISTS idx_supplier_quote_requests_supplier_id ON public.supplier_quote_requests(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_quote_requests_status ON public.supplier_quote_requests(status);
CREATE INDEX IF NOT EXISTS idx_supplier_quote_requests_request_date ON public.supplier_quote_requests(request_date);
CREATE INDEX IF NOT EXISTS idx_supplier_quote_request_items_ddf_id ON public.supplier_quote_request_items(ddf_id);

-- =============================================
-- RDF: Reception de Devis Fournisseur
-- =============================================

CREATE TABLE IF NOT EXISTS public.supplier_quote_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rdf_number TEXT NOT NULL UNIQUE,
  ddf_id UUID REFERENCES public.supplier_quote_requests(id) ON DELETE SET NULL,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  reception_date DATE NOT NULL DEFAULT CURRENT_DATE,
  validity_date DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'converted', 'expired')),
  total_ht DECIMAL(12,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.supplier_quote_response_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rdf_id UUID NOT NULL REFERENCES public.supplier_quote_responses(id) ON DELETE CASCADE,
  supply_id UUID REFERENCES public.supplies(id) ON DELETE SET NULL,
  supply_code TEXT NOT NULL,
  supply_name TEXT NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  unit_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for RDF
CREATE INDEX IF NOT EXISTS idx_supplier_quote_responses_supplier_id ON public.supplier_quote_responses(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_quote_responses_ddf_id ON public.supplier_quote_responses(ddf_id);
CREATE INDEX IF NOT EXISTS idx_supplier_quote_responses_status ON public.supplier_quote_responses(status);
CREATE INDEX IF NOT EXISTS idx_supplier_quote_responses_reception_date ON public.supplier_quote_responses(reception_date);
CREATE INDEX IF NOT EXISTS idx_supplier_quote_response_items_rdf_id ON public.supplier_quote_response_items(rdf_id);

-- =============================================
-- RLS Policies
-- =============================================

-- DDC RLS
ALTER TABLE public.client_quote_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_quote_request_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read client_quote_requests"
  ON public.client_quote_requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert client_quote_requests"
  ON public.client_quote_requests FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update client_quote_requests"
  ON public.client_quote_requests FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete client_quote_requests"
  ON public.client_quote_requests FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can read client_quote_request_items"
  ON public.client_quote_request_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert client_quote_request_items"
  ON public.client_quote_request_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update client_quote_request_items"
  ON public.client_quote_request_items FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete client_quote_request_items"
  ON public.client_quote_request_items FOR DELETE TO authenticated USING (true);

-- DDF RLS
ALTER TABLE public.supplier_quote_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_quote_request_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read supplier_quote_requests"
  ON public.supplier_quote_requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert supplier_quote_requests"
  ON public.supplier_quote_requests FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update supplier_quote_requests"
  ON public.supplier_quote_requests FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete supplier_quote_requests"
  ON public.supplier_quote_requests FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can read supplier_quote_request_items"
  ON public.supplier_quote_request_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert supplier_quote_request_items"
  ON public.supplier_quote_request_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update supplier_quote_request_items"
  ON public.supplier_quote_request_items FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete supplier_quote_request_items"
  ON public.supplier_quote_request_items FOR DELETE TO authenticated USING (true);

-- RDF RLS
ALTER TABLE public.supplier_quote_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_quote_response_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read supplier_quote_responses"
  ON public.supplier_quote_responses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert supplier_quote_responses"
  ON public.supplier_quote_responses FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update supplier_quote_responses"
  ON public.supplier_quote_responses FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete supplier_quote_responses"
  ON public.supplier_quote_responses FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can read supplier_quote_response_items"
  ON public.supplier_quote_response_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert supplier_quote_response_items"
  ON public.supplier_quote_response_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update supplier_quote_response_items"
  ON public.supplier_quote_response_items FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete supplier_quote_response_items"
  ON public.supplier_quote_response_items FOR DELETE TO authenticated USING (true);

-- =============================================
-- Register module
-- =============================================

INSERT INTO public.modules (code, name, icon, path, sort_order, is_active)
VALUES ('devis', 'Devis', 'FileText', '/devis', 4, true)
ON CONFLICT (code) DO NOTHING;

-- Grant all permissions to admin role
INSERT INTO public.role_permissions (role_id, module_id, can_view, can_create, can_edit, can_delete)
SELECT r.id, m.id, true, true, true, true
FROM public.roles r, public.modules m
WHERE r.name = 'admin' AND m.code = 'devis'
AND NOT EXISTS (
  SELECT 1 FROM public.role_permissions rp
  WHERE rp.role_id = r.id AND rp.module_id = m.id
);
