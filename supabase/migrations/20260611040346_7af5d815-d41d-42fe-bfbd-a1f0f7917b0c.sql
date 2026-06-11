
-- HELPER ROLE CHECKS
CREATE OR REPLACE FUNCTION public.klinik_is_staff(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS(SELECT 1 FROM public.user_roles
    WHERE user_id=_uid AND role IN
    ('super_admin','admin_klinik','dokter','perawat','perawat_optometri','pendaftaran','kasir','farmasi','manajemen'));
$$;
REVOKE EXECUTE ON FUNCTION public.klinik_is_staff(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.klinik_is_staff(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.klinik_is_admin(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=_uid AND role IN ('super_admin','admin_klinik'));
$$;
REVOKE EXECUTE ON FUNCTION public.klinik_is_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.klinik_is_admin(uuid) TO authenticated, service_role;

-- EXTEND apps_pasien
ALTER TABLE public.apps_pasien ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.apps_pasien DROP CONSTRAINT IF EXISTS apps_pasien_user_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS apps_pasien_user_id_uidx ON public.apps_pasien(user_id) WHERE user_id IS NOT NULL;
ALTER TABLE public.apps_pasien
  ADD COLUMN IF NOT EXISTS no_rm text UNIQUE,
  ADD COLUMN IF NOT EXISTS patient_type text NOT NULL DEFAULT 'Umum',
  ADD COLUMN IF NOT EXISTS insurance_name text,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

DROP POLICY IF EXISTS "klinik staf baca pasien" ON public.apps_pasien;
CREATE POLICY "klinik staf baca pasien" ON public.apps_pasien FOR SELECT TO authenticated USING (public.klinik_is_staff(auth.uid()));
DROP POLICY IF EXISTS "klinik staf kelola pasien" ON public.apps_pasien;
CREATE POLICY "klinik staf kelola pasien" ON public.apps_pasien FOR ALL TO authenticated
  USING (public.klinik_is_staff(auth.uid())) WITH CHECK (public.klinik_is_staff(auth.uid()));

-- EXTEND fin_dokter
ALTER TABLE public.fin_dokter
  ADD COLUMN IF NOT EXISTS sip_number text,
  ADD COLUMN IF NOT EXISTS schedule_note text,
  ADD COLUMN IF NOT EXISTS phone text;
DROP POLICY IF EXISTS "klinik staf kelola dokter" ON public.fin_dokter;
CREATE POLICY "klinik staf kelola dokter" ON public.fin_dokter FOR ALL TO authenticated
  USING (public.klinik_is_admin(auth.uid())) WITH CHECK (public.klinik_is_admin(auth.uid()));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fin_dokter TO authenticated;
GRANT ALL ON public.fin_dokter TO service_role;

-- EXTEND apps_booking
ALTER TABLE public.apps_booking ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.apps_booking
  ADD COLUMN IF NOT EXISTS pasien_id uuid REFERENCES public.apps_pasien(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'walk_in';
CREATE INDEX IF NOT EXISTS apps_booking_pasien_idx ON public.apps_booking(pasien_id);
DROP POLICY IF EXISTS "klinik staf baca booking" ON public.apps_booking;
CREATE POLICY "klinik staf baca booking" ON public.apps_booking FOR SELECT TO authenticated
  USING (public.klinik_is_staff(auth.uid()) OR auth.uid()=user_id);
DROP POLICY IF EXISTS "klinik staf kelola booking" ON public.apps_booking;
CREATE POLICY "klinik staf kelola booking" ON public.apps_booking FOR ALL TO authenticated
  USING (public.klinik_is_staff(auth.uid())) WITH CHECK (public.klinik_is_staff(auth.uid()));

-- klinik_obat
CREATE TABLE IF NOT EXISTS public.klinik_obat (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL, name text NOT NULL, category text,
  unit text NOT NULL DEFAULT 'tablet',
  stock numeric NOT NULL DEFAULT 0, min_stock numeric NOT NULL DEFAULT 0,
  price numeric NOT NULL DEFAULT 0, expired_date date, notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.klinik_obat TO authenticated;
GRANT ALL ON public.klinik_obat TO service_role;
ALTER TABLE public.klinik_obat ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staf baca obat" ON public.klinik_obat;
CREATE POLICY "staf baca obat" ON public.klinik_obat FOR SELECT TO authenticated USING (public.klinik_is_staff(auth.uid()));
DROP POLICY IF EXISTS "staf kelola obat" ON public.klinik_obat;
CREATE POLICY "staf kelola obat" ON public.klinik_obat FOR ALL TO authenticated
  USING (public.klinik_is_admin(auth.uid()) OR public.has_role(auth.uid(),'farmasi'))
  WITH CHECK (public.klinik_is_admin(auth.uid()) OR public.has_role(auth.uid(),'farmasi'));
DROP TRIGGER IF EXISTS trg_klinik_obat_updated ON public.klinik_obat;
CREATE TRIGGER trg_klinik_obat_updated BEFORE UPDATE ON public.klinik_obat
  FOR EACH ROW EXECUTE FUNCTION public.fin_touch_updated_at();

-- klinik_stock_movement
CREATE TABLE IF NOT EXISTS public.klinik_stock_movement (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  obat_id uuid NOT NULL REFERENCES public.klinik_obat(id) ON DELETE CASCADE,
  movement_type text NOT NULL CHECK (movement_type IN ('in','out','adjustment')),
  quantity numeric NOT NULL, ref_type text, ref_id uuid, note text, created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS klinik_stock_obat_idx ON public.klinik_stock_movement(obat_id, created_at DESC);
GRANT SELECT, INSERT ON public.klinik_stock_movement TO authenticated;
GRANT ALL ON public.klinik_stock_movement TO service_role;
ALTER TABLE public.klinik_stock_movement ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staf baca stock mvmt" ON public.klinik_stock_movement;
CREATE POLICY "staf baca stock mvmt" ON public.klinik_stock_movement FOR SELECT TO authenticated USING (public.klinik_is_staff(auth.uid()));
DROP POLICY IF EXISTS "farmasi tulis stock mvmt" ON public.klinik_stock_movement;
CREATE POLICY "farmasi tulis stock mvmt" ON public.klinik_stock_movement FOR INSERT TO authenticated
  WITH CHECK (public.klinik_is_admin(auth.uid()) OR public.has_role(auth.uid(),'farmasi'));

CREATE OR REPLACE FUNCTION public.klinik_apply_stock_movement()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.movement_type = 'in' THEN
    UPDATE public.klinik_obat SET stock = stock + NEW.quantity WHERE id = NEW.obat_id;
  ELSIF NEW.movement_type = 'out' THEN
    UPDATE public.klinik_obat SET stock = GREATEST(0, stock - NEW.quantity) WHERE id = NEW.obat_id;
  ELSIF NEW.movement_type = 'adjustment' THEN
    UPDATE public.klinik_obat SET stock = NEW.quantity WHERE id = NEW.obat_id;
  END IF;
  RETURN NEW;
END$$;
DROP TRIGGER IF EXISTS trg_apply_stock_mvmt ON public.klinik_stock_movement;
CREATE TRIGGER trg_apply_stock_mvmt AFTER INSERT ON public.klinik_stock_movement
  FOR EACH ROW EXECUTE FUNCTION public.klinik_apply_stock_movement();

-- klinik_visit
CREATE TABLE IF NOT EXISTS public.klinik_visit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pasien_id uuid NOT NULL REFERENCES public.apps_pasien(id) ON DELETE CASCADE,
  dokter_id uuid REFERENCES public.fin_dokter(id) ON DELETE SET NULL,
  booking_id uuid REFERENCES public.apps_booking(id) ON DELETE SET NULL,
  visit_date timestamptz NOT NULL DEFAULT now(),
  chief_complaint text,
  status text NOT NULL DEFAULT 'registered' CHECK (status IN ('registered','in_exam','in_doctor','billing','done','cancelled')),
  payment_status text NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid','partial','paid','waived')),
  patient_type text NOT NULL DEFAULT 'Umum',
  created_by uuid, notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS klinik_visit_date_idx ON public.klinik_visit(visit_date DESC);
CREATE INDEX IF NOT EXISTS klinik_visit_dokter_idx ON public.klinik_visit(dokter_id, visit_date DESC);
CREATE INDEX IF NOT EXISTS klinik_visit_pasien_idx ON public.klinik_visit(pasien_id, visit_date DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.klinik_visit TO authenticated;
GRANT ALL ON public.klinik_visit TO service_role;
ALTER TABLE public.klinik_visit ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staf baca visit" ON public.klinik_visit;
CREATE POLICY "staf baca visit" ON public.klinik_visit FOR SELECT TO authenticated USING (public.klinik_is_staff(auth.uid()));
DROP POLICY IF EXISTS "staf kelola visit" ON public.klinik_visit;
CREATE POLICY "staf kelola visit" ON public.klinik_visit FOR ALL TO authenticated
  USING (public.klinik_is_staff(auth.uid())) WITH CHECK (public.klinik_is_staff(auth.uid()));
DROP TRIGGER IF EXISTS trg_klinik_visit_updated ON public.klinik_visit;
CREATE TRIGGER trg_klinik_visit_updated BEFORE UPDATE ON public.klinik_visit
  FOR EACH ROW EXECUTE FUNCTION public.fin_touch_updated_at();

-- klinik_queue
CREATE TABLE IF NOT EXISTS public.klinik_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id uuid REFERENCES public.klinik_visit(id) ON DELETE CASCADE,
  pasien_id uuid NOT NULL REFERENCES public.apps_pasien(id) ON DELETE CASCADE,
  dokter_id uuid REFERENCES public.fin_dokter(id) ON DELETE SET NULL,
  queue_no text NOT NULL,
  queue_date date NOT NULL DEFAULT CURRENT_DATE,
  counter text DEFAULT 'A',
  status text NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting','called','in_service','done','cancelled')),
  called_at timestamptz, served_at timestamptz, done_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS klinik_queue_date_idx ON public.klinik_queue(queue_date, status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.klinik_queue TO authenticated;
GRANT ALL ON public.klinik_queue TO service_role;
ALTER TABLE public.klinik_queue ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staf baca queue" ON public.klinik_queue;
CREATE POLICY "staf baca queue" ON public.klinik_queue FOR SELECT TO authenticated USING (public.klinik_is_staff(auth.uid()));
DROP POLICY IF EXISTS "staf kelola queue" ON public.klinik_queue;
CREATE POLICY "staf kelola queue" ON public.klinik_queue FOR ALL TO authenticated
  USING (public.klinik_is_staff(auth.uid())) WITH CHECK (public.klinik_is_staff(auth.uid()));
DROP TRIGGER IF EXISTS trg_klinik_queue_updated ON public.klinik_queue;
CREATE TRIGGER trg_klinik_queue_updated BEFORE UPDATE ON public.klinik_queue
  FOR EACH ROW EXECUTE FUNCTION public.fin_touch_updated_at();

-- klinik_medical_record
CREATE TABLE IF NOT EXISTS public.klinik_medical_record (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id uuid NOT NULL REFERENCES public.klinik_visit(id) ON DELETE CASCADE,
  pasien_id uuid NOT NULL REFERENCES public.apps_pasien(id) ON DELETE CASCADE,
  dokter_id uuid REFERENCES public.fin_dokter(id) ON DELETE SET NULL,
  anamnesis text, riwayat_penyakit text, alergi text,
  visus_od text, visus_os text, tio_od text, tio_os text,
  slit_lamp text, fundus text,
  diagnosis text, icd10_code text, treatment_plan text, tindakan text,
  notes text, follow_up_date date, is_final boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS klinik_medrec_visit_uidx ON public.klinik_medical_record(visit_id);
CREATE INDEX IF NOT EXISTS klinik_medrec_pasien_idx ON public.klinik_medical_record(pasien_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.klinik_medical_record TO authenticated;
GRANT ALL ON public.klinik_medical_record TO service_role;
ALTER TABLE public.klinik_medical_record ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staf baca medrec" ON public.klinik_medical_record;
CREATE POLICY "staf baca medrec" ON public.klinik_medical_record FOR SELECT TO authenticated USING (public.klinik_is_staff(auth.uid()));
DROP POLICY IF EXISTS "dokter kelola medrec" ON public.klinik_medical_record;
CREATE POLICY "dokter kelola medrec" ON public.klinik_medical_record FOR ALL TO authenticated
  USING (public.klinik_is_admin(auth.uid()) OR public.has_role(auth.uid(),'dokter') OR public.has_role(auth.uid(),'perawat_optometri') OR public.has_role(auth.uid(),'perawat'))
  WITH CHECK (public.klinik_is_admin(auth.uid()) OR public.has_role(auth.uid(),'dokter') OR public.has_role(auth.uid(),'perawat_optometri') OR public.has_role(auth.uid(),'perawat'));
DROP TRIGGER IF EXISTS trg_klinik_medrec_updated ON public.klinik_medical_record;
CREATE TRIGGER trg_klinik_medrec_updated BEFORE UPDATE ON public.klinik_medical_record
  FOR EACH ROW EXECUTE FUNCTION public.fin_touch_updated_at();

-- klinik_prescription
CREATE TABLE IF NOT EXISTS public.klinik_prescription (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id uuid NOT NULL REFERENCES public.klinik_visit(id) ON DELETE CASCADE,
  pasien_id uuid NOT NULL REFERENCES public.apps_pasien(id) ON DELETE CASCADE,
  dokter_id uuid REFERENCES public.fin_dokter(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'sent_to_pharmacy' CHECK (status IN ('draft','sent_to_pharmacy','dispensed','cancelled')),
  notes text, dispensed_at timestamptz, dispensed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS klinik_pres_status_idx ON public.klinik_prescription(status, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.klinik_prescription TO authenticated;
GRANT ALL ON public.klinik_prescription TO service_role;
ALTER TABLE public.klinik_prescription ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staf baca resep" ON public.klinik_prescription;
CREATE POLICY "staf baca resep" ON public.klinik_prescription FOR SELECT TO authenticated USING (public.klinik_is_staff(auth.uid()));
DROP POLICY IF EXISTS "staf kelola resep" ON public.klinik_prescription;
CREATE POLICY "staf kelola resep" ON public.klinik_prescription FOR ALL TO authenticated
  USING (public.klinik_is_staff(auth.uid())) WITH CHECK (public.klinik_is_staff(auth.uid()));
DROP TRIGGER IF EXISTS trg_klinik_pres_updated ON public.klinik_prescription;
CREATE TRIGGER trg_klinik_pres_updated BEFORE UPDATE ON public.klinik_prescription
  FOR EACH ROW EXECUTE FUNCTION public.fin_touch_updated_at();

-- klinik_prescription_item
CREATE TABLE IF NOT EXISTS public.klinik_prescription_item (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id uuid NOT NULL REFERENCES public.klinik_prescription(id) ON DELETE CASCADE,
  obat_id uuid REFERENCES public.klinik_obat(id) ON DELETE SET NULL,
  obat_name text NOT NULL,
  dosage text, frequency text, duration text, instruction text,
  quantity numeric NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS klinik_pres_item_pres_idx ON public.klinik_prescription_item(prescription_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.klinik_prescription_item TO authenticated;
GRANT ALL ON public.klinik_prescription_item TO service_role;
ALTER TABLE public.klinik_prescription_item ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staf baca resep item" ON public.klinik_prescription_item;
CREATE POLICY "staf baca resep item" ON public.klinik_prescription_item FOR SELECT TO authenticated USING (public.klinik_is_staff(auth.uid()));
DROP POLICY IF EXISTS "staf kelola resep item" ON public.klinik_prescription_item;
CREATE POLICY "staf kelola resep item" ON public.klinik_prescription_item FOR ALL TO authenticated
  USING (public.klinik_is_staff(auth.uid())) WITH CHECK (public.klinik_is_staff(auth.uid()));

-- Helper number functions
CREATE OR REPLACE FUNCTION public.klinik_next_no_rm()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_prefix text := 'PM-' || to_char(now(),'YYYYMM') || '-';
  v_next int;
BEGIN
  SELECT COALESCE(MAX(NULLIF(regexp_replace(no_rm, '^.*-', ''), '')::int),0) + 1 INTO v_next
    FROM public.apps_pasien WHERE no_rm LIKE v_prefix || '%';
  RETURN v_prefix || lpad(v_next::text, 4, '0');
END$$;
REVOKE EXECUTE ON FUNCTION public.klinik_next_no_rm() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.klinik_next_no_rm() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.klinik_next_queue_no(_date date DEFAULT CURRENT_DATE, _counter text DEFAULT 'A')
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_next int;
BEGIN
  SELECT COALESCE(MAX(NULLIF(regexp_replace(queue_no, '^[A-Z]', ''),'')::int),0) + 1 INTO v_next
    FROM public.klinik_queue WHERE queue_date=_date AND counter=_counter;
  RETURN _counter || lpad(v_next::text,3,'0');
END$$;
REVOKE EXECUTE ON FUNCTION public.klinik_next_queue_no(date,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.klinik_next_queue_no(date,text) TO authenticated, service_role;

-- SEED dokter
INSERT INTO public.fin_dokter (code,name,spesialisasi,sip_number,phone,schedule_note,default_fee_pct) VALUES
 ('DR01','dr. Andi Wijaya, Sp.M','Mata Umum','SIP/01/2024','081200000001','Senin-Jumat 08:00-15:00',45),
 ('DR02','dr. Sarah Putri, Sp.M','Retina','SIP/02/2024','081200000002','Sen-Rab-Jum 09:00-14:00',45),
 ('DR03','dr. Bagus Rahmadi, Sp.M(K)','Katarak','SIP/03/2024','081200000003','Sel-Kam-Sab 08:00-13:00',50),
 ('DR04','dr. Linda Permata, Sp.M','Glaukoma','SIP/04/2024','081200000004','Senin-Jumat 13:00-19:00',45),
 ('DR05','dr. Hadi Nugroho, Sp.M','Pediatri Mata','SIP/05/2024','081200000005','Rab-Jum 10:00-15:00',45)
ON CONFLICT (code) DO UPDATE SET sip_number=EXCLUDED.sip_number, schedule_note=EXCLUDED.schedule_note, phone=EXCLUDED.phone;

-- SEED layanan (kolom tarif, bukan harga)
INSERT INTO public.fin_layanan (code,name,tarif,is_active)
SELECT v.code, v.name, v.harga, true FROM (VALUES
  ('LYN-01','Konsultasi Dokter Umum Mata',150000),('LYN-02','Konsultasi Spesialis Mata',250000),
  ('LYN-03','Pemeriksaan Refraksi',100000),('LYN-04','Pemeriksaan Tekanan Bola Mata (TIO)',75000),
  ('LYN-05','Pemeriksaan Slit Lamp',125000),('LYN-06','Pemeriksaan Fundus',200000),
  ('LYN-07','Pemeriksaan OCT',450000),('LYN-08','USG Mata',350000),
  ('LYN-09','Tes Buta Warna',50000),('LYN-10','Tes Lapang Pandang',300000),
  ('LYN-11','Irigasi Mata',150000),('LYN-12','Ekstraksi Corpus Alienum',250000),
  ('LYN-13','Insisi Hordeolum/Chalazion',400000),('LYN-14','Operasi Katarak (Phaco)',8500000),
  ('LYN-15','Operasi Pterygium',3500000),('LYN-16','Injeksi Intravitreal',2500000),
  ('LYN-17','Laser YAG',2200000),('LYN-18','Laser Argon',2800000),
  ('LYN-19','Resep Kacamata',75000),('LYN-20','Kontrol Pasca Operasi',100000)
) v(code,name,harga)
WHERE NOT EXISTS (SELECT 1 FROM public.fin_layanan WHERE code=v.code);

-- SEED obat
INSERT INTO public.klinik_obat (code,name,category,unit,stock,min_stock,price,expired_date)
SELECT v.code, v.name, v.cat, v.unit, v.stok, v.min_stok, v.price, (CURRENT_DATE + (v.exp_days || ' days')::interval)::date FROM (VALUES
  ('OBT-001','Cendo Lyteers Tetes Mata 15ml','Lubrikan','botol',120,20,28000,365),
  ('OBT-002','Cendo Hyalub Tetes Mata 5ml','Lubrikan','botol',80,15,38000,365),
  ('OBT-003','Cendo Carpine 2% 5ml','Glaukoma','botol',45,10,42000,300),
  ('OBT-004','Timol 0.5% Tetes Mata 5ml','Glaukoma','botol',60,15,55000,300),
  ('OBT-005','Latanoprost 0.005% 2.5ml','Glaukoma','botol',30,10,185000,270),
  ('OBT-006','Cendo Polynel Tetes Mata 5ml','Antibiotik','botol',95,20,42000,365),
  ('OBT-007','Floxa Tetes Mata 5ml','Antibiotik','botol',70,15,38000,365),
  ('OBT-008','Tobroson Tetes Mata 5ml','Antibiotik+Steroid','botol',55,15,75000,300),
  ('OBT-009','Cendo Xitrol Tetes Mata 5ml','Antibiotik+Steroid','botol',60,15,52000,300),
  ('OBT-010','Cendo Tropine 0.5% 5ml','Sikloplegia','botol',40,10,38000,365),
  ('OBT-011','Cendo Mydriatil 0.5% 15ml','Midriatika','botol',25,8,68000,365),
  ('OBT-012','Cendo Pantocain 0.5% 15ml','Anestesi Topikal','botol',35,10,65000,300),
  ('OBT-013','Asam Mefenamat 500mg','Analgesik','tablet',500,100,1200,540),
  ('OBT-014','Paracetamol 500mg','Analgesik','tablet',800,150,800,540),
  ('OBT-015','Ibuprofen 400mg','Analgesik','tablet',300,80,1500,540),
  ('OBT-016','Cefadroxil 500mg','Antibiotik Oral','tablet',200,50,3500,365),
  ('OBT-017','Amoxicillin 500mg','Antibiotik Oral','tablet',350,80,2500,365),
  ('OBT-018','Ciprofloxacin 500mg','Antibiotik Oral','tablet',180,40,4500,365),
  ('OBT-019','Methylprednisolone 4mg','Steroid','tablet',220,50,4800,365),
  ('OBT-020','Dexamethasone 0.5mg','Steroid','tablet',300,60,1800,540),
  ('OBT-021','Cetirizine 10mg','Antihistamin','tablet',280,70,1500,540),
  ('OBT-022','Loratadine 10mg','Antihistamin','tablet',250,60,2200,540),
  ('OBT-023','Vitamin A 6000 IU','Vitamin','tablet',400,100,1800,540),
  ('OBT-024','Vitamin B Complex','Vitamin','tablet',500,100,1500,540),
  ('OBT-025','Vitamin C 500mg','Vitamin','tablet',450,100,2000,540),
  ('OBT-026','Lutein 20mg','Suplemen Mata','tablet',150,40,8500,365),
  ('OBT-027','Bilberry Extract','Suplemen Mata','tablet',120,30,12000,365),
  ('OBT-028','Cendo Asthenof Tetes Mata 5ml','Antialergi','botol',75,20,48000,365),
  ('OBT-029','Cendo Cenfresh Tetes Mata 0.6ml','Lubrikan Single Dose','strip',200,40,4500,300),
  ('OBT-030','Cendo Vasacon-A Tetes Mata 7.5ml','Antialergi','botol',55,15,42000,300)
) v(code,name,cat,unit,stok,min_stok,price,exp_days)
WHERE NOT EXISTS (SELECT 1 FROM public.klinik_obat WHERE code=v.code);

-- SEED pasien (20)
DO $$
DECLARE
  i int; v_nama text; v_jk text;
  v_nama_l text[] := ARRAY['Budi Santoso','Ahmad Yusuf','Rizki Pratama','Hendra Wijaya','Dimas Saputra','Andi Maulana','Faisal Hakim','Joko Sutrisno','Eko Wibowo','Roni Hartono'];
  v_nama_p text[] := ARRAY['Sari Wulandari','Nurul Hidayah','Dewi Lestari','Siti Rahmah','Maya Anggraini','Linda Kusuma','Putri Ayuningtyas','Rina Marlina','Ayu Lestari','Wati Suryani'];
  v_alamat text[] := ARRAY['Jl. Merdeka 10, Jakarta','Jl. Sudirman 25, Jakarta','Jl. Thamrin 5, Jakarta','Jl. Gatot Subroto 18','Jl. Diponegoro 7','Jl. Asia Afrika 33','Jl. Pemuda 15','Jl. Veteran 22','Jl. Pahlawan 11','Jl. Pancasila 9'];
  v_type text[] := ARRAY['Umum','BPJS','Umum','Asuransi','Umum','BPJS','Corporate','Umum','BPJS','Umum'];
BEGIN
  FOR i IN 1..20 LOOP
    IF i % 2 = 0 THEN v_nama := v_nama_l[1+((i/2-1) % array_length(v_nama_l,1))]; v_jk := 'L';
    ELSE v_nama := v_nama_p[1+((i/2) % array_length(v_nama_p,1))]; v_jk := 'P'; END IF;
    IF NOT EXISTS (SELECT 1 FROM public.apps_pasien WHERE nama=v_nama AND no_rm IS NOT NULL) THEN
      INSERT INTO public.apps_pasien (no_rm, nama, tgl_lahir, jenis_kelamin, telp, alamat, patient_type, alergi, kontak_darurat, is_active)
      VALUES (public.klinik_next_no_rm(), v_nama,
        (CURRENT_DATE - ((20*365)+(i*123) || ' days')::interval)::date, v_jk,
        '0812' || lpad((10000000 + i*7331)::text, 8, '0'),
        v_alamat[1+(i % array_length(v_alamat,1))],
        v_type[1+(i % array_length(v_type,1))],
        CASE WHEN i % 5 = 0 THEN 'Penisilin' WHEN i % 7 = 0 THEN 'Sulfa' ELSE NULL END,
        '0813' || lpad((20000000 + i*4421)::text, 8, '0'), true);
    END IF;
  END LOOP;
END$$;

-- SEED appointments + queue hari ini
DO $$
DECLARE
  v_pasien record; v_dokter_ids uuid[]; v_dok uuid; i int := 0; v_visit uuid; v_book uuid;
  v_slots text[] := ARRAY['08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30','13:00','13:30'];
BEGIN
  SELECT array_agg(id) INTO v_dokter_ids FROM (SELECT id FROM public.fin_dokter WHERE is_active=true LIMIT 5) s;
  IF v_dokter_ids IS NULL THEN RETURN; END IF;
  FOR v_pasien IN SELECT id, nama FROM public.apps_pasien WHERE no_rm IS NOT NULL ORDER BY created_at LIMIT 10 LOOP
    i := i + 1;
    v_dok := v_dokter_ids[1 + ((i-1) % array_length(v_dokter_ids,1))];
    INSERT INTO public.apps_booking (pasien_id, dokter_id, dokter_nama, tanggal, jam_slot, keluhan, status, source, no_urut)
    SELECT v_pasien.id, v_dok, d.name, CURRENT_DATE, v_slots[i], 'Pemeriksaan rutin / keluhan mata',
      CASE WHEN i <= 5 THEN 'checked_in' ELSE 'confirmed' END, 'walk_in', i
    FROM public.fin_dokter d WHERE d.id=v_dok
    ON CONFLICT DO NOTHING RETURNING id INTO v_book;
    IF i <= 5 AND v_book IS NOT NULL THEN
      INSERT INTO public.klinik_visit (pasien_id, dokter_id, booking_id, visit_date, chief_complaint, status, patient_type)
      VALUES (v_pasien.id, v_dok, v_book, now() - (i*15 || ' minutes')::interval, 'Kontrol rutin / pemeriksaan mata',
        CASE WHEN i=1 THEN 'in_doctor' WHEN i=2 THEN 'in_exam' ELSE 'registered' END, 'Umum')
      RETURNING id INTO v_visit;
      INSERT INTO public.klinik_queue (visit_id, pasien_id, dokter_id, queue_no, queue_date, counter, status)
      VALUES (v_visit, v_pasien.id, v_dok, public.klinik_next_queue_no(CURRENT_DATE,'A'), CURRENT_DATE, 'A',
        CASE WHEN i=1 THEN 'in_service' WHEN i=2 THEN 'called' ELSE 'waiting' END);
    END IF;
  END LOOP;
END$$;

-- SEED 30 visit historis + medical record + invoice (fin_invoice: no_invoice, patient_code, patient_name, subtotal, total)
DO $$
DECLARE
  v_pasiens uuid[]; v_dokters uuid[];
  v_pas uuid; v_dok uuid; v_visit uuid;
  i int; v_date timestamptz; v_total numeric; v_pcode text; v_pname text;
  v_diagnoses text[] := ARRAY['Konjungtivitis','Mata Kering','Katarak Senilis','Refraksi Anomali','Glaukoma','Hordeolum','Pterygium','Mata Lelah Digital'];
  v_icd text[] := ARRAY['H10.9','H04.123','H25.9','H52.7','H40.9','H00.0','H11.0','H53.8'];
  v_diag_idx int;
BEGIN
  SELECT array_agg(id) INTO v_pasiens FROM (SELECT id FROM public.apps_pasien WHERE no_rm IS NOT NULL) s;
  SELECT array_agg(id) INTO v_dokters FROM (SELECT id FROM public.fin_dokter WHERE is_active=true) s;
  IF v_pasiens IS NULL OR v_dokters IS NULL THEN RETURN; END IF;
  FOR i IN 1..30 LOOP
    v_pas := v_pasiens[1 + (i % array_length(v_pasiens,1))];
    v_dok := v_dokters[1 + (i % array_length(v_dokters,1))];
    v_date := now() - ((i*8 || ' hours')::interval);
    v_diag_idx := 1 + (i % array_length(v_diagnoses,1));
    INSERT INTO public.klinik_visit (pasien_id, dokter_id, visit_date, chief_complaint, status, payment_status, patient_type)
    VALUES (v_pas, v_dok, v_date, 'Keluhan ' || v_diagnoses[v_diag_idx], 'done', 'paid',
      (ARRAY['Umum','BPJS','Asuransi'])[1+(i%3)])
    RETURNING id INTO v_visit;
    INSERT INTO public.klinik_medical_record (visit_id, pasien_id, dokter_id, anamnesis, visus_od, visus_os, tio_od, tio_os,
      slit_lamp, fundus, diagnosis, icd10_code, treatment_plan, is_final)
    VALUES (v_visit, v_pas, v_dok,
      'Pasien datang dengan keluhan ' || v_diagnoses[v_diag_idx] || '. Riwayat keluhan ' || (1+(i%14)) || ' hari.',
      (ARRAY['6/6','6/9','6/12','6/18','6/30','20/40','20/60'])[1+(i%7)],
      (ARRAY['6/6','6/9','6/12','6/18','6/30','20/40','20/60'])[1+((i+1)%7)],
      (12+(i%10))::text || ' mmHg', (12+((i+2)%10))::text || ' mmHg',
      'Normal, tenang', 'Refleks fovea (+), media jernih',
      v_diagnoses[v_diag_idx], v_icd[v_diag_idx],
      'Edukasi pasien, lanjutkan terapi medikamentosa, kontrol 2 minggu', true);
    v_total := 150000 + (i%5)*100000;
    SELECT patient_code, nama INTO v_pcode, v_pname FROM public.apps_pasien WHERE id=v_pas;
    INSERT INTO public.fin_invoice (no_invoice, tanggal, dokter_id, patient_code, patient_name, subtotal, pajak, total, status)
    VALUES ('INV-'||to_char(v_date,'YYYYMMDD')||'-'||lpad(i::text,4,'0'),
      v_date::date, v_dok, COALESCE(v_pcode,'P000000'), v_pname,
      v_total, 0, v_total, 'paid')
    ON CONFLICT (no_invoice) DO NOTHING;
  END LOOP;
END$$;
