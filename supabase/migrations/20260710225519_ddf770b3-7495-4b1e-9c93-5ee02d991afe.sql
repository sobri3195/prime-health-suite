
CREATE TABLE IF NOT EXISTS public.apps_artikel_rating (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artikel_id uuid NOT NULL REFERENCES public.apps_artikel(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (artikel_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.apps_artikel_rating TO authenticated;
GRANT ALL ON public.apps_artikel_rating TO service_role;
ALTER TABLE public.apps_artikel_rating ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read all ratings" ON public.apps_artikel_rating FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert own rating" ON public.apps_artikel_rating FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update own rating" ON public.apps_artikel_rating FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete own rating" ON public.apps_artikel_rating FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_apps_artikel_rating_artikel ON public.apps_artikel_rating(artikel_id);
