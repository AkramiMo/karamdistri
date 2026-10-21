-- Migration: Add 'current' status to client_quote_requests
-- Date: 2026-10-15
-- Description: Add 'current' (en cours) status for DDC

-- Drop the old constraint
ALTER TABLE public.client_quote_requests
DROP CONSTRAINT IF EXISTS client_quote_requests_status_check;

-- Add the new constraint with 'current' status
ALTER TABLE public.client_quote_requests
ADD CONSTRAINT client_quote_requests_status_check
CHECK (status IN ('draft', 'sent', 'accepted', 'current', 'rejected', 'expired'));
