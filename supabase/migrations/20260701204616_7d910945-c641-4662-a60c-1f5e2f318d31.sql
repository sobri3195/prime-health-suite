DO $$ BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.klinik_prescription_item; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;
ALTER TABLE public.klinik_prescription REPLICA IDENTITY FULL;
ALTER TABLE public.klinik_prescription_item REPLICA IDENTITY FULL;