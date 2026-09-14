-- Migration: Fix cash register duplicates and add missing entries
-- 1. Remove duplicates for VTE-2026-000002 (keep only the first one)
-- 2. Add missing entry for VTE-2026-000001
-- 3. Add unique constraint to prevent future duplicates

-- Step 1: Delete duplicates for VTE-2026-000002 (keep the oldest entry)
DELETE FROM cash_register
WHERE reference = 'VTE-2026-000002'
  AND id NOT IN (
    SELECT id FROM (
      SELECT id FROM cash_register
      WHERE reference = 'VTE-2026-000002'
      ORDER BY created_at ASC
      LIMIT 1
    ) AS keeper
  );

-- Step 2: Add missing entry for VTE-2026-000001 if not exists
INSERT INTO cash_register (
  operation_type,
  category,
  amount,
  reference,
  reference_id,
  notes,
  transaction_date
)
SELECT
  'in',
  'vente',
  s.total_ttc,
  s.sale_number,
  s.id,
  'Vente ' || s.sale_number || ' - ' || COALESCE(c.name, 'Client'),
  s.sale_date
FROM sales s
LEFT JOIN clients c ON s.client_id = c.id
WHERE s.sale_number = 'VTE-2026-000001'
  AND NOT EXISTS (
    SELECT 1 FROM cash_register cr
    WHERE cr.reference = 'VTE-2026-000001'
  );

-- Step 3: Add unique constraint on reference_id and category to prevent duplicates
-- First check if constraint already exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'cash_register_unique_sale_entry'
  ) THEN
    ALTER TABLE cash_register
    ADD CONSTRAINT cash_register_unique_sale_entry
    UNIQUE (reference_id, category, operation_type);
  END IF;
END $$;
