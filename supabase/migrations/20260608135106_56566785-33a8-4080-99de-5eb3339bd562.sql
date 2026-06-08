
-- 1. Audit log: require both user_id AND actor_id to match caller
DROP POLICY IF EXISTS "Pasien insert audit log untuk dirinya" ON public.apps_audit_log;
CREATE POLICY "Pasien insert audit log untuk dirinya"
  ON public.apps_audit_log FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND auth.uid() = actor_id);

-- 2. Loyalty points: remove user-facing INSERT (only SECURITY DEFINER functions or service_role can credit points)
DROP POLICY IF EXISTS "Pasien insert poin sendiri" ON public.apps_poin;
REVOKE INSERT ON public.apps_poin FROM authenticated, anon;

-- 3. Storage bucket apps-mata: add UPDATE policy mirroring INSERT
DROP POLICY IF EXISTS "Pasien update foto mata sendiri" ON storage.objects;
CREATE POLICY "Pasien update foto mata sendiri"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'apps-mata' AND (auth.uid())::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'apps-mata' AND (auth.uid())::text = (storage.foldername(name))[1]);

-- 4. fin_dokter NPWP exposure: revoke column-level SELECT on npwp from anon/authenticated.
-- service_role (used by admin server functions for the finance master CRUD) retains full access.
REVOKE SELECT ON public.fin_dokter FROM anon, authenticated;
GRANT SELECT (id, code, name, spesialisasi, default_fee_pct, is_ptkp_k0, is_active, created_at, updated_at)
  ON public.fin_dokter TO authenticated;
GRANT SELECT (id, code, name, spesialisasi, default_fee_pct, is_active)
  ON public.fin_dokter TO anon;
