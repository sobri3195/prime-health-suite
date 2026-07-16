
-- P0 Fix: harden finance RLS so kasir cannot bypass business logic by writing
-- directly to journal/expense tables. Mirror the fin_invoice pattern:
-- SELECT via fin_can_view, all writes via service_role only (server fns/triggers).

DROP POLICY IF EXISTS fin_expense_admin_all ON public.fin_expense;
DROP POLICY IF EXISTS fin_expense_item_admin_all ON public.fin_expense_item;
DROP POLICY IF EXISTS fin_journal_entry_admin_all ON public.fin_journal_entry;
DROP POLICY IF EXISTS fin_journal_line_admin_all ON public.fin_journal_line;

-- fin_expense
CREATE POLICY fin_expense_select ON public.fin_expense
  FOR SELECT TO authenticated
  USING (public.fin_can_view(auth.uid()));
CREATE POLICY fin_expense_service_write ON public.fin_expense
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- fin_expense_item
CREATE POLICY fin_expense_item_select ON public.fin_expense_item
  FOR SELECT TO authenticated
  USING (public.fin_can_view(auth.uid()));
CREATE POLICY fin_expense_item_service_write ON public.fin_expense_item
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- fin_journal_entry
CREATE POLICY fin_journal_entry_select ON public.fin_journal_entry
  FOR SELECT TO authenticated
  USING (public.fin_can_view(auth.uid()));
CREATE POLICY fin_journal_entry_service_write ON public.fin_journal_entry
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- fin_journal_line
CREATE POLICY fin_journal_line_select ON public.fin_journal_line
  FOR SELECT TO authenticated
  USING (public.fin_can_view(auth.uid()));
CREATE POLICY fin_journal_line_service_write ON public.fin_journal_line
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Ensure grants match (SELECT for authenticated, full to service_role).
GRANT SELECT ON public.fin_expense TO authenticated;
GRANT SELECT ON public.fin_expense_item TO authenticated;
GRANT SELECT ON public.fin_journal_entry TO authenticated;
GRANT SELECT ON public.fin_journal_line TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.fin_expense FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.fin_expense_item FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.fin_journal_entry FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.fin_journal_line FROM authenticated;
GRANT ALL ON public.fin_expense TO service_role;
GRANT ALL ON public.fin_expense_item TO service_role;
GRANT ALL ON public.fin_journal_entry TO service_role;
GRANT ALL ON public.fin_journal_line TO service_role;
