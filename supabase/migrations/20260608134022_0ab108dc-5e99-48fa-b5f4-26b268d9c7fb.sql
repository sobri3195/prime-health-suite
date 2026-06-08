
CREATE TABLE public.klinik_diklat (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  judul text NOT NULL,
  ringkasan text,
  deskripsi text,
  tanggal date NOT NULL DEFAULT CURRENT_DATE,
  dokter_id uuid REFERENCES public.fin_dokter(id) ON DELETE SET NULL,
  youtube_url text,
  cover_image_url text,
  galeri jsonb NOT NULL DEFAULT '[]'::jsonb,
  pdf_url text,
  tags text[] NOT NULL DEFAULT ARRAY[]::text[],
  is_published boolean NOT NULL DEFAULT false,
  views_count integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX klinik_diklat_published_idx ON public.klinik_diklat(is_published, tanggal DESC);
CREATE INDEX klinik_diklat_slug_idx ON public.klinik_diklat(slug);

GRANT SELECT ON public.klinik_diklat TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.klinik_diklat TO authenticated;
GRANT ALL ON public.klinik_diklat TO service_role;

ALTER TABLE public.klinik_diklat ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read published diklat"
  ON public.klinik_diklat FOR SELECT
  USING (is_published = true);

CREATE POLICY "Super admin read all diklat"
  ON public.klinik_diklat FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admin manage diklat"
  ON public.klinik_diklat FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER klinik_diklat_touch BEFORE UPDATE ON public.klinik_diklat
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
