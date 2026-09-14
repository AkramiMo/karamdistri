-- Remplacer l'article Se9LOVBCa par Se9LOVCaB dans la vente VTE-2026-000003
-- L'article est stocké dans delivery_items via la livraison associée à la vente

UPDATE public.delivery_items
SET article_id = (SELECT id FROM public.articles WHERE code = 'Se9LOVCaB')
WHERE delivery_id = (
    SELECT d.id
    FROM public.deliveries d
    JOIN public.sales s ON s.delivery_id = d.id
    WHERE s.sale_number = 'VTE-2026-000003'
)
AND article_id = (SELECT id FROM public.articles WHERE code = 'Se9LOVBCa');
