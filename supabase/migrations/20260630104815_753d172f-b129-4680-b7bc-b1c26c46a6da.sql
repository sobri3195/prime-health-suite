
-- Restore Data API access to fin_dokter on safe columns only.
-- Sensitive columns (npwp, phone, sip_number) remain inaccessible to authenticated/anon.
GRANT SELECT (id, code, name, spesialisasi, default_fee_pct, is_ptkp_k0, is_active, schedule_note, created_at, updated_at)
  ON public.fin_dokter TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.fin_dokter TO authenticated;
GRANT ALL ON public.fin_dokter TO service_role;
