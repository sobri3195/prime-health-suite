
-- P3: Compliance & privacy
ALTER TABLE public.apps_pasien ADD COLUMN IF NOT EXISTS consent_privacy_at timestamptz;
ALTER TABLE public.apps_pasien ADD COLUMN IF NOT EXISTS consent_marketing_at timestamptz;
ALTER TABLE public.apps_pasien ADD COLUMN IF NOT EXISTS deletion_requested_at timestamptz;

-- Per-patient audit log (who accessed my data)
CREATE TABLE IF NOT EXISTS public.apps_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,          -- the patient whose data was accessed
  actor_id uuid,                  -- the user who performed the action (NULL = system)
  actor_label text,               -- email or "system" / "self" for display
  action text NOT NULL,           -- view, export, update, delete, consent, login
  resource text NOT NULL,         -- e.g. "profil", "rekam_medis", "booking"
  meta jsonb,
  ip text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.apps_audit_log TO authenticated;
GRANT ALL ON public.apps_audit_log TO service_role;

ALTER TABLE public.apps_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pasien lihat audit log sendiri"
  ON public.apps_audit_log FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Pasien insert audit log untuk dirinya"
  ON public.apps_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR auth.uid() = actor_id);

CREATE INDEX IF NOT EXISTS apps_audit_log_user_idx
  ON public.apps_audit_log (user_id, created_at DESC);

-- RPC: Export my data (UU PDP - hak akses)
CREATE OR REPLACE FUNCTION public.apps_export_my_data()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_out jsonb;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT jsonb_build_object(
    'exported_at', now(),
    'user_id', v_uid,
    'profil',          (SELECT to_jsonb(p) FROM public.apps_pasien p WHERE p.user_id = v_uid),
    'booking',         (SELECT COALESCE(jsonb_agg(to_jsonb(b)),'[]'::jsonb) FROM public.apps_booking b WHERE b.user_id = v_uid),
    'notif',           (SELECT COALESCE(jsonb_agg(to_jsonb(n)),'[]'::jsonb) FROM public.apps_notif n WHERE n.user_id = v_uid),
    'ai_history',      (SELECT COALESCE(jsonb_agg(to_jsonb(a)),'[]'::jsonb) FROM public.apps_ai_history a WHERE a.user_id = v_uid),
    'poin',            (SELECT COALESCE(jsonb_agg(to_jsonb(p)),'[]'::jsonb) FROM public.apps_poin p WHERE p.user_id = v_uid),
    'orders',          (SELECT COALESCE(jsonb_agg(to_jsonb(o)),'[]'::jsonb) FROM public.apps_order o WHERE o.user_id = v_uid),
    'reward_redeem',   (SELECT COALESCE(jsonb_agg(to_jsonb(r)),'[]'::jsonb) FROM public.apps_reward_redeem r WHERE r.user_id = v_uid),
    'invoice',         (SELECT COALESCE(jsonb_agg(to_jsonb(i)),'[]'::jsonb) FROM public.fin_invoice i WHERE i.apps_user_id = v_uid),
    'audit_log',       (SELECT COALESCE(jsonb_agg(to_jsonb(al)),'[]'::jsonb) FROM public.apps_audit_log al WHERE al.user_id = v_uid)
  ) INTO v_out;

  INSERT INTO public.apps_audit_log (user_id, actor_id, actor_label, action, resource)
  VALUES (v_uid, v_uid, 'self', 'export', 'all_data');

  RETURN v_out;
END $$;

-- RPC: request account deletion (mark, don't hard delete immediately)
CREATE OR REPLACE FUNCTION public.apps_request_account_deletion()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  UPDATE public.apps_pasien SET deletion_requested_at = now() WHERE user_id = v_uid;
  INSERT INTO public.apps_audit_log (user_id, actor_id, actor_label, action, resource)
  VALUES (v_uid, v_uid, 'self', 'delete_request', 'account');
END $$;

-- RPC: accept consent
CREATE OR REPLACE FUNCTION public.apps_accept_consent(_marketing boolean DEFAULT false)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  UPDATE public.apps_pasien
     SET consent_privacy_at = COALESCE(consent_privacy_at, now()),
         consent_marketing_at = CASE WHEN _marketing THEN COALESCE(consent_marketing_at, now()) ELSE consent_marketing_at END
   WHERE user_id = v_uid;
  INSERT INTO public.apps_audit_log (user_id, actor_id, actor_label, action, resource, meta)
  VALUES (v_uid, v_uid, 'self', 'consent', 'privacy_policy', jsonb_build_object('marketing', _marketing));
END $$;
