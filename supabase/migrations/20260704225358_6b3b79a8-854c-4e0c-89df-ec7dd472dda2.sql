REVOKE ALL ON FUNCTION public.fin_report_aggregate_lines(date, date) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fin_report_aggregate_lines(date, date) FROM anon;
GRANT EXECUTE ON FUNCTION public.fin_report_aggregate_lines(date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fin_report_aggregate_lines(date, date) TO service_role;