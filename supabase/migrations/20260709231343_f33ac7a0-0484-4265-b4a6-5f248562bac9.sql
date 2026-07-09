
-- 1) hr_employee: allow employees to read their own record.
CREATE POLICY "Employee can read own record"
ON public.hr_employee
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- 2) klinik_diklat: hide internal identifier columns (dokter_id, created_by)
--    from anonymous readers. Revoke table-level SELECT then grant only the
--    safe public-facing columns. Authenticated staff still see everything
--    via their existing table-level grant.
REVOKE SELECT ON public.klinik_diklat FROM anon;
GRANT SELECT
  (id, judul, slug, ringkasan, deskripsi, tanggal, cover_image_url,
   youtube_url, pdf_url, galeri, tags, is_published, views_count,
   created_at, updated_at)
ON public.klinik_diklat TO anon;
