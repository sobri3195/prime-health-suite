import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { writeFinAudit } from "./finance-audit.helper";
import { requireFinView, requireFinEdit } from "./finance-guard";

async function sb() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

// ============ BANK STATEMENT ============
export const listBankStatement = createServerFn({ method: "POST" })
  .middleware([requireFinView])
  .inputValidator((d: { from?: string; to?: string; bank?: string; matched?: "all" | "true" | "false" } = {}) => d)
  .handler(async ({ data, context }) => {
    const s = await sb();
    let q = s.from("fin_bank_statement").select("*").order("tanggal", { ascending: false }).limit(1000);
    if (data.from) q = q.gte("tanggal", data.from);
    if (data.to) q = q.lte("tanggal", data.to);
    if (data.bank) q = q.eq("bank", data.bank);
    if (data.matched === "true") q = q.eq("matched", true);
    if (data.matched === "false") q = q.eq("matched", false);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return { rows: rows ?? [] };
  });

const importRowSchema = z.object({
  tanggal: z.string(),
  deskripsi: z.string(),
  debit: z.number().default(0),
  kredit: z.number().default(0),
  saldo: z.number().nullable().optional(),
  ref: z.string().nullable().optional(),
});

export const importBankStatement = createServerFn({ method: "POST" })
  .middleware([requireFinEdit])
  .inputValidator((d: { bank: string; rows: z.infer<typeof importRowSchema>[]; actor?: string }) => ({
    bank: z.string().min(1).parse(d.bank),
    rows: z.array(importRowSchema).min(1).parse(d.rows),
    actor: d.actor,
  }))
  .handler(async ({ data, context }) => {
    const s = await sb();
    const batch = `BATCH-${Date.now()}`;
    const payload = data.rows.map((r) => ({
      bank: data.bank,
      tanggal: r.tanggal,
      deskripsi: r.deskripsi,
      debit: Number(r.debit) || 0,
      kredit: Number(r.kredit) || 0,
      saldo: r.saldo ?? null,
      ref: r.ref ?? null,
      imported_by: data.actor ?? null,
      imported_batch: batch,
    }));
    const { error, data: inserted } = await s.from("fin_bank_statement").insert(payload).select("id");
    if (error) throw new Error(error.message);
    await writeFinAudit({ actor_id: context.userId, actor_email: (context.claims as { email?: string } | null)?.email ?? null, action: "import", entity: "bank_statement", entity_no: batch, after: { count: inserted?.length, bank: data.bank } });
    return { count: inserted?.length ?? 0, batch };
  });

const deleteStmtSchema = z.object({ id: z.string().uuid(), actor: z.string().max(200).optional() });
export const deleteBankStatement = createServerFn({ method: "POST" })
  .middleware([requireFinEdit])
  .inputValidator((d: unknown) => deleteStmtSchema.parse(d))
  .handler(async ({ data, context }) => {
    const s = await sb();
    await s.from("fin_bank_statement").delete().eq("id", data.id);
    await writeFinAudit({ actor_id: context.userId, actor_email: (context.claims as { email?: string } | null)?.email ?? null, action: "delete", entity: "bank_statement", entity_id: data.id });
    return { ok: true };
  });

// ============ AUTO MATCH ============
// Match each unmatched statement row against existing journal lines that touch
// kas/bank COA (1100/1110/1120), within ±2 days and same amount.
export const autoMatchStatement = createServerFn({ method: "POST" })
  .middleware([requireFinEdit])
  .inputValidator((d: { bank?: string; from?: string; to?: string; actor?: string } = {}) => d)
  .handler(async ({ data, context }) => {
    const s = await sb();
    let bq = s.from("fin_bank_statement").select("*").eq("matched", false).order("tanggal");
    if (data.bank) bq = bq.eq("bank", data.bank);
    if (data.from) bq = bq.gte("tanggal", data.from);
    if (data.to) bq = bq.lte("tanggal", data.to);
    const { data: stmts } = await bq;
    if (!stmts?.length) return { matched: 0 };

    // collect candidate journal lines (cash/bank COA)
    const { data: lines } = await s
      .from("fin_journal_line")
      .select("id, entry_id, coa_code, debit, kredit, fin_journal_entry!inner(tanggal, status)")
      .in("coa_code", ["1100", "1110", "1120"])
      .eq("fin_journal_entry.status", "posted");

    let matched = 0;
    const usedLines = new Set<string>();
    for (const st of stmts) {
      const target = Number(st.kredit) > 0 ? Number(st.kredit) : Number(st.debit);
      const stDate = new Date(st.tanggal).getTime();
      const cand = (lines ?? []).find((l: any) => {
        if (usedLines.has(l.id)) return false;
        const lineAmt = Number(l.debit) || Number(l.kredit);
        if (Math.abs(lineAmt - target) > 0.5) return false;
        const d = new Date(l.fin_journal_entry.tanggal).getTime();
        return Math.abs(d - stDate) <= 2 * 86400000;
      });
      if (!cand) continue;
      usedLines.add(cand.id);
      await s.from("fin_reconciliation").insert({
        statement_id: st.id, journal_line_id: cand.id, selisih: 0,
        status: "matched", matched_by: data.actor ?? null,
      });
      await s.from("fin_bank_statement").update({ matched: true }).eq("id", st.id);
      matched++;
    }
    await writeFinAudit({ actor_id: context.userId, actor_email: (context.claims as { email?: string } | null)?.email ?? null, action: "reconcile", entity: "bank_statement", after: { matched } });
    return { matched };
  });

const unmatchSchema = z.object({ statement_id: z.string().uuid(), actor: z.string().max(200).optional() });
export const unmatchStatement = createServerFn({ method: "POST" })
  .middleware([requireFinEdit])
  .inputValidator((d: unknown) => unmatchSchema.parse(d))
  .handler(async ({ data, context }) => {
    const s = await sb();
    await s.from("fin_reconciliation").delete().eq("statement_id", data.statement_id);
    await s.from("fin_bank_statement").update({ matched: false }).eq("id", data.statement_id);
    await writeFinAudit({ actor_id: context.userId, actor_email: (context.claims as { email?: string } | null)?.email ?? null, action: "unmatch", entity: "bank_statement", entity_id: data.statement_id });
    return { ok: true };
  });

// Adjustment: create journal entry for selisih (e.g. bank admin fee, interest)
const adjustSchema = z.object({
  statement_id: z.string().uuid(),
  coa_debit: z.string().min(1).max(20),
  coa_kredit: z.string().min(1).max(20),
  amount: z.number().positive().finite(),
  keterangan: z.string().min(1).max(500),
  actor: z.string().max(200).optional(),
});
export const adjustStatement = createServerFn({ method: "POST" })
  .middleware([requireFinEdit])
  .inputValidator((d: unknown) => adjustSchema.parse(d))
  .handler(async ({ data, context }) => {
    const s = await sb();
    const { data: st } = await s.from("fin_bank_statement").select("*").eq("id", data.statement_id).single();
    if (!st) throw new Error("Statement tidak ditemukan");
    // sequence
    const yyyymm = new Date().toISOString().slice(0, 7).replace("-", "");
    const { data: last } = await s.from("fin_journal_entry").select("no_jurnal").like("no_jurnal", `JV-${yyyymm}-%`).order("no_jurnal", { ascending: false }).limit(1);
    const n = Number((last?.[0]?.no_jurnal ?? "").split("-").pop() ?? "0") + 1;
    const no_jurnal = `JV-${yyyymm}-${String(n).padStart(4, "0")}`;
    const { data: entry, error } = await s.from("fin_journal_entry").insert({
      no_jurnal, tanggal: st.tanggal, sumber: "manual", ref_id: data.statement_id, ref_no: `ADJ-${st.bank}`,
      keterangan: `Penyesuaian rekonsiliasi: ${data.keterangan}`, total: Number(data.amount), status: "posted",
      created_by: data.actor ?? null,
    }).select().single();
    if (error) throw new Error(error.message);
    await s.from("fin_journal_line").insert([
      { entry_id: entry.id, coa_code: data.coa_debit, debit: data.amount, kredit: 0, keterangan: data.keterangan },
      { entry_id: entry.id, coa_code: data.coa_kredit, debit: 0, kredit: data.amount, keterangan: data.keterangan },
    ]);
    await s.from("fin_reconciliation").insert({
      statement_id: data.statement_id, selisih: data.amount, status: "adjusted",
      matched_by: data.actor ?? null, catatan: data.keterangan,
    });
    await s.from("fin_bank_statement").update({ matched: true }).eq("id", data.statement_id);
    await writeFinAudit({ actor_id: context.userId, actor_email: (context.claims as { email?: string } | null)?.email ?? null, action: "post", entity: "journal", entity_id: entry.id, entity_no: no_jurnal, reason: `Penyesuaian rekonsiliasi`, after: entry });
    return { ok: true, no_jurnal };
  });

export const reconSummary = createServerFn({ method: "POST" })
  .middleware([requireFinView])
  .inputValidator((d: { from?: string; to?: string; bank?: string } = {}) => d)
  .handler(async ({ data, context }) => {
    const s = await sb();
    let q = s.from("fin_bank_statement").select("*");
    if (data.bank) q = q.eq("bank", data.bank);
    if (data.from) q = q.gte("tanggal", data.from);
    if (data.to) q = q.lte("tanggal", data.to);
    const { data: stmts } = await q;
    const total = stmts?.length ?? 0;
    const matched = (stmts ?? []).filter((r: any) => r.matched).length;
    const unmatched = total - matched;
    const inflow = (stmts ?? []).reduce((a: number, r: any) => a + Number(r.kredit), 0);
    const outflow = (stmts ?? []).reduce((a: number, r: any) => a + Number(r.debit), 0);
    const lastSaldo = (stmts ?? []).slice().sort((a: any, b: any) => (a.tanggal < b.tanggal ? 1 : -1))[0]?.saldo ?? null;

    // book balance: sum of cash/bank journal lines (posted only)
    const { data: lines } = await s
      .from("fin_journal_line")
      .select("debit, kredit, fin_journal_entry!inner(tanggal, status)")
      .in("coa_code", ["1100", "1110", "1120"])
      .eq("fin_journal_entry.status", "posted");
    let bookBalance = 0;
    for (const l of lines ?? []) bookBalance += Number(l.debit) - Number(l.kredit);
    return { total, matched, unmatched, inflow, outflow, lastSaldo, bookBalance };
  });
