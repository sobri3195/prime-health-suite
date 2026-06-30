
-- Helpdesk tickets
CREATE TABLE public.apps_ticket (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_no text NOT NULL UNIQUE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reporter text NOT NULL,
  subject text NOT NULL,
  description text NOT NULL,
  category text NOT NULL DEFAULT 'request',
  priority text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'open',
  pic text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_apps_ticket_status ON public.apps_ticket(status, updated_at DESC);
CREATE INDEX idx_apps_ticket_user ON public.apps_ticket(user_id, created_at DESC);

CREATE TABLE public.apps_ticket_reply (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.apps_ticket(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  author_label text NOT NULL DEFAULT 'user',
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_apps_ticket_reply ON public.apps_ticket_reply(ticket_id, created_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.apps_ticket TO authenticated;
GRANT ALL ON public.apps_ticket TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.apps_ticket_reply TO authenticated;
GRANT ALL ON public.apps_ticket_reply TO service_role;

ALTER TABLE public.apps_ticket ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apps_ticket_reply ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ticket select own or staff" ON public.apps_ticket FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.klinik_is_staff(auth.uid()));
CREATE POLICY "ticket insert own" ON public.apps_ticket FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ticket update own or staff" ON public.apps_ticket FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.klinik_is_staff(auth.uid()))
  WITH CHECK (auth.uid() = user_id OR public.klinik_is_staff(auth.uid()));
CREATE POLICY "ticket delete staff" ON public.apps_ticket FOR DELETE TO authenticated
  USING (public.klinik_is_staff(auth.uid()));

CREATE POLICY "reply select if can see ticket" ON public.apps_ticket_reply FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.apps_ticket t WHERE t.id = ticket_id
    AND (t.user_id = auth.uid() OR public.klinik_is_staff(auth.uid()))));
CREATE POLICY "reply insert author" ON public.apps_ticket_reply FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = author_id AND EXISTS (SELECT 1 FROM public.apps_ticket t WHERE t.id = ticket_id
    AND (t.user_id = auth.uid() OR public.klinik_is_staff(auth.uid()))));

CREATE TRIGGER trg_apps_ticket_touch BEFORE UPDATE ON public.apps_ticket
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Touch ticket when reply added
CREATE OR REPLACE FUNCTION public.apps_ticket_touch_on_reply() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  UPDATE public.apps_ticket SET updated_at = now() WHERE id = NEW.ticket_id;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_apps_ticket_reply_touch AFTER INSERT ON public.apps_ticket_reply
  FOR EACH ROW EXECUTE FUNCTION public.apps_ticket_touch_on_reply();

-- Realtime
ALTER TABLE public.apps_ticket REPLICA IDENTITY FULL;
ALTER TABLE public.apps_ticket_reply REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.apps_ticket;
ALTER PUBLICATION supabase_realtime ADD TABLE public.apps_ticket_reply;
