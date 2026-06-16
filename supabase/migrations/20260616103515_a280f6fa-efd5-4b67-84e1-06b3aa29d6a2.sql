
-- Attach auto-journal triggers (functions already exist)
DROP TRIGGER IF EXISTS trg_fin_post_pembayaran ON public.fin_pembayaran;
CREATE TRIGGER trg_fin_post_pembayaran
AFTER INSERT ON public.fin_pembayaran
FOR EACH ROW EXECUTE FUNCTION public.fin_post_pembayaran();

DROP TRIGGER IF EXISTS trg_fin_post_expense ON public.fin_expense;
CREATE TRIGGER trg_fin_post_expense
AFTER INSERT ON public.fin_expense
FOR EACH ROW EXECUTE FUNCTION public.fin_post_expense();

DROP TRIGGER IF EXISTS trg_fin_post_bukti_setor ON public.fin_bukti_setor;
CREATE TRIGGER trg_fin_post_bukti_setor
AFTER INSERT ON public.fin_bukti_setor
FOR EACH ROW EXECUTE FUNCTION public.fin_post_bukti_setor();
