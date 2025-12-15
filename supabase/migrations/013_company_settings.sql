-- Migration: Company settings for Moroccan business requirements
-- Date: 2025-01-15
-- Description: Add company settings table and ICE field to clients

-- Company settings table for invoices and documents
CREATE TABLE IF NOT EXISTS public.company_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL DEFAULT 'KARAM Olives & Sauces',
  address TEXT,
  city TEXT,
  postal_code TEXT,
  phone TEXT,
  fax TEXT,
  email TEXT,
  website TEXT,
  -- Moroccan business identifiers
  ice TEXT,  -- Identifiant Commun de l'Entreprise
  if_number TEXT,  -- Identifiant Fiscal
  rc TEXT,  -- Registre de Commerce
  patente TEXT,  -- Taxe Professionnelle (Patente)
  cnss TEXT,  -- CNSS number
  capital TEXT,  -- Capital social
  bank_name TEXT,
  bank_account TEXT,
  bank_rib TEXT,
  logo_url TEXT,
  invoice_footer TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default company settings
INSERT INTO public.company_settings (
  company_name,
  address,
  city,
  phone,
  email
)
VALUES (
  'KARAM Olives & Sauces',
  'Zone Industrielle',
  'Marrakech',
  '+212 5XX XX XX XX',
  'contact@karam-olives.ma'
)
ON CONFLICT DO NOTHING;

-- Add ICE field to clients table
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS ice TEXT;

-- Add comments
COMMENT ON TABLE public.company_settings IS 'Company information for invoices and official documents';
COMMENT ON COLUMN public.company_settings.ice IS 'Identifiant Commun de l''Entreprise (15 digits)';
COMMENT ON COLUMN public.company_settings.if_number IS 'Identifiant Fiscal';
COMMENT ON COLUMN public.company_settings.rc IS 'Numéro de Registre de Commerce';
COMMENT ON COLUMN public.company_settings.patente IS 'Numéro de Patente (Taxe Professionnelle)';
COMMENT ON COLUMN public.company_settings.cnss IS 'Numéro CNSS';

COMMENT ON COLUMN public.clients.ice IS 'ICE du client (Identifiant Commun de l''Entreprise)';

-- Enable RLS
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can manage company settings
CREATE POLICY "Admin manages company settings" ON public.company_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users u
      JOIN public.roles r ON u.role_id = r.id
      WHERE u.id = auth.uid() AND r.name = 'admin'
    )
  );

-- Grant permissions
GRANT ALL ON public.company_settings TO authenticated;
