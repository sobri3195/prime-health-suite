
ALTER TABLE public.apps_order
  ADD COLUMN IF NOT EXISTS kurir text,
  ADD COLUMN IF NOT EXISTS resi text,
  ADD COLUMN IF NOT EXISTS tracking_url text;

INSERT INTO public.clinic_setting (key, value)
VALUES ('bank_accounts', '[{"bank":"BCA","no_rek":"1234567890","atas_nama":"Klinik Mata Prima"},{"bank":"Mandiri","no_rek":"1450099887766","atas_nama":"Klinik Mata Prima"}]'::jsonb)
ON CONFLICT (key) DO NOTHING;
