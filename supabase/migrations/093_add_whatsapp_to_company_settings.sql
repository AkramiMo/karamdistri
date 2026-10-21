-- Add whatsapp column to company_settings table
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS whatsapp TEXT;

-- Add comment
COMMENT ON COLUMN company_settings.whatsapp IS 'WhatsApp number for notifications (format: 212612345678)';
