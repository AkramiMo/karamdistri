-- Migration: Automatic invoice numbering
-- Date: 2025-01-15
-- Description: Create a sequence-based system for generating unique invoice/sale numbers

-- Table to store document number sequences
CREATE TABLE IF NOT EXISTS public.document_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type TEXT UNIQUE NOT NULL,  -- 'facture', 'vente', 'commande', 'livraison', 'reception', 'bc'
  prefix TEXT NOT NULL,                 -- 'FAC', 'VTE', 'CMD', 'BL', 'BR', 'BC'
  current_number INT NOT NULL DEFAULT 0,
  year INT NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default sequences
INSERT INTO public.document_sequences (document_type, prefix, current_number, year)
VALUES
  ('facture', 'FAC', 0, EXTRACT(YEAR FROM CURRENT_DATE)::INT),
  ('vente', 'VTE', 0, EXTRACT(YEAR FROM CURRENT_DATE)::INT),
  ('commande', 'CMD', 0, EXTRACT(YEAR FROM CURRENT_DATE)::INT),
  ('livraison', 'BL', 0, EXTRACT(YEAR FROM CURRENT_DATE)::INT),
  ('reception', 'BR', 0, EXTRACT(YEAR FROM CURRENT_DATE)::INT),
  ('bon_commande', 'BC', 0, EXTRACT(YEAR FROM CURRENT_DATE)::INT)
ON CONFLICT (document_type) DO NOTHING;

-- Function to get next document number
CREATE OR REPLACE FUNCTION get_next_document_number(p_document_type TEXT)
RETURNS TEXT AS $$
DECLARE
  v_prefix TEXT;
  v_current_number INT;
  v_year INT;
  v_current_year INT;
  v_new_number INT;
  v_result TEXT;
BEGIN
  v_current_year := EXTRACT(YEAR FROM CURRENT_DATE)::INT;

  -- Lock the row to prevent concurrent updates
  SELECT prefix, current_number, year
  INTO v_prefix, v_current_number, v_year
  FROM public.document_sequences
  WHERE document_type = p_document_type
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Document type % not found', p_document_type;
  END IF;

  -- Reset counter if year changed
  IF v_year < v_current_year THEN
    v_new_number := 1;

    UPDATE public.document_sequences
    SET current_number = v_new_number,
        year = v_current_year,
        updated_at = now()
    WHERE document_type = p_document_type;
  ELSE
    v_new_number := v_current_number + 1;

    UPDATE public.document_sequences
    SET current_number = v_new_number,
        updated_at = now()
    WHERE document_type = p_document_type;
  END IF;

  -- Format: PREFIX-YEAR-NNNNNN (e.g., FAC-2025-000001)
  v_result := v_prefix || '-' || v_current_year || '-' || LPAD(v_new_number::TEXT, 6, '0');

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT ALL ON public.document_sequences TO authenticated;
GRANT EXECUTE ON FUNCTION get_next_document_number(TEXT) TO authenticated;

-- Enable RLS
ALTER TABLE public.document_sequences ENABLE ROW LEVEL SECURITY;

-- Policy to allow authenticated users to select and update
CREATE POLICY "Authenticated users can manage sequences" ON public.document_sequences
  FOR ALL USING (true);

COMMENT ON TABLE public.document_sequences IS 'Stores sequential document numbers for invoices, sales, orders, etc.';
COMMENT ON FUNCTION get_next_document_number(TEXT) IS 'Generates the next sequential document number with automatic year reset';
