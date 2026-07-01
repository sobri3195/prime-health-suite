
-- 1) fin_dokter: hapus akses baca luas oleh pasien+staf; batasi hanya staf
DROP POLICY IF EXISTS "Pasien & staf baca dokter aktif" ON public.fin_dokter;

CREATE POLICY "Staf klinik baca dokter"
  ON public.fin_dokter
  FOR SELECT
  TO authenticated
  USING (public.klinik_is_staff(auth.uid()));

-- View direktori dokter khusus pasien (kolom aman saja)
CREATE OR REPLACE VIEW public.fin_dokter_directory
WITH (security_invoker = off) AS
  SELECT id, code, name, spesialisasi, schedule_note, is_active
    FROM public.fin_dokter
   WHERE is_active = true;

REVOKE ALL ON public.fin_dokter_directory FROM PUBLIC, anon;
GRANT SELECT ON public.fin_dokter_directory TO authenticated;

-- 2) fin_karyawan: batasi baca ke peran finance saja (bukan seluruh staf klinik)
DROP POLICY IF EXISTS "fin_karyawan_staff_select" ON public.fin_karyawan;

CREATE POLICY "fin_karyawan_finance_select"
  ON public.fin_karyawan
  FOR SELECT
  TO authenticated
  USING (public.fin_can_view(auth.uid()));

-- 3) hr_employee: hilangkan self-read (gaji sendiri tidak boleh dibaca via tabel),
--    hanya super_admin yang dapat membaca kolom sensitif payroll.
DROP POLICY IF EXISTS "emp read self or super" ON public.hr_employee;

CREATE POLICY "emp read super only"
  ON public.hr_employee
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));
