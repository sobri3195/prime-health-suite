DO $$ BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.klinik_queue; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.klinik_visit; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.klinik_medical_record; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.klinik_prescription; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.fin_invoice; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.fin_pembayaran; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;
ALTER TABLE public.klinik_queue REPLICA IDENTITY FULL;
ALTER TABLE public.klinik_visit REPLICA IDENTITY FULL;
ALTER TABLE public.klinik_medical_record REPLICA IDENTITY FULL;
ALTER TABLE public.klinik_prescription REPLICA IDENTITY FULL;
ALTER TABLE public.fin_invoice REPLICA IDENTITY FULL;
ALTER TABLE public.fin_pembayaran REPLICA IDENTITY FULL;