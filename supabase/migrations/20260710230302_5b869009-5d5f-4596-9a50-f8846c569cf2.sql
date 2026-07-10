
ALTER TABLE public.apps_chat_msg
  ADD COLUMN IF NOT EXISTS attachment_path text,
  ADD COLUMN IF NOT EXISTS attachment_name text,
  ADD COLUMN IF NOT EXISTS attachment_mime text;

CREATE OR REPLACE FUNCTION public.apps_leaderboard_periodik(_period text DEFAULT 'week')
RETURNS TABLE(rank integer, nama_mask text, total_poin integer, is_me boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH bounds AS (
    SELECT CASE
      WHEN _period = 'month' THEN date_trunc('month', now())
      WHEN _period = 'all'   THEN 'epoch'::timestamptz
      ELSE date_trunc('week', now())
    END AS since
  ),
  agg AS (
    SELECT p.user_id, SUM(p.delta)::int AS total_poin
      FROM public.apps_poin p, bounds b
     WHERE p.created_at >= b.since AND p.delta > 0
     GROUP BY p.user_id
  )
  SELECT
    (ROW_NUMBER() OVER (ORDER BY a.total_poin DESC))::int AS rank,
    COALESCE(left(ap.nama,1) || '***' || right(ap.nama,1), 'Anon') AS nama_mask,
    a.total_poin,
    (a.user_id = auth.uid()) AS is_me
  FROM agg a
  LEFT JOIN public.apps_pasien ap ON ap.user_id = a.user_id
  ORDER BY a.total_poin DESC
  LIMIT 20;
$$;

CREATE OR REPLACE FUNCTION public.apps_revoke_marketing_consent()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  UPDATE public.apps_pasien SET consent_marketing_at = NULL WHERE user_id = v_uid;
  INSERT INTO public.apps_audit_log (user_id, actor_id, actor_label, action, resource, meta)
  VALUES (v_uid, v_uid, 'self', 'consent_revoke', 'marketing', '{}'::jsonb);
END $$;
