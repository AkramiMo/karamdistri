-- ============================================
-- CONFIGURATION DES PERMISSIONS DU RÔLE COMMERCIAL
-- ============================================

-- S'assurer que le commercial a les permissions pour les modules nécessaires
INSERT INTO public.role_permissions (role_id, module_id, can_view, can_create, can_edit, can_delete)
SELECT r.id, m.id, true, true, true, false
FROM public.roles r
CROSS JOIN public.modules m
WHERE r.name = 'commercial' AND m.code IN ('dashboard', 'clients', 'articles', 'commandes')
ON CONFLICT (role_id, module_id)
DO UPDATE SET
  can_view = true,
  can_create = true,
  can_edit = true,
  can_delete = false;

-- Vérifier que les politiques RLS permettent au commercial d'accéder aux clients
-- La politique "View clients" utilise has_permission('clients', 'view')
-- Donc le commercial doit avoir can_view = true pour le module 'clients'
