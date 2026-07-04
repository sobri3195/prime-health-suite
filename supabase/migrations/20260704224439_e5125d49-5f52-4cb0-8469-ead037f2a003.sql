ALTER TABLE public.fin_journal_line ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
DROP TRIGGER IF EXISTS trg_fin_journal_line_updated ON public.fin_journal_line;
CREATE TRIGGER trg_fin_journal_line_updated BEFORE UPDATE ON public.fin_journal_line FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();