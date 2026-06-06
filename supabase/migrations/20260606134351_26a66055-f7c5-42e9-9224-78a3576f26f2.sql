-- ============================================================
-- M1 + M2: SIM Klinik Mata backend, RBAC, audit, settings
-- ============================================================

-- 1) ROLES INFRASTRUCTURE -------------------------------------
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('super_admin','dokter','perawat','kasir','pasien');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users see own roles" ON public.user_roles;
CREATE POLICY "users see own roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.current_user_roles()
RETURNS public.app_role[] LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(array_agg(role), ARRAY[]::public.app_role[])
    FROM public.user_roles WHERE user_id = auth.uid();
$$;

-- 2) CLINIC SETTINGS ------------------------------------------
CREATE TABLE IF NOT EXISTS public.clinic_setting (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

GRANT SELECT ON public.clinic_setting TO authenticated;
GRANT ALL ON public.clinic_setting TO service_role;

ALTER TABLE public.clinic_setting ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated read settings" ON public.clinic_setting;
CREATE POLICY "authenticated read settings" ON public.clinic_setting
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "super admin write settings" ON public.clinic_setting;
CREATE POLICY "super admin write settings" ON public.clinic_setting
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER trg_clinic_setting_touch
  BEFORE UPDATE ON public.clinic_setting
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) CLINIC AUDIT LOG -----------------------------------------
CREATE TABLE IF NOT EXISTS public.clinic_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ts timestamptz NOT NULL DEFAULT now(),
  actor_id uuid,
  actor_email text,
  actor_role text,
  module text NOT NULL,
  action text NOT NULL,
  target text,
  meta jsonb,
  ip text
);

CREATE INDEX IF NOT EXISTS idx_clinic_audit_ts ON public.clinic_audit_log (ts DESC);
CREATE INDEX IF NOT EXISTS idx_clinic_audit_module ON public.clinic_audit_log (module);
CREATE INDEX IF NOT EXISTS idx_clinic_audit_actor ON public.clinic_audit_log (actor_email);

GRANT SELECT, INSERT ON public.clinic_audit_log TO authenticated;
GRANT ALL ON public.clinic_audit_log TO service_role;

ALTER TABLE public.clinic_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "super admin read audit" ON public.clinic_audit_log;
CREATE POLICY "super admin read audit" ON public.clinic_audit_log
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "authenticated insert own audit" ON public.clinic_audit_log;
CREATE POLICY "authenticated insert own audit" ON public.clinic_audit_log
  FOR INSERT TO authenticated
  WITH CHECK (actor_id = auth.uid() OR actor_id IS NULL);

-- 4) CLINIC DOCUMENT ------------------------------------------
CREATE TABLE IF NOT EXISTS public.clinic_document (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_code text NOT NULL,
  patient_name text NOT NULL,
  doc_type text NOT NULL,
  title text NOT NULL,
  mime text NOT NULL DEFAULT 'pdf',
  size_bytes integer NOT NULL DEFAULT 0,
  storage_path text,
  uploaded_by uuid,
  uploaded_by_email text,
  uploaded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clinic_doc_patient ON public.clinic_document (patient_code);
CREATE INDEX IF NOT EXISTS idx_clinic_doc_type ON public.clinic_document (doc_type);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinic_document TO authenticated;
GRANT ALL ON public.clinic_document TO service_role;

ALTER TABLE public.clinic_document ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "clinic staff read documents" ON public.clinic_document;
CREATE POLICY "clinic staff read documents" ON public.clinic_document
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'dokter')
    OR public.has_role(auth.uid(), 'perawat')
    OR public.has_role(auth.uid(), 'kasir')
  );

DROP POLICY IF EXISTS "clinic staff write documents" ON public.clinic_document;
CREATE POLICY "clinic staff write documents" ON public.clinic_document
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'dokter')
    OR public.has_role(auth.uid(), 'perawat')
  );

DROP POLICY IF EXISTS "super admin delete documents" ON public.clinic_document;
CREATE POLICY "super admin delete documents" ON public.clinic_document
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

-- 5) SEED DEFAULT SETTINGS ------------------------------------
INSERT INTO public.clinic_setting (key, value) VALUES
  ('profile', jsonb_build_object(
    'clinicName','Klinik Mata Prime',
    'address','Jl. Sudirman No. 88, Jakarta Selatan',
    'phone','+62 21 5550-1234',
    'email','halo@klinikmata.id',
    'taxId','01.234.567.8-901.000',
    'bpjsCode','1234567'
  )),
  ('notif', jsonb_build_object('email',true,'whatsapp',true,'appointmentReminder',true,'lowStock',true)),
  ('security', jsonb_build_object('mfa',true,'sessionTimeout',30,'passwordRotationDays',90)),
  ('integrations', jsonb_build_object('finance',true,'primeApps',true,'whatsappGateway',false))
ON CONFLICT (key) DO NOTHING;
