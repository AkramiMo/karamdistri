-- Migration: Suivi des livraisons
-- Date: 2026-09-27
-- Description: Table pour le suivi des livraisons avec transporteur

-- Create table for delivery tracking
CREATE TABLE IF NOT EXISTS public.suivi_livraisons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    client_name VARCHAR(255), -- Stored for historical tracking
    ville VARCHAR(255),
    transporteur VARCHAR(255),
    numero_bl VARCHAR(100),
    numero_facture VARCHAR(100),
    numero_envoi VARCHAR(100),
    nombre_palettes_colis VARCHAR(50), -- Format flexible: "2 palettes", "5 colis", etc.
    mode_paiement VARCHAR(50), -- cash, check, transfer, card, etc.
    montant_ht DECIMAL(15, 2) DEFAULT 0,
    recu BOOLEAN DEFAULT FALSE,
    indemnite DECIMAL(15, 2) DEFAULT 0, -- Ind (indemnité)
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_suivi_livraisons_date ON public.suivi_livraisons(date DESC);
CREATE INDEX IF NOT EXISTS idx_suivi_livraisons_client_id ON public.suivi_livraisons(client_id);
CREATE INDEX IF NOT EXISTS idx_suivi_livraisons_transporteur ON public.suivi_livraisons(transporteur);
CREATE INDEX IF NOT EXISTS idx_suivi_livraisons_numero_bl ON public.suivi_livraisons(numero_bl);
CREATE INDEX IF NOT EXISTS idx_suivi_livraisons_numero_facture ON public.suivi_livraisons(numero_facture);

-- Trigger for updated_at
CREATE TRIGGER update_suivi_livraisons_updated_at
    BEFORE UPDATE ON public.suivi_livraisons
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

-- Disable RLS (matching pattern from migration 065)
ALTER TABLE public.suivi_livraisons DISABLE ROW LEVEL SECURITY;

-- Comments
COMMENT ON TABLE public.suivi_livraisons IS 'Suivi des livraisons avec transporteur';
COMMENT ON COLUMN public.suivi_livraisons.numero_bl IS 'Numéro du bon de livraison';
COMMENT ON COLUMN public.suivi_livraisons.numero_facture IS 'Numéro de la facture';
COMMENT ON COLUMN public.suivi_livraisons.numero_envoi IS 'Numéro d''envoi du transporteur';
COMMENT ON COLUMN public.suivi_livraisons.nombre_palettes_colis IS 'Nombre de palettes ou colis';
COMMENT ON COLUMN public.suivi_livraisons.indemnite IS 'Indemnité associée à la livraison';
