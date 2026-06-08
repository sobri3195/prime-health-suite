
DO $$ BEGIN CREATE TYPE public.hr_attendance_status AS ENUM ('hadir','telat','alpa','izin','sakit','cuti'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.hr_overtime_mode AS ENUM ('uang','jam'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.hr_overtime_status AS ENUM ('pending','approved','rejected','cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.hr_payroll_status AS ENUM ('draft','final','paid'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.hr_shift (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nama text NOT NULL UNIQUE,
  jam_mulai time NOT NULL,
  jam_selesai time NOT NULL,
  toleransi_menit int NOT NULL DEFAULT 15,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.hr_shift TO authenticated;
GRANT ALL ON public.hr_shift TO service_role;
ALTER TABLE public.hr_shift ENABLE ROW LEVEL SECURITY;
CREATE POLICY "shift readable" ON public.hr_shift FOR SELECT TO authenticated USING (true);
CREATE POLICY "shift manage super" ON public.hr_shift FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin')) WITH CHECK (public.has_role(auth.uid(),'super_admin'));
CREATE TRIGGER trg_hr_shift_updated BEFORE UPDATE ON public.hr_shift
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.hr_employee (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  karyawan_id uuid REFERENCES public.fin_karyawan(id) ON DELETE SET NULL,
  user_id uuid UNIQUE,
  nama text NOT NULL,
  jabatan text,
  shift_default_id uuid REFERENCES public.hr_shift(id),
  gaji_pokok numeric(14,2) NOT NULL DEFAULT 0,
  tarif_lembur_per_jam numeric(12,2),
  saldo_jam_lembur numeric(8,2) NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hr_employee TO authenticated;
GRANT ALL ON public.hr_employee TO service_role;
ALTER TABLE public.hr_employee ENABLE ROW LEVEL SECURITY;
CREATE POLICY "emp read self or super" ON public.hr_employee FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "emp manage super" ON public.hr_employee FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin')) WITH CHECK (public.has_role(auth.uid(),'super_admin'));
CREATE TRIGGER trg_hr_employee_updated BEFORE UPDATE ON public.hr_employee
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.hr_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.hr_employee(id) ON DELETE CASCADE,
  tanggal date NOT NULL,
  shift_id uuid REFERENCES public.hr_shift(id),
  clock_in timestamptz,
  clock_out timestamptz,
  total_jam_kerja numeric(6,2),
  status public.hr_attendance_status NOT NULL DEFAULT 'hadir',
  catatan text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (employee_id, tanggal)
);
CREATE INDEX IF NOT EXISTS idx_hr_att_emp_tgl ON public.hr_attendance(employee_id, tanggal DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hr_attendance TO authenticated;
GRANT ALL ON public.hr_attendance TO service_role;
ALTER TABLE public.hr_attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "att read self or super" ON public.hr_attendance FOR SELECT TO authenticated
  USING (employee_id IN (SELECT id FROM public.hr_employee WHERE user_id = auth.uid())
         OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "att insert self or super" ON public.hr_attendance FOR INSERT TO authenticated
  WITH CHECK (employee_id IN (SELECT id FROM public.hr_employee WHERE user_id = auth.uid())
              OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "att update self or super" ON public.hr_attendance FOR UPDATE TO authenticated
  USING (employee_id IN (SELECT id FROM public.hr_employee WHERE user_id = auth.uid())
         OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "att delete super" ON public.hr_attendance FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'super_admin'));
CREATE TRIGGER trg_hr_attendance_updated BEFORE UPDATE ON public.hr_attendance
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.hr_overtime (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.hr_employee(id) ON DELETE CASCADE,
  attendance_id uuid REFERENCES public.hr_attendance(id) ON DELETE SET NULL,
  tanggal date NOT NULL,
  jam_mulai time NOT NULL,
  jam_selesai time NOT NULL,
  durasi_jam numeric(6,2) NOT NULL,
  alasan text,
  mode public.hr_overtime_mode NOT NULL DEFAULT 'uang',
  tarif_per_jam numeric(12,2),
  nominal numeric(14,2),
  status public.hr_overtime_status NOT NULL DEFAULT 'pending',
  approved_by uuid,
  approved_at timestamptz,
  approval_note text,
  payroll_run_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_hr_ot_emp_status ON public.hr_overtime(employee_id, status);
CREATE INDEX IF NOT EXISTS idx_hr_ot_tgl ON public.hr_overtime(tanggal DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hr_overtime TO authenticated;
GRANT ALL ON public.hr_overtime TO service_role;
ALTER TABLE public.hr_overtime ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ot read self or super" ON public.hr_overtime FOR SELECT TO authenticated
  USING (employee_id IN (SELECT id FROM public.hr_employee WHERE user_id = auth.uid())
         OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "ot insert self or super" ON public.hr_overtime FOR INSERT TO authenticated
  WITH CHECK (employee_id IN (SELECT id FROM public.hr_employee WHERE user_id = auth.uid())
              OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "ot update self pending or super" ON public.hr_overtime FOR UPDATE TO authenticated
  USING ((employee_id IN (SELECT id FROM public.hr_employee WHERE user_id = auth.uid()) AND status = 'pending')
         OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "ot delete super" ON public.hr_overtime FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'super_admin'));
CREATE TRIGGER trg_hr_overtime_updated BEFORE UPDATE ON public.hr_overtime
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.hr_payroll_run (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  periode_bulan int NOT NULL,
  periode_tahun int NOT NULL,
  status public.hr_payroll_status NOT NULL DEFAULT 'draft',
  total_gaji numeric(16,2) NOT NULL DEFAULT 0,
  total_lembur numeric(16,2) NOT NULL DEFAULT 0,
  total_take_home numeric(16,2) NOT NULL DEFAULT 0,
  dibuat_oleh uuid,
  difinalisasi_oleh uuid,
  difinalisasi_at timestamptz,
  catatan text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (periode_bulan, periode_tahun)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hr_payroll_run TO authenticated;
GRANT ALL ON public.hr_payroll_run TO service_role;
ALTER TABLE public.hr_payroll_run ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payroll super only" ON public.hr_payroll_run FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin')) WITH CHECK (public.has_role(auth.uid(),'super_admin'));
CREATE TRIGGER trg_hr_payroll_run_updated BEFORE UPDATE ON public.hr_payroll_run
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.hr_payroll_item (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_run_id uuid NOT NULL REFERENCES public.hr_payroll_run(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.hr_employee(id) ON DELETE RESTRICT,
  nama_snapshot text NOT NULL,
  gaji_pokok numeric(14,2) NOT NULL DEFAULT 0,
  total_jam_lembur numeric(8,2) NOT NULL DEFAULT 0,
  nominal_lembur numeric(14,2) NOT NULL DEFAULT 0,
  potongan numeric(14,2) NOT NULL DEFAULT 0,
  take_home numeric(14,2) NOT NULL DEFAULT 0,
  catatan text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (payroll_run_id, employee_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hr_payroll_item TO authenticated;
GRANT ALL ON public.hr_payroll_item TO service_role;
ALTER TABLE public.hr_payroll_item ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payroll item read super or self" ON public.hr_payroll_item FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'super_admin')
         OR employee_id IN (SELECT id FROM public.hr_employee WHERE user_id = auth.uid()));
CREATE POLICY "payroll item write super" ON public.hr_payroll_item FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin')) WITH CHECK (public.has_role(auth.uid(),'super_admin'));
CREATE TRIGGER trg_hr_payroll_item_updated BEFORE UPDATE ON public.hr_payroll_item
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.hr_overtime
  ADD CONSTRAINT hr_overtime_payroll_run_fk
  FOREIGN KEY (payroll_run_id) REFERENCES public.hr_payroll_run(id) ON DELETE SET NULL;

INSERT INTO public.hr_shift (nama, jam_mulai, jam_selesai, toleransi_menit) VALUES
  ('Pagi','08:00','16:00',15),
  ('Siang','13:00','21:00',15),
  ('Malam','21:00','05:00',15)
ON CONFLICT (nama) DO NOTHING;
