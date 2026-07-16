import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Kept exported for UI display of the wipe scope; the actual delete list is
// enforced server-side inside fin_reset_transactional_atomic().
const TRANSACTIONAL_TABLES = [
  "fin_journal_line",
  "fin_journal_entry",
  "fin_pembayaran",
  "fin_invoice_item",
  "fin_invoice",
  "fin_expense_item",
  "fin_expense",
  "fin_persediaan_mutasi",
  "fin_aset_penyusutan",
  "fin_bukti_setor",
  "fin_surat_tagih",
  "fin_kas_kecil",
  "fin_bank_statement",
  "fin_reconciliation",
  "fin_rab",
] as const;

export const CONFIRM_PHRASE = "RESET DATA FINANCE";

const InputSchema = z.object({
  confirm: z.string(),
  scope: z.enum(["transactional"]).default("transactional"),
});

export const resetFinanceTransactional = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => InputSchema.parse(d))
  .handler(async ({ data, context }) => {
    if (data.confirm !== CONFIRM_PHRASE) {
      throw new Error(`Konfirmasi tidak cocok. Ketik persis: ${CONFIRM_PHRASE}`);
    }
    // Atomic: RPC deletes every transactional table + audit row in ONE txn.
    // Any failure → PostgreSQL rolls the entire operation back. Role check
    // (super_admin) and audit logging live inside the SECURITY DEFINER RPC.
    const { data: res, error } = await context.supabase.rpc("fin_reset_transactional_atomic");
    if (error) throw new Error(error.message);
    const r = res as { ok: boolean; results: { table: string; deleted: number }[] };
    return {
      ok: r.ok,
      results: r.results.map((x) => ({ table: x.table, deleted: x.deleted, error: null as string | null })),
      tables: TRANSACTIONAL_TABLES,
    };
  });

