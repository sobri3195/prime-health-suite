
DROP VIEW IF EXISTS public.fin_dokter_directory;

CREATE OR REPLACE FUNCTION public.apps_list_doctors()
RETURNS TABLE(id uuid, code text, name text, spesialisasi text, schedule_note text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, code, name, spesialisasi, schedule_note
    FROM public.fin_dokter
   WHERE is_active = true
   ORDER BY name;
$$;

REVOKE ALL ON FUNCTION public.apps_list_doctors() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.apps_list_doctors() TO authenticated;
