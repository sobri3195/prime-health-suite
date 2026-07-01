
-- P1: Audit trail / versioning untuk Rekam Medis
CREATE TABLE IF NOT EXISTS public.klinik_medical_record_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  medical_record_id uuid NOT NULL,
  visit_id uuid,
  pasien_id uuid,
  changed_by uuid,
  changed_at timestamptz NOT NULL DEFAULT now(),
  action text NOT NULL, -- 'update' | 'finalize'
  snapshot jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_mrh_mr ON public.klinik_medical_record_history(medical_record_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_mrh_visit ON public.klinik_medical_record_history(visit_id);

GRANT SELECT, INSERT ON public.klinik_medical_record_history TO authenticated;
GRANT ALL ON public.klinik_medical_record_history TO service_role;

ALTER TABLE public.klinik_medical_record_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff read medrec history" ON public.klinik_medical_record_history
  FOR SELECT TO authenticated USING (public.klinik_is_staff(auth.uid()));

CREATE POLICY "staff insert medrec history" ON public.klinik_medical_record_history
  FOR INSERT TO authenticated WITH CHECK (public.klinik_is_staff(auth.uid()));

-- Trigger auto-snapshot on UPDATE
CREATE OR REPLACE FUNCTION public.klinik_medrec_snapshot()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  INSERT INTO public.klinik_medical_record_history (medical_record_id, visit_id, pasien_id, changed_by, action, snapshot)
  VALUES (OLD.id, OLD.visit_id, OLD.pasien_id, auth.uid(),
    CASE WHEN NEW.is_final IS TRUE AND (OLD.is_final IS DISTINCT FROM NEW.is_final) THEN 'finalize' ELSE 'update' END,
    to_jsonb(OLD));
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_klinik_medrec_snapshot ON public.klinik_medical_record;
CREATE TRIGGER trg_klinik_medrec_snapshot
  BEFORE UPDATE ON public.klinik_medical_record
  FOR EACH ROW EXECUTE FUNCTION public.klinik_medrec_snapshot();
