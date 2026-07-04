CREATE OR REPLACE FUNCTION public.fin_report_aggregate_lines(_from date DEFAULT NULL, _to date DEFAULT NULL)
RETURNS TABLE(
  code text,
  name text,
  type text,
  cash_flow_section text,
  debit numeric,
  kredit numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(coa.code, jl.coa_code) AS code,
    COALESCE(coa.name, jl.coa_code) AS name,
    COALESCE(coa.type, 'Other') AS type,
    coa.cash_flow_section,
    COALESCE(SUM(jl.debit), 0)::numeric AS debit,
    COALESCE(SUM(jl.kredit), 0)::numeric AS kredit
  FROM public.fin_journal_line jl
  JOIN public.fin_journal_entry je ON je.id = jl.entry_id
  LEFT JOIN public.fin_coa coa ON coa.code = jl.coa_code
  WHERE je.status = 'posted'
    AND (_from IS NULL OR je.tanggal >= _from)
    AND (_to IS NULL OR je.tanggal <= _to)
    AND public.fin_can_view(auth.uid())
  GROUP BY COALESCE(coa.code, jl.coa_code), COALESCE(coa.name, jl.coa_code), COALESCE(coa.type, 'Other'), coa.cash_flow_section
  ORDER BY COALESCE(coa.code, jl.coa_code);
$$;

REVOKE ALL ON FUNCTION public.fin_report_aggregate_lines(date, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fin_report_aggregate_lines(date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fin_report_aggregate_lines(date, date) TO service_role;