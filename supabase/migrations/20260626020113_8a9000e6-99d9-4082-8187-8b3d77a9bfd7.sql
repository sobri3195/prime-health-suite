CREATE OR REPLACE FUNCTION public.handle_new_apps_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_code text;
BEGIN
  v_code := 'P-' || to_char(now(),'YYYYMMDD') || '-' || upper(substr(md5(NEW.id::text || clock_timestamp()::text),1,6));
  INSERT INTO public.apps_pasien (user_id, nama, patient_code, patient_type)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nama', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    v_code,
    'umum'
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$function$;