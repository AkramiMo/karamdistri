-- Add payment tracking fields to sales table
ALTER TABLE sales
ADD COLUMN IF NOT EXISTS amount_paid NUMERIC(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS balance_due NUMERIC(12,2) DEFAULT 0;

-- Update existing sales with payment info from linked deliveries
UPDATE sales s
SET
  amount_paid = COALESCE(d.amount_paid, 0),
  balance_due = COALESCE(d.balance_due, 0)
FROM deliveries d
WHERE s.delivery_id = d.id;

-- Add comment for documentation
COMMENT ON COLUMN sales.amount_paid IS 'Total amount paid for this sale';
COMMENT ON COLUMN sales.balance_due IS 'Remaining balance due for this sale';
