
CREATE TABLE IF NOT EXISTS public.klinik_template_pemeriksaan (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  label text NOT NULL,
  diagnosis text NOT NULL,
  icd10_code text,
  treatment text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.klinik_template_pemeriksaan TO authenticated;
GRANT ALL ON public.klinik_template_pemeriksaan TO service_role;

ALTER TABLE public.klinik_template_pemeriksaan ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff dapat baca template pemeriksaan"
  ON public.klinik_template_pemeriksaan FOR SELECT TO authenticated
  USING (public.klinik_is_staff(auth.uid()));

CREATE POLICY "Dokter/Admin dapat kelola template pemeriksaan"
  ON public.klinik_template_pemeriksaan FOR ALL TO authenticated
  USING (public.klinik_is_admin(auth.uid()) OR public.has_role(auth.uid(),'dokter'))
  WITH CHECK (public.klinik_is_admin(auth.uid()) OR public.has_role(auth.uid(),'dokter'));

CREATE TRIGGER trg_klinik_template_pemeriksaan_updated
  BEFORE UPDATE ON public.klinik_template_pemeriksaan
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.klinik_template_pemeriksaan (code,label,diagnosis,icd10_code,treatment) VALUES
  ('katarak','Katarak','Katarak Senilis','H25.9','Edukasi pasien, rencanakan operasi katarak phacoemulsifikasi'),
  ('konjungtivitis','Konjungtivitis','Konjungtivitis','H10.9','Antibiotik tetes mata 4x sehari, kompres, kontrol 5 hari'),
  ('glaukoma','Glaukoma','Glaukoma','H40.9','Timolol 0.5% 2x sehari, kontrol TIO 2 minggu'),
  ('refraksi','Refraksi','Refraksi Anomali','H52.7','Resep kacamata sesuai pemeriksaan'),
  ('retinopati','Retinopati DM','Retinopati Diabetik','H36.0','Kontrol gula darah, rujuk retina, OCT'),
  ('kering','Mata Kering','Sindrom Mata Kering','H04.123','Air mata buatan 4-6x/hari, kompres hangat'),
  ('kontrol','Kontrol Pasca-op','Kontrol pasca operasi','Z48.8','Lanjutkan obat tetes, jaga kebersihan, kontrol 1 minggu')
ON CONFLICT (code) DO NOTHING;
