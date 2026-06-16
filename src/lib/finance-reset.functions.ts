import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Transactional tables wiped on reset. Order matters: children before parents.
// Masters (coa, cost_center, dokter, karyawan, payer, vendor, layanan, tarif_pajak,
// profil_klinik, persediaan, aset, mdr_rule, template_*) are intentionally NOT
// included — only operational data is cleared.
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
    const { supabase, userId } = context;
    if (data.confirm !== CONFIRM_PHRASE) {
      throw new Error(`Konfirmasi tidak cocok. Ketik persis: ${CONFIRM_PHRASE}`);
    }

    // Verify caller is super_admin.
    const { data: roles, error: rolesErr } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    if (rolesErr) throw rolesErr;
    const isSuper = (roles ?? []).some((r) => (r as { role: string }).role === "super_admin");
    if (!isSuper) {
      throw new Error("Hanya super_admin yang dapat melakukan reset data finance.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const results: { table: string; deleted: number | null; error: string | null }[] = [];

    for (const table of TRANSACTIONAL_TABLES) {
      const { count, error } = await supabaseAdmin
        .from(table)
        .delete({ count: "exact" })
        .not("id", "is", null);
      results.push({
        table,
        deleted: error ? null : count ?? 0,
        error: error?.message ?? null,
      });
    }

    // Audit (best-effort, ignore failure)
    try {
      await supabase.from("fin_audit_log").insert({
        actor_id: userId,
        entity: "finance",
        action: "reset_transactional",
        after: { tables: TRANSACTIONAL_TABLES, results } as unknown as never,
      });
    } catch {
      // ignore
    }


    return { ok: true, results };
  });
