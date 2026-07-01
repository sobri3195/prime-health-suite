-- 1) Revoke sensitive column reads on fin_dokter
REVOKE SELECT (npwp, phone, sip_number) ON public.fin_dokter FROM anon, authenticated;

-- 2) Scope apps_chat_msg policies to authenticated only
DROP POLICY IF EXISTS "Pasien kirim pesan sebagai patient" ON public.apps_chat_msg;
CREATE POLICY "Pasien kirim pesan sebagai patient" ON public.apps_chat_msg
  FOR INSERT TO authenticated
  WITH CHECK (
    sender = 'patient'
    AND EXISTS (SELECT 1 FROM public.apps_chat_room r WHERE r.id = apps_chat_msg.room_id AND r.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Pasien lihat pesan room sendiri" ON public.apps_chat_msg;
CREATE POLICY "Pasien lihat pesan room sendiri" ON public.apps_chat_msg
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.apps_chat_room r WHERE r.id = apps_chat_msg.room_id AND r.user_id = auth.uid()));

-- 3) Explicit restrictive UPDATE policy on clinic-documents storage bucket
DROP POLICY IF EXISTS "super admin update clinic-documents" ON storage.objects;
CREATE POLICY "super admin update clinic-documents" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'clinic-documents' AND public.klinik_is_admin(auth.uid()))
  WITH CHECK (bucket_id = 'clinic-documents' AND public.klinik_is_admin(auth.uid()));
