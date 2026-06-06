
CREATE POLICY "Pasien upload foto mata sendiri"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'apps-mata' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Pasien lihat foto mata sendiri"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'apps-mata' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Pasien hapus foto mata sendiri"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'apps-mata' AND auth.uid()::text = (storage.foldername(name))[1]);
