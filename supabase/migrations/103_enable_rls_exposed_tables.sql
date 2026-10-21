-- ============================================
-- Migration: Activer RLS sur les tables exposées
-- Tables: facture_deliveries, suivi_livraisons
-- ============================================

-- 1. Activer RLS
ALTER TABLE facture_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE suivi_livraisons ENABLE ROW LEVEL SECURITY;

-- 2. Politiques pour facture_deliveries
CREATE POLICY facture_deliveries_select ON facture_deliveries FOR SELECT TO authenticated USING (true);
CREATE POLICY facture_deliveries_insert ON facture_deliveries FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY facture_deliveries_update ON facture_deliveries FOR UPDATE TO authenticated USING (true);
CREATE POLICY facture_deliveries_delete ON facture_deliveries FOR DELETE TO authenticated USING (true);

-- 3. Politiques pour suivi_livraisons
CREATE POLICY suivi_livraisons_select ON suivi_livraisons FOR SELECT TO authenticated USING (true);
CREATE POLICY suivi_livraisons_insert ON suivi_livraisons FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY suivi_livraisons_update ON suivi_livraisons FOR UPDATE TO authenticated USING (true);
CREATE POLICY suivi_livraisons_delete ON suivi_livraisons FOR DELETE TO authenticated USING (true);
