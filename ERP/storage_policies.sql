-- ============================================================
-- STORAGE POLICIES — HIDROMEC ERP
-- Bucket único: syh-docs
-- Ejecutar en Supabase → SQL Editor
-- ============================================================

-- Crear bucket si no existe, y asegurarlo como público
INSERT INTO storage.buckets (id, name, public)
VALUES ('syh-docs', 'syh-docs', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- ── Policies ───────────────────────────────────────────────
DROP POLICY IF EXISTS "syh_docs_insert" ON storage.objects;
CREATE POLICY "syh_docs_insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'syh-docs');

DROP POLICY IF EXISTS "syh_docs_select" ON storage.objects;
CREATE POLICY "syh_docs_select"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'syh-docs');

DROP POLICY IF EXISTS "syh_docs_delete" ON storage.objects;
CREATE POLICY "syh_docs_delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'syh-docs');
