-- Migration: Corriger les noms des fournitures
-- Date: 2026-10-01

-- 1. Corriger le nom de OTR
UPDATE public.supplies
SET name = 'Olive Tournante Rouge', updated_at = now()
WHERE code = 'OTR';

-- 2. Corriger OVBCa -> OVCaB avec le bon nom
UPDATE public.supplies
SET code = 'OVCaB', name = 'Olive Verte Beldi Cassée', updated_at = now()
WHERE code = 'OVBCa';

-- Si le code est en variante de casse, corriger aussi
UPDATE public.supplies
SET code = 'OVCaB', name = 'Olive Verte Beldi Cassée', updated_at = now()
WHERE UPPER(code) = 'OVBCA';

-- Si OVCaB existe déjà, juste mettre à jour le nom
UPDATE public.supplies
SET name = 'Olive Verte Beldi Cassée', updated_at = now()
WHERE code = 'OVCaB';

-- 3. Supprimer HR-VRAC et s'assurer que HR existe
-- D'abord, transférer les données de HR-VRAC vers HR si nécessaire
DELETE FROM public.supplies WHERE UPPER(code) = 'HR-VRAC';

-- S'assurer que HR existe
INSERT INTO public.supplies (code, name, unit, is_active)
VALUES ('HR', 'Harissa', 'kg', true)
ON CONFLICT (code) DO UPDATE SET name = 'Harissa', updated_at = now();

-- Supprimer aussi d'autres variantes -vrac qui pourraient exister
DELETE FROM public.supplies WHERE code ILIKE '%-vrac';
