
CREATE TABLE IF NOT EXISTS public.klinik_jadwal (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dokter_id uuid REFERENCES public.fin_dokter(id) ON DELETE CASCADE,
  dokter_name text NOT NULL,
  poli text NOT NULL DEFAULT 'Umum',
  day text NOT NULL,
  start_time text NOT NULL,
  end_time text NOT NULL,
  quota int NOT NULL DEFAULT 10,
  booked int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.klinik_jadwal TO authenticated;
GRANT ALL ON public.klinik_jadwal TO service_role;

ALTER TABLE public.klinik_jadwal ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can read jadwal" ON public.klinik_jadwal
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin can manage jadwal" ON public.klinik_jadwal
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin_klinik') OR public.has_role(auth.uid(),'pendaftaran'))
  WITH CHECK (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin_klinik') OR public.has_role(auth.uid(),'pendaftaran'));

CREATE TRIGGER trg_klinik_jadwal_updated
  BEFORE UPDATE ON public.klinik_jadwal
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.klinik_jadwal (dokter_id, dokter_name, poli, day, start_time, end_time, quota, booked, is_active)
SELECT d.id, d.name, COALESCE(NULLIF(d.spesialisasi,''),'Umum'), x.day, x.start_time, x.end_time,
       x.quota, (random()*x.quota)::int, true
FROM public.fin_dokter d
CROSS JOIN (VALUES
  ('Senin','08:00','12:00',12),
  ('Selasa','13:00','17:00',10),
  ('Rabu','08:00','12:00',12),
  ('Kamis','13:00','17:00',10),
  ('Jumat','08:00','11:30',8)
) AS x(day, start_time, end_time, quota)
WHERE d.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.klinik_jadwal);
