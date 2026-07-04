-- Composite indexes for hot query paths
CREATE INDEX IF NOT EXISTS idx_hr_overtime_run_tanggal ON public.hr_overtime (payroll_run_id, tanggal);
CREATE INDEX IF NOT EXISTS idx_hr_overtime_employee_tanggal ON public.hr_overtime (employee_id, tanggal);

CREATE INDEX IF NOT EXISTS idx_klinik_visit_date_status ON public.klinik_visit (visit_date, status);
CREATE INDEX IF NOT EXISTS idx_klinik_visit_pasien_date ON public.klinik_visit (pasien_id, visit_date DESC);

CREATE INDEX IF NOT EXISTS idx_apps_booking_dokter_tanggal ON public.apps_booking (dokter_id, tanggal, status);
CREATE INDEX IF NOT EXISTS idx_apps_booking_user_tanggal ON public.apps_booking (user_id, tanggal DESC, jam_slot DESC);