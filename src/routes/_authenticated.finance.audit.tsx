import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/lib/page-head";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { PageHeader } from "@/components/app-shell";
import { useFinanceDate } from "@/context/finance-date";
import { listFinAudit, revertFinAudit } from "@/lib/finance-report.functions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Search, Undo2, Download, BookmarkPlus, Bookmark, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useFinanceAccess } from "@/lib/finance-access";

type AuditPreset = { name: string; q: string; entity: string; action: string };
const PRESET_KEY = "fin-audit-presets-v1";
function loadPresets(): AuditPreset[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(PRESET_KEY) || "[]"); } catch { return []; }
}
function savePresets(p: AuditPreset[]) { localStorage.setItem(PRESET_KEY, JSON.stringify(p)); }

export const Route = createFileRoute("/_authenticated/finance/audit")({ 
  head: () => pageHead({ title: "Audit Log Finance — Finance", description: "Audit Log Finance pada modul keuangan klinik.", path: "/finance/audit" }),
  component: AuditPage });

const ACTION_TONE: Record<string, string> = {
  create: "bg-emerald-500/15 text-emerald-700",
  edit: "bg-blue-500/15 text-blue-700",
  void: "bg-rose-500/15 text-rose-700",
  delete: "bg-rose-500/15 text-rose-700",
  pay: "bg-violet-500/15 text-violet-700",
  post: "bg-cyan-500/15 text-cyan-700",
  reconcile: "bg-amber-500/15 text-amber-700",
  import: "bg-slate-500/15 text-slate-700",
  unmatch: "bg-amber-500/15 text-amber-700",
};

function csvEscape(v: unknown): string {
  if (v == null) return "";
  const s = typeof v === "object" ? JSON.stringify(v) : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function exportAuditCsv(rows: any[]) {
  const header = ["waktu","aktor","aksi","entity","entity_no","entity_id","alasan","changed_fields","diff"];
  const lines = [header.join(",")];
  for (const r of rows) {
    const before = (r.before ?? {}) as Record<string, unknown>;
    const after = (r.after ?? {}) as Record<string, unknown>;
    const keys = Array.from(new Set([...(r.changed_fields ?? []), ...Object.keys(before), ...Object.keys(after)]));
    const changed = keys.filter((k) => JSON.stringify(before[k]) !== JSON.stringify(after[k]));
    const diff = changed.map((k) => `${k}: ${JSON.stringify(before[k]) ?? "∅"} → ${JSON.stringify(after[k]) ?? "∅"}`).join(" | ");
    lines.push([
      new Date(r.created_at).toISOString(),
      r.actor_email ?? "system",
      r.action, r.entity, r.entity_no ?? "", r.entity_id ?? "",
      r.reason ?? "", (r.changed_fields ?? []).join(";"), diff,
    ].map(csvEscape).join(","));
  }
  const blob = new Blob(["\ufeff" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `audit-finance-${new Date().toISOString().slice(0,10)}.csv`;
  a.click(); URL.revokeObjectURL(url);
}

function AuditPage() {
  const { isAdmin } = useFinanceAccess();
  const { from, to } = useFinanceDate();
  const [q, setQ] = useState("");
  const [entity, setEntity] = useState("all");
  const [action, setAction] = useState("all");
  const [detail, setDetail] = useState<any | null>(null);
  const [revertReason, setRevertReason] = useState("");
  const [presets, setPresets] = useState<AuditPreset[]>([]);
  const [presetName, setPresetName] = useState("");
  const [presetOpen, setPresetOpen] = useState(false);
  useEffect(() => { setPresets(loadPresets()); }, []);
  const qc = useQueryClient();
  const fn = useServerFn(listFinAudit);
  const revertFn = useServerFn(revertFinAudit);
  const { data, isLoading } = useQuery({
    queryKey: ["fin-audit", from, to, q, entity, action],
    queryFn: () => fn({ data: { from, to, q: q || undefined, entity: entity === "all" ? undefined : entity, action: action === "all" ? undefined : action } }),
  });
  const revertMut = useMutation({
    mutationFn: (v: { audit_id: string; reason?: string }) => revertFn({ data: v }),
    onSuccess: (r: any) => {
      toast.success(`Dipulihkan: ${(r?.restored_fields ?? []).join(", ") || "ok"}`);
      setDetail(null); setRevertReason("");
      qc.invalidateQueries({ queryKey: ["fin-audit"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Gagal revert"),
  });
  const rows = data?.rows ?? [];

  if (!isAdmin) {
    return <div><PageHeader title="Audit Log Finance" desc="Akses ditolak — hanya admin." /></div>;
  }

  return (
    <div>
      <PageHeader title="Audit Log Finance" desc="Jejak setiap aksi finance: siapa, kapan, perubahan field, alasan void." />
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari aktor / no. / alasan…" className="pl-9" />
        </div>
        <Select value={entity} onValueChange={setEntity}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua entity</SelectItem>
            {["invoice", "payment", "expense", "journal", "bank_statement", "mdr_rule", "template_invoice", "template_voucher"].map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={action} onValueChange={setAction}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua aksi</SelectItem>
            {Object.keys(ACTION_TONE).map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm"><Bookmark className="mr-2 h-4 w-4" /> Preset ({presets.length})</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel className="text-xs">Muat preset filter</DropdownMenuLabel>
            {presets.length === 0 ? (
              <DropdownMenuItem disabled className="text-xs text-muted-foreground">Belum ada preset</DropdownMenuItem>
            ) : presets.map((p) => (
              <DropdownMenuItem key={p.name} className="flex items-center justify-between gap-2" onSelect={(e) => { e.preventDefault(); setQ(p.q); setEntity(p.entity); setAction(p.action); toast.success(`Preset "${p.name}" dimuat`); }}>
                <span className="truncate text-xs">{p.name}</span>
                <Trash2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground hover:text-destructive" onClick={(e) => { e.stopPropagation(); const next = presets.filter((x) => x.name !== p.name); setPresets(next); savePresets(next); toast.success(`Preset "${p.name}" dihapus`); }} />
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setPresetOpen(true); }}>
              <BookmarkPlus className="mr-2 h-4 w-4" /> Simpan filter saat ini
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button variant="outline" size="sm" disabled={rows.length === 0} onClick={() => exportAuditCsv(rows)}>
          <Download className="mr-2 h-4 w-4" /> Export CSV
        </Button>
      </div>

      <Dialog open={presetOpen} onOpenChange={setPresetOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Simpan preset filter</DialogTitle></DialogHeader>
          <div className="space-y-2 text-sm">
            <Input autoFocus value={presetName} onChange={(e) => setPresetName(e.target.value)} placeholder="Nama preset (mis. Void bulan ini)" />
            <div className="rounded-md border border-border bg-muted/30 p-2 text-xs text-muted-foreground">
              <div>Cari: <span className="font-mono">{q || "—"}</span></div>
              <div>Entity: <span className="font-mono">{entity}</span> · Aksi: <span className="font-mono">{action}</span></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPresetOpen(false)}>Batal</Button>
            <Button disabled={!presetName.trim()} onClick={() => {
              const name = presetName.trim();
              const next = [...presets.filter((p) => p.name !== name), { name, q, entity, action }];
              setPresets(next); savePresets(next); setPresetName(""); setPresetOpen(false);
              toast.success(`Preset "${name}" disimpan`);
            }}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Waktu</TableHead><TableHead>Aktor</TableHead><TableHead>Aksi</TableHead>
            <TableHead>Entity</TableHead><TableHead>No / ID</TableHead>
            <TableHead>Field Berubah</TableHead><TableHead>Alasan</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={7} className="py-6 text-center">Loading…</TableCell></TableRow>
              : rows.length === 0 ? <TableRow><TableCell colSpan={7} className="py-12 text-center text-sm text-muted-foreground">Belum ada audit log.</TableCell></TableRow>
              : rows.map((r: any) => (
                <TableRow key={r.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setDetail(r)}>
                  <TableCell className="font-mono text-xs">{new Date(r.created_at).toLocaleString("id-ID")}</TableCell>
                  <TableCell className="text-sm">{r.actor_email ?? "system"}</TableCell>
                  <TableCell><Badge className={`${ACTION_TONE[r.action] ?? "bg-muted text-foreground"} border-0`} variant="secondary">{r.action}</Badge></TableCell>
                  <TableCell className="text-xs">{r.entity}</TableCell>
                  <TableCell className="font-mono text-xs">{r.entity_no ?? r.entity_id ?? "—"}</TableCell>
                  <TableCell className="text-xs">{(r.changed_fields ?? []).slice(0, 5).map((f: string) => <Badge key={f} variant="outline" className="mr-1 mb-1 text-[10px]">{f}</Badge>)}</TableCell>
                  <TableCell className="max-w-xs truncate text-xs text-muted-foreground">{r.reason ?? "—"}</TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>
      <div className="mt-2 text-xs text-muted-foreground">Total {rows.length} entri (max 500). Klik baris untuk melihat diff.</div>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex flex-wrap items-center gap-2">
              <Badge className={`${ACTION_TONE[detail?.action] ?? "bg-muted"} border-0`} variant="secondary">{detail?.action}</Badge>
              <span className="text-sm">{detail?.entity}</span>
              <span className="font-mono text-xs text-muted-foreground">{detail?.entity_no ?? detail?.entity_id}</span>
            </DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2 rounded-lg border border-border bg-muted/30 p-3 text-xs">
                <div><span className="text-muted-foreground">Waktu:</span> {new Date(detail.created_at).toLocaleString("id-ID")}</div>
                <div><span className="text-muted-foreground">Aktor:</span> {detail.actor_email ?? "system"}</div>
                {detail.reason && <div className="col-span-2"><span className="text-muted-foreground">Alasan:</span> {detail.reason}</div>}
              </div>
              <div>
                <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Perubahan Field</div>
                <div className="overflow-hidden rounded-lg border border-border">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="p-2 text-left">Field</th>
                        <th className="p-2 text-left">Sebelum</th>
                        <th className="p-2 text-left">Sesudah</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const before = (detail.before ?? {}) as Record<string, unknown>;
                        const after = (detail.after ?? {}) as Record<string, unknown>;
                        const keys = Array.from(new Set([...(detail.changed_fields ?? []), ...Object.keys(before), ...Object.keys(after)]));
                        const changed = keys.filter((k) => JSON.stringify(before[k]) !== JSON.stringify(after[k]));
                        if (changed.length === 0) return <tr><td colSpan={3} className="p-3 text-center text-muted-foreground">Tidak ada diff terekam.</td></tr>;
                        const fmt = (v: unknown) => v == null ? "—" : typeof v === "object" ? JSON.stringify(v) : String(v);
                        return changed.map((k) => (
                          <tr key={k} className="border-t border-border align-top">
                            <td className="p-2 font-mono">{k}</td>
                            <td className="p-2 text-rose-600 line-through decoration-rose-400/60">{fmt(before[k])}</td>
                            <td className="p-2 text-emerald-700">{fmt(after[k])}</td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
          {detail?.action === "edit" && detail?.entity_id && (
            <DialogFooter className="mt-3 flex-col items-stretch gap-2 sm:flex-col">
              <Textarea
                value={revertReason}
                onChange={(e) => setRevertReason(e.target.value)}
                placeholder="Alasan revert (opsional)"
                className="min-h-[60px] text-xs"
              />
              <Button
                variant="destructive"
                disabled={revertMut.isPending}
                onClick={() => revertMut.mutate({ audit_id: detail.id, reason: revertReason || undefined })}
              >
                <Undo2 className="mr-2 h-4 w-4" />
                {revertMut.isPending ? "Memulihkan…" : "Revert ke nilai sebelumnya"}
              </Button>
              <p className="text-[10px] text-muted-foreground">Hanya field aman (whitelist) yang dipulihkan. Aksi ini juga tercatat di audit log.</p>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
