
CREATE POLICY "clinic staff read clinic-documents"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'clinic-documents' AND (
    public.has_role(auth.uid(),'super_admin') OR
    public.has_role(auth.uid(),'dokter') OR
    public.has_role(auth.uid(),'perawat') OR
    public.has_role(auth.uid(),'kasir')
  )
);

CREATE POLICY "clinic staff upload clinic-documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'clinic-documents' AND (
    public.has_role(auth.uid(),'super_admin') OR
    public.has_role(auth.uid(),'dokter') OR
    public.has_role(auth.uid(),'perawat')
  )
);

CREATE POLICY "super admin delete clinic-documents"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'clinic-documents' AND public.has_role(auth.uid(),'super_admin')
);
