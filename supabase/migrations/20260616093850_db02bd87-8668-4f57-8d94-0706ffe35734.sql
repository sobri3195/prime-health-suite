REVOKE EXECUTE ON FUNCTION public.fin_resolve_cash_bank_coa(text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fin_post_journal(date, text, uuid, text, text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fin_post_pembayaran() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fin_post_expense() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fin_post_bukti_setor() FROM PUBLIC, anon, authenticated;