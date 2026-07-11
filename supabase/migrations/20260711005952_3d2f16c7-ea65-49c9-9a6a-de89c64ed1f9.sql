
ALTER TABLE public.hr_payroll_item
  ADD COLUMN IF NOT EXISTS tunjangan numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS potongan_bpjs_kes numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS potongan_bpjs_tk  numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS potongan_pph21    numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS hari_hadir int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS hari_alpa  int NOT NULL DEFAULT 0;

ALTER TABLE public.fin_tarif_pajak DROP CONSTRAINT IF EXISTS fin_tarif_pajak_jenis_check;
ALTER TABLE public.fin_tarif_pajak ADD CONSTRAINT fin_tarif_pajak_jenis_check
  CHECK (jenis = ANY (ARRAY['PPN','PPh21','PPh23','PPh4(2)','bpjs_kes','bpjs_tk','pph21']));

INSERT INTO public.fin_tarif_pajak (code, name, jenis, tarif_pct, is_active)
VALUES
  ('BPJS-KES','BPJS Kesehatan (karyawan)','bpjs_kes',1,true),
  ('BPJS-TK', 'BPJS Ketenagakerjaan (karyawan)','bpjs_tk',2,true),
  ('PPH21',   'PPh21 progresif (efektif rata-rata)','pph21',5,true)
ON CONFLICT (code) DO NOTHING;
