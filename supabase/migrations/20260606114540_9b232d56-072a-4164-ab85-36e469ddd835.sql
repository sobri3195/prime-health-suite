-- ============================================
-- APPS PATIENT: profil, booking, AI history
-- ============================================

-- 1. apps_pasien (profile linked to auth.users)
CREATE TABLE public.apps_pasien (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_code text NOT NULL UNIQUE DEFAULT ('P' || lpad((floor(random()*1000000))::text, 6, '0')),
  nama text NOT NULL DEFAULT '',
  tgl_lahir date,
  jenis_kelamin text CHECK (jenis_kelamin IN ('L','P')),
  telp text,
  alamat text,
  no_bpjs text,
  alergi text,
  kontak_darurat text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.apps_pasien TO authenticated;
GRANT ALL ON public.apps_pasien TO service_role;

ALTER TABLE public.apps_pasien ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pasien lihat profil sendiri"
  ON public.apps_pasien FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Pasien buat profil sendiri"
  ON public.apps_pasien FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Pasien update profil sendiri"
  ON public.apps_pasien FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER apps_pasien_touch_updated
  BEFORE UPDATE ON public.apps_pasien
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_apps_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.apps_pasien (user_id, nama)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nama', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_apps
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_apps_user();

-- 2. apps_booking
CREATE TABLE public.apps_booking (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dokter_id uuid REFERENCES public.fin_dokter(id) ON DELETE SET NULL,
  dokter_nama text NOT NULL,
  tanggal date NOT NULL,
  jam_slot text NOT NULL,
  keluhan text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','confirmed','checked_in','done','cancelled')),
  no_antrean text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (dokter_id, tanggal, jam_slot)
);

CREATE INDEX apps_booking_user_idx ON public.apps_booking(user_id, tanggal DESC);
CREATE INDEX apps_booking_dokter_tgl_idx ON public.apps_booking(dokter_id, tanggal);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.apps_booking TO authenticated;
GRANT ALL ON public.apps_booking TO service_role;

ALTER TABLE public.apps_booking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pasien lihat booking sendiri"
  ON public.apps_booking FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Pasien buat booking sendiri"
  ON public.apps_booking FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Pasien update booking sendiri"
  ON public.apps_booking FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER apps_booking_touch_updated
  BEFORE UPDATE ON public.apps_booking
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- View for slot availability (only shows tgl+jam+dokter, no PII)
CREATE OR REPLACE VIEW public.apps_slot_terisi AS
  SELECT dokter_id, tanggal, jam_slot
    FROM public.apps_booking
   WHERE status IN ('pending','confirmed','checked_in');

GRANT SELECT ON public.apps_slot_terisi TO authenticated;

-- 3. apps_ai_history
CREATE TABLE public.apps_ai_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  keluhan text NOT NULL,
  gejala text[],
  durasi text,
  nyeri int,
  risk text,
  summary text,
  hasil jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX apps_ai_history_user_idx ON public.apps_ai_history(user_id, created_at DESC);

GRANT SELECT, INSERT, DELETE ON public.apps_ai_history TO authenticated;
GRANT ALL ON public.apps_ai_history TO service_role;

ALTER TABLE public.apps_ai_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pasien lihat AI history sendiri"
  ON public.apps_ai_history FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Pasien buat AI history sendiri"
  ON public.apps_ai_history FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Pasien hapus AI history sendiri"
  ON public.apps_ai_history FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- 4. fin_dokter read access for patients (booking)
GRANT SELECT ON public.fin_dokter TO authenticated;
ALTER TABLE public.fin_dokter ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Pasien & staf baca dokter aktif"
  ON public.fin_dokter FOR SELECT TO authenticated
  USING (is_active = true);

-- 5. Link invoice to patient account
ALTER TABLE public.fin_invoice ADD COLUMN IF NOT EXISTS apps_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS fin_invoice_apps_user_idx ON public.fin_invoice(apps_user_id);

GRANT SELECT ON public.fin_invoice TO authenticated;
GRANT SELECT ON public.fin_invoice_item TO authenticated;

ALTER TABLE public.fin_invoice ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fin_invoice_item ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pasien lihat invoice miliknya"
  ON public.fin_invoice FOR SELECT TO authenticated
  USING (apps_user_id = auth.uid());

CREATE POLICY "Pasien lihat item invoice miliknya"
  ON public.fin_invoice_item FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.fin_invoice i
       WHERE i.id = fin_invoice_item.invoice_id
         AND i.apps_user_id = auth.uid()
    )
  );