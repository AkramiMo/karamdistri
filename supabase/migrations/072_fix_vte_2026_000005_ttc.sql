-- Corriger la vente VTE-2026-000005 : total_ttc doit être égal au total_ht
UPDATE public.sales
SET total_ttc = total_ht,
    balance_due = total_ht - COALESCE(amount_paid, 0)
WHERE sale_number = 'VTE-2026-000005';
