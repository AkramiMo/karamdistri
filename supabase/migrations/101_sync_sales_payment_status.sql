-- Migration: Synchroniser le statut de paiement des ventes avec leurs BL
-- Pour chaque vente, vérifier le statut de tous ses BL et mettre à jour le statut de la vente

-- 1. Mettre à jour les ventes où TOUS les BL sont payés -> vente "paid"
UPDATE sales s
SET payment_status = 'paid'
WHERE s.id IN (
    SELECT av.sale_id
    FROM articles_vendus av
    JOIN deliveries d ON d.id = av.delivery_id
    WHERE av.sale_id IS NOT NULL AND av.delivery_id IS NOT NULL
    GROUP BY av.sale_id
    HAVING bool_and(d.payment_status = 'paid')
);

-- 2. Mettre à jour les ventes où AU MOINS UN BL est payé/partiel mais pas tous -> vente "partial"
UPDATE sales s
SET payment_status = 'partial'
WHERE s.id IN (
    SELECT av.sale_id
    FROM articles_vendus av
    JOIN deliveries d ON d.id = av.delivery_id
    WHERE av.sale_id IS NOT NULL AND av.delivery_id IS NOT NULL
    GROUP BY av.sale_id
    HAVING bool_or(d.payment_status IN ('paid', 'partial'))
       AND NOT bool_and(d.payment_status = 'paid')
);

-- 3. Mettre à jour les ventes où AUCUN BL n'est payé -> vente "pending"
UPDATE sales s
SET payment_status = 'pending'
WHERE s.id IN (
    SELECT av.sale_id
    FROM articles_vendus av
    JOIN deliveries d ON d.id = av.delivery_id
    WHERE av.sale_id IS NOT NULL AND av.delivery_id IS NOT NULL
    GROUP BY av.sale_id
    HAVING NOT bool_or(d.payment_status IN ('paid', 'partial'))
);
