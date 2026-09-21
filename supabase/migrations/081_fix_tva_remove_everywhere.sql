-- Supprimer la TVA de toutes les tables
-- total_ttc = total_ht (pas de TVA)

-- Corriger les livraisons
UPDATE public.deliveries
SET
  total_ttc = total_ht,
  balance_due = total_ht - COALESCE(amount_paid, 0)
WHERE total_ttc != total_ht OR total_ttc IS NULL;

-- Corriger les ventes
UPDATE public.sales
SET
  total_ttc = total_ht,
  balance_due = total_ht - COALESCE(amount_paid, 0)
WHERE total_ttc != total_ht;

-- Corriger les commandes
UPDATE public.orders
SET
  total_tva = 0,
  total_ttc = total_ht
WHERE total_ttc != total_ht OR total_tva != 0;
