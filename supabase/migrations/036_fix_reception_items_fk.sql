-- Migration: Fix reception_items foreign key
-- Date: 2025-02-26
-- Description: Change reception_items.article_id to reference supplies instead of articles
-- This fixes the issue where reception items couldn't be saved because the FK pointed to the wrong table

-- Drop the existing foreign key constraint
ALTER TABLE public.reception_items
  DROP CONSTRAINT IF EXISTS reception_items_article_id_fkey;

-- Add new foreign key constraint referencing supplies table
ALTER TABLE public.reception_items
  ADD CONSTRAINT reception_items_article_id_fkey
  FOREIGN KEY (article_id) REFERENCES public.supplies(id) ON DELETE SET NULL;

-- Also fix purchase_order_items to reference supplies
ALTER TABLE public.purchase_order_items
  DROP CONSTRAINT IF EXISTS purchase_order_items_article_id_fkey;

ALTER TABLE public.purchase_order_items
  ADD CONSTRAINT purchase_order_items_article_id_fkey
  FOREIGN KEY (article_id) REFERENCES public.supplies(id) ON DELETE SET NULL;

-- Add comment for clarity
COMMENT ON COLUMN public.reception_items.article_id IS 'References supplies table (fournitures for purchasing)';
COMMENT ON COLUMN public.purchase_order_items.article_id IS 'References supplies table (fournitures for purchasing)';
