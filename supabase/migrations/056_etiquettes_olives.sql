-- Migration: Ajouter les étiquettes pour les fournitures olives (5kg et 7kg)
-- 36 nouvelles étiquettes au total

INSERT INTO public.supplies (code, name, description, category_id, unit, price_ht, is_custom, is_active)
SELECT code, name, 'Etiquettes', (SELECT id FROM public.supply_categories WHERE name = 'Etiquettes'), 'unité', 1.5, true, true
FROM (VALUES
  -- Étiquettes 7 kg
  ('ETQ7OVE', 'Etiquette 7 kg OVE'),
  ('ETQ7OVET', 'Etiquette 7 kg OVET'),
  ('ETQ7OVD', 'Etiquette 7 kg OVD'),
  ('ETQ7OVR', 'Etiquette 7 kg OVR'),
  ('ETQ7OTR', 'Etiquette 7 kg OTR'),
  ('ETQ7OVCa', 'Etiquette 7 kg OVCa'),
  ('ETQ7OVBCa', 'Etiquette 7 kg OVBCa'),
  ('ETQ7OCkt', 'Etiquette 7 kg OCkt'),
  ('ETQ7OCktM', 'Etiquette 7 kg OCktM'),
  ('ETQ7ONFG', 'Etiquette 7 kg ONFG'),
  ('ETQ7ONE', 'Etiquette 7 kg ONE'),
  ('ETQ7ONFGD', 'Etiquette 7 kg ONFGD'),
  ('ETQ7ONR', 'Etiquette 7 kg ONR'),
  ('ETQ7ONBr', 'Etiquette 7 kg ONBr'),
  ('ETQ7Cor', 'Etiquette 7 kg Cor'),
  ('ETQ7CorR', 'Etiquette 7 kg CorR'),
  ('ETQ7Ctr', 'Etiquette 7 kg Ctr'),
  ('ETQ7Var', 'Etiquette 7 kg Var'),
  -- Étiquettes 5 kg
  ('ETQ5OVE', 'Etiquette 5 kg OVE'),
  ('ETQ5OVET', 'Etiquette 5 kg OVET'),
  ('ETQ5OVD', 'Etiquette 5 kg OVD'),
  ('ETQ5OVR', 'Etiquette 5 kg OVR'),
  ('ETQ5OTR', 'Etiquette 5 kg OTR'),
  ('ETQ5OVCa', 'Etiquette 5 kg OVCa'),
  ('ETQ5OVBCa', 'Etiquette 5 kg OVBCa'),
  ('ETQ5OCkt', 'Etiquette 5 kg OCkt'),
  ('ETQ5OCktM', 'Etiquette 5 kg OCktM'),
  ('ETQ5ONFG', 'Etiquette 5 kg ONFG'),
  ('ETQ5ONE', 'Etiquette 5 kg ONE'),
  ('ETQ5ONFGD', 'Etiquette 5 kg ONFGD'),
  ('ETQ5ONR', 'Etiquette 5 kg ONR'),
  ('ETQ5ONBr', 'Etiquette 5 kg ONBr'),
  ('ETQ5Cor', 'Etiquette 5 kg Cor'),
  ('ETQ5CorR', 'Etiquette 5 kg CorR'),
  ('ETQ5Ctr', 'Etiquette 5 kg Ctr'),
  ('ETQ5Var', 'Etiquette 5 kg Var')
) AS t(code, name)
ON CONFLICT (code) DO NOTHING;
