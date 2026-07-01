CREATE OR REPLACE FUNCTION public.klinik_next_no_rm()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_prefix text := 'PM-' || to_char(now(),'YYYYMM') || '-';
  v_next int;
BEGIN
  -- Advisory lock: prevents concurrent registrations from generating the same no_rm.
  -- Key derived from current year+month so it is scoped to the counter bucket.
  PERFORM pg_advisory_xact_lock(hashtext('klinik_next_no_rm:' || to_char(now(),'YYYYMM'))::bigint);
  SELECT COALESCE(MAX(NULLIF(regexp_replace(no_rm, '^.*-', ''), '')::int),0) + 1 INTO v_next
    FROM public.apps_pasien WHERE no_rm LIKE v_prefix || '%';
  RETURN v_prefix || lpad(v_next::text, 4, '0');
END$function$;