import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/lib/page-head";
import { useEffect, useState, useRef } from "react";
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
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Search, Undo2, Download, BookmarkPlus, Bookmark, Trash2, Columns3, Rows3 } from "lucide-react";
import { toast } from "sonner";
import { useFinanceAccess } from "@/lib/finance-access";

type AuditPreset = { name: string; q: string; entity: string; action: string };
const PRESET_KEY = "fin-audit-presets-v1";
function loadPresets(): AuditPreset[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(PRESET_KEY) || "[]"); } catch { return []; }
}
function savePresets(p: AuditPreset[]) { localStorage.setItem(PRESET_KEY, JSON.stringify(p)); }

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}d lalu`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}j lalu`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}h lalu`;
  return new Date(iso).toLocaleDateString("id-ID");
}

const COLS = [
  { key: "waktu", label: "Waktu" },
  { key: "aktor", label: "Aktor" },
  { key: "aksi", label: "Aksi" },
  { key: "entity", label: "Entity" },
  { key: "no", label: "No / ID" },
  { key: "fields", label: "Field Berubah" },
  { key: "alasan", label: "Alasan" },
] as const;
type ColKey = typeof COLS[number]["key"];
const COL_KEY = "fin-audit-cols-v1";
function loadCols(): Record<ColKey, boolean> {
  const def = Object.fromEntries(COLS.map((c) => [c.key, true])) as Record<ColKey, boolean>;
  if (typeof window === "undefined") return def;
  try { return { ...def, ...JSON.parse(localStorage.getItem(COL_KEY) || "{}") }; } catch { return def; }
}

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
  const { from, to, setRange } = useFinanceDate();
  const initialParams = typeof window !== "undefined" ? new URL(window.location.href).searchParams : null;
  const [q, setQ] = useState(() => initialParams?.get("q") ?? "");
  const [entity, setEntity] = useState(() => initialParams?.get("entity") ?? "all");
  const [action, setAction] = useState(() => initialParams?.get("action") ?? "all");
  useEffect(() => {
    if (typeof window === "undefined") return;
    const u = new URL(window.location.href);
    if (q) u.searchParams.set("q", q); else u.searchParams.delete("q");
    if (entity !== "all") u.searchParams.set("entity", entity); else u.searchParams.delete("entity");
    if (action !== "all") u.searchParams.set("action", action); else u.searchParams.delete("action");
    if (onlyStar) u.searchParams.set("star", "1"); else u.searchParams.delete("star");
    window.history.replaceState({}, "", u);
  }, [q, entity, action, onlyStar]);
  const [detail, _setDetail] = useState<any | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [showTop, setShowTop] = useState(false);
  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 400);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  const setDetail = (r: any | null) => {
    _setDetail(r);
    if (typeof window !== "undefined") {
      const u = new URL(window.location.href);
      if (r?.id) u.searchParams.set("id", r.id); else u.searchParams.delete("id");
      window.history.replaceState({}, "", u);
    }
  };
  const [revertReason, setRevertReason] = useState("");
  const [presets, setPresets] = useState<AuditPreset[]>([]);
  const [presetName, setPresetName] = useState("");
  const [presetOpen, setPresetOpen] = useState(false);
  const [refreshMs, setRefreshMs] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    return Number(localStorage.getItem("fin-audit-refresh") || 0);
  });
  const [cols, setCols] = useState<Record<ColKey, boolean>>(() => loadCols());
  const [density, setDensity] = useState<"compact" | "comfy">(() => {
    if (typeof window === "undefined") return "comfy";
    return (localStorage.getItem("fin-audit-density") as "compact" | "comfy") || "comfy";
  });
  useEffect(() => { setPresets(loadPresets()); }, []);
  useEffect(() => { if (typeof window !== "undefined") localStorage.setItem("fin-audit-refresh", String(refreshMs)); }, [refreshMs]);
  useEffect(() => { if (typeof window !== "undefined") localStorage.setItem(COL_KEY, JSON.stringify(cols)); }, [cols]);
  useEffect(() => { if (typeof window !== "undefined") localStorage.setItem("fin-audit-density", density); }, [density]);
  const [timeFmt, setTimeFmt] = useState<"relative" | "absolute">(() => {
    if (typeof window === "undefined") return "relative";
    return (localStorage.getItem("fin-audit-timefmt") as "relative" | "absolute") || "relative";
  });
  useEffect(() => { if (typeof window !== "undefined") localStorage.setItem("fin-audit-timefmt", timeFmt); }, [timeFmt]);
  const [starred, setStarred] = useState<Record<string, true>>(() => {
    if (typeof window === "undefined") return {};
    try { return JSON.parse(localStorage.getItem("fin-audit-starred") || "{}"); } catch { return {}; }
  });
  const [onlyStar, setOnlyStar] = useState(() => initialParams?.get("star") === "1");
  const toggleStar = (id: string) => setStarred((s) => {
    const n = { ...s };
    if (n[id]) delete n[id]; else n[id] = true;
    if (typeof window !== "undefined") localStorage.setItem("fin-audit-starred", JSON.stringify(n));
    return n;
  });
  const qc = useQueryClient();
  const fn = useServerFn(listFinAudit);
  const revertFn = useServerFn(revertFinAudit);
  const { data, isLoading, isFetching, dataUpdatedAt } = useQuery({
    queryKey: ["fin-audit", from, to, q, entity, action],
    queryFn: () => fn({ data: { from, to, q: q || undefined, entity: entity === "all" ? undefined : entity, action: action === "all" ? undefined : action } }),
    refetchInterval: refreshMs > 0 ? refreshMs : false,
    refetchIntervalInBackground: false,
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
  const rows = (data?.rows ?? []).filter((r: any) => !onlyStar || starred[r.id]);

  useEffect(() => {
    if (typeof window === "undefined" || !rows.length || detail) return;
    const id = new URL(window.location.href).searchParams.get("id");
    if (!id) return;
    const found = (rows as any[]).find((r) => r.id === id);
    if (found) _setDetail(found);
  }, [rows, detail]);

  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const typing = tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable;
      if (e.key === "/" && !typing) { e.preventDefault(); searchRef.current?.focus(); }
      else if (e.key === "Escape" && document.activeElement === searchRef.current) {
        setQ(""); setEntity("all"); setAction("all"); searchRef.current?.blur();
      }
      else if (!typing && (e.key === "j" || e.key === "k") && (rows as any[]).length) {
        e.preventDefault();
        const list = rows as any[];
        const idx = detail ? list.findIndex((r) => r.id === detail.id) : -1;
        const next = e.key === "j"
          ? Math.min(list.length - 1, idx + 1)
          : Math.max(0, idx <= 0 ? 0 : idx - 1);
        if (list[next]) setDetail(list[next]);
      }
      else if (!typing && e.key === "Escape" && detail) { setDetail(null); }
      else if (!typing && (e.key === "?" || (e.shiftKey && e.key === "/"))) { e.preventDefault(); setHelpOpen((v) => !v); }
      else if (!typing && e.key === "r" && (q || entity !== "all" || action !== "all" || onlyStar)) {
        e.preventDefault();
        setQ(""); setEntity("all"); setAction("all"); setOnlyStar(false);
        toast.success("Filter direset (r)");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [rows, detail, q, entity, action, onlyStar]);

  if (!isAdmin) {
    return <div><PageHeader title="Audit Log Finance" desc="Akses ditolak — hanya admin." /></div>;
  }

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="icon"
        className={`fixed bottom-6 right-6 z-40 h-10 w-10 rounded-full shadow-md transition-opacity ${showTop ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        title="Kembali ke atas"
        aria-label="Kembali ke atas"
      >
        ↑
      </Button>
      <PageHeader title="Audit Log Finance" desc="Jejak setiap aksi finance: siapa, kapan, perubahan field, alasan void." />
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input ref={searchRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari aktor / no. / alasan…  ( / fokus, Esc reset)" className="pl-9 pr-10" />
          <kbd className="absolute right-2 top-1/2 -translate-y-1/2 hidden sm:inline-flex h-5 items-center rounded border bg-muted px-1.5 text-[10px] font-mono text-muted-foreground">/</kbd>
        </div>
        <Button variant="outline" size="sm" onClick={() => setHelpOpen(true)} title="Pintasan keyboard (?)">?</Button>
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
        <Select value={String(refreshMs)} onValueChange={(v) => setRefreshMs(Number(v))}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Auto-refresh" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="0">Auto-refresh: Off</SelectItem>
            <SelectItem value="10000">Setiap 10 detik</SelectItem>
            <SelectItem value="30000">Setiap 30 detik</SelectItem>
            <SelectItem value="60000">Setiap 60 detik</SelectItem>
          </SelectContent>
        </Select>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm"><Columns3 className="mr-2 h-4 w-4" /> Kolom</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel className="text-xs">Tampilkan kolom</DropdownMenuLabel>
            {COLS.map((c) => (
              <DropdownMenuCheckboxItem key={c.key} checked={cols[c.key]} onCheckedChange={(v) => setCols((s) => ({ ...s, [c.key]: !!v }))} onSelect={(e) => e.preventDefault()}>
                {c.label}
              </DropdownMenuCheckboxItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setCols(Object.fromEntries(COLS.map((c) => [c.key, true])) as Record<ColKey, boolean>); }}>
              Tampilkan semua
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button variant="outline" size="sm" onClick={() => setDensity((d) => d === "compact" ? "comfy" : "compact")} title="Toggle kerapatan baris">
          <Rows3 className="mr-2 h-4 w-4" /> {density === "compact" ? "Kompak" : "Nyaman"}
        </Button>
        <Button variant="outline" size="sm" onClick={() => setTimeFmt((t) => t === "relative" ? "absolute" : "relative")} title="Toggle format waktu">
          🕘 {timeFmt === "relative" ? "Relatif" : "Absolut"}
        </Button>
        <Button
          variant={onlyStar ? "default" : "outline"}
          size="sm"
          onClick={() => setOnlyStar((v) => !v)}
          title="Tampilkan hanya entri bertanda"
        >
          ★ Bertanda ({Object.keys(starred).length})
        </Button>
        <Button variant="outline" size="sm" disabled={rows.length === 0} onClick={() => exportAuditCsv(rows)}>
          <Download className="mr-2 h-4 w-4" /> Export CSV
        </Button>
        <Button variant="outline" size="sm" disabled={rows.length === 0} onClick={() => {
          const blob = new Blob([JSON.stringify(rows, null, 2)], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url; a.download = `audit-finance-${new Date().toISOString().slice(0,10)}.json`;
          a.click(); URL.revokeObjectURL(url);
          toast.success(`${rows.length} entri diekspor ke JSON`);
        }}>
          <Download className="mr-2 h-4 w-4" /> Export JSON
        </Button>
        <Button variant="outline" size="sm" onClick={() => {
          const u = new URL(window.location.href);
          u.searchParams.delete("q"); u.searchParams.delete("entity"); u.searchParams.delete("action");
          if (q) u.searchParams.set("q", q);
          if (entity !== "all") u.searchParams.set("entity", entity);
          if (action !== "all") u.searchParams.set("action", action);
          navigator.clipboard.writeText(u.toString());
          toast.success("Tautan disalin dengan filter aktif");
        }} title="Salin URL dengan filter aktif">
          🔗 Salin tautan
        </Button>
      </div>
      <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
        <Button
          variant="ghost"
          size="sm"
          className="h-6 gap-1 px-2 text-[11px]"
          onClick={() => qc.invalidateQueries({ queryKey: ["fin-audit"] })}
          disabled={isFetching}
          title="Segarkan sekarang"
        >
          <span className={`inline-block h-3 w-3 ${isFetching ? "animate-spin" : ""}`}>⟳</span>
          {isFetching ? "Memuat…" : "Segarkan"}
        </Button>
        {refreshMs > 0 && <span className="inline-flex items-center gap-1"><span className={`inline-block h-1.5 w-1.5 rounded-full ${isFetching ? "bg-emerald-500 animate-pulse" : "bg-emerald-500/50"}`} /> Live setiap {refreshMs / 1000}s</span>}
        {dataUpdatedAt > 0 && <span>· Diperbarui {new Date(dataUpdatedAt).toLocaleTimeString("id-ID")}</span>}
        {(q || entity !== "all" || action !== "all") && (
          <div className="flex flex-wrap items-center gap-1.5 ml-auto">
            {q && <Badge variant="secondary" className="gap-1 pr-1">Cari: {q}<button type="button" onClick={() => setQ("")} className="ml-0.5 rounded hover:bg-muted-foreground/20 px-1">×</button></Badge>}
            {entity !== "all" && <Badge variant="secondary" className="gap-1 pr-1">Entity: {entity}<button type="button" onClick={() => setEntity("all")} className="ml-0.5 rounded hover:bg-muted-foreground/20 px-1">×</button></Badge>}
            {action !== "all" && <Badge variant="secondary" className="gap-1 pr-1">Aksi: {action}<button type="button" onClick={() => setAction("all")} className="ml-0.5 rounded hover:bg-muted-foreground/20 px-1">×</button></Badge>}
            <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px]" onClick={() => { setQ(""); setEntity("all"); setAction("all"); }}>Reset semua</Button>
          </div>
        )}
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
      <div className={`overflow-hidden rounded-xl border border-border bg-card ${density === "compact" ? "[&_td]:py-1.5 [&_th]:py-2 text-[12px]" : ""}`}>
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-background shadow-[0_1px_0_0_hsl(var(--border))]"><TableRow>
            {cols.waktu && <TableHead>Waktu</TableHead>}
            {cols.aktor && <TableHead>Aktor</TableHead>}
            {cols.aksi && <TableHead>Aksi</TableHead>}
            {cols.entity && <TableHead>Entity</TableHead>}
            {cols.no && <TableHead>No / ID</TableHead>}
            {cols.fields && <TableHead>Field Berubah</TableHead>}
            {cols.alasan && <TableHead>Alasan</TableHead>}
          </TableRow></TableHeader>
          <TableBody>
            {(() => {
              const visibleCount = COLS.filter((c) => cols[c.key]).length || 1;
              if (isLoading) return <TableRow><TableCell colSpan={visibleCount} className="py-6 text-center">Loading…</TableCell></TableRow>;
              if (rows.length === 0) return <TableRow><TableCell colSpan={visibleCount} className="py-12 text-center text-sm text-muted-foreground">Belum ada audit log.</TableCell></TableRow>;
              let lastDay = "";
              return (rows as any[]).flatMap((r: any) => {
                const day = new Date(r.created_at).toLocaleDateString("id-ID", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
                const nodes: any[] = [];
                if (day !== lastDay) {
                  lastDay = day;
                  nodes.push(
                    <TableRow key={`day-${day}`} className="hover:bg-transparent">
                      <TableCell
                        colSpan={visibleCount}
                        className="bg-muted/40 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground cursor-pointer hover:bg-primary/10 hover:text-primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          const d = new Date(r.created_at);
                          const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
                          setRange({ from: iso, to: iso, preset: "custom" });
                          toast.success(`Filter tanggal: ${day}`);
                        }}
                        title="Klik untuk filter tanggal ini saja"
                      >{day}</TableCell>
                    </TableRow>
                  );
                }
                nodes.push(
                <TableRow
                  key={r.id}
                  ref={(el) => {
                    if (el && detail?.id === r.id) el.scrollIntoView({ block: "center", behavior: "smooth" });
                  }}
                  className={`cursor-pointer hover:bg-muted/50 ${detail?.id === r.id ? "bg-primary/10 ring-1 ring-primary/40" : ""}`}
                  onClick={() => setDetail(r)}
                >

                  {cols.waktu && <TableCell className="font-mono text-xs whitespace-nowrap" title={timeFmt === "relative" ? new Date(r.created_at).toLocaleString("id-ID") : relativeTime(r.created_at)}>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); toggleStar(r.id); }}
                      className={`mr-1 rounded px-0.5 ${starred[r.id] ? "text-amber-500" : "text-muted-foreground/40 hover:text-amber-500"}`}
                      title={starred[r.id] ? "Hapus tanda" : "Tandai entri"}
                    >{starred[r.id] ? "★" : "☆"}</button>
                    {timeFmt === "relative" ? relativeTime(r.created_at) : new Date(r.created_at).toLocaleString("id-ID")}
                  </TableCell>}
                  {cols.aktor && (
                    <TableCell className="text-sm">
                      <button
                        type="button"
                        className="rounded px-1 -mx-1 hover:bg-primary/10 hover:text-primary"
                        onClick={(e) => { e.stopPropagation(); setQ(r.actor_email ?? "system"); toast.success(`Filter aktor: ${r.actor_email ?? "system"}`); }}
                        title="Filter berdasarkan aktor ini"
                      >{r.actor_email ?? "system"}</button>
                    </TableCell>
                  )}
                  {cols.aksi && (
                    <TableCell>
                      <button type="button" onClick={(e) => { e.stopPropagation(); setAction(r.action); toast.success(`Filter aksi: ${r.action}`); }} title="Filter aksi ini">
                        <Badge className={`${ACTION_TONE[r.action] ?? "bg-muted text-foreground"} border-0 cursor-pointer hover:ring-2 hover:ring-primary/40`} variant="secondary">{r.action}</Badge>
                      </button>
                    </TableCell>
                  )}
                  {cols.entity && (
                    <TableCell className="text-xs">
                      <button
                        type="button"
                        className="rounded px-1 -mx-1 font-medium hover:bg-primary/10 hover:text-primary"
                        onClick={(e) => { e.stopPropagation(); setEntity(r.entity); toast.success(`Filter entity: ${r.entity}`); }}
                        title="Filter entity ini"
                      >{r.entity}</button>
                    </TableCell>
                  )}
                  {cols.no && (
                    <TableCell className="font-mono text-xs">
                      {(r.entity_no ?? r.entity_id) ? (
                        <button
                          type="button"
                          className="rounded px-1 -mx-1 hover:bg-primary/10 hover:text-primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            const v = String(r.entity_no ?? r.entity_id);
                            navigator.clipboard.writeText(v).then(() => toast.success(`Disalin: ${v}`));
                          }}
                          title="Klik untuk salin"
                        >{r.entity_no ?? r.entity_id}</button>
                      ) : "—"}
                    </TableCell>
                  )}
                  {cols.fields && <TableCell className="text-xs">{(r.changed_fields ?? []).slice(0, 5).map((f: string) => <Badge key={f} variant="outline" className="mr-1 mb-1 text-[10px]">{f}</Badge>)}</TableCell>}
                  {cols.alasan && <TableCell className="max-w-xs truncate text-xs text-muted-foreground">{r.reason ?? "—"}</TableCell>}
                </TableRow>
                );
                return nodes;
              });
            })()}
          </TableBody>
        </Table>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span>Total {rows.length} entri (max 500).</span>
        {rows.length > 0 && (() => {
          const counts: Record<string, number> = {};
          for (const r of rows as any[]) counts[r.action] = (counts[r.action] ?? 0) + 1;
          return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([a, n]) => (
            <button
              key={a}
              type="button"
              onClick={() => { setAction(a); toast.success(`Filter aksi: ${a}`); }}
              title={`Filter aksi ${a}`}
            >
              <Badge className={`${ACTION_TONE[a] ?? "bg-muted text-foreground"} border-0 cursor-pointer hover:ring-2 hover:ring-primary/40`} variant="secondary">
                {a}: {n}
              </Badge>
            </button>
          ));
        })()}
        {rows.length > 0 && (() => {
          const counts: Record<string, number> = {};
          for (const r of rows as any[]) counts[r.entity] = (counts[r.entity] ?? 0) + 1;
          return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([e, n]) => (
            <button key={e} type="button" onClick={() => { setEntity(e); toast.success(`Filter entity: ${e}`); }} title={`Filter entity ${e}`}>
              <Badge variant="outline" className="cursor-pointer hover:ring-2 hover:ring-primary/40">{e}: {n}</Badge>
            </button>
          ));
        })()}
        {(q || entity !== "all" || action !== "all" || onlyStar) && (
          <button
            type="button"
            onClick={() => { setQ(""); setEntity("all"); setAction("all"); setOnlyStar(false); toast.success("Filter direset"); }}
            title="Bersihkan semua filter aktif"
          >
            <Badge variant="destructive" className="cursor-pointer hover:ring-2 hover:ring-destructive/40">✕ Reset semua filter</Badge>
          </button>
        )}
        <span className="ml-auto">Klik baris untuk melihat diff.</span>
      </div>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex flex-wrap items-center gap-2">
              <Badge className={`${ACTION_TONE[detail?.action] ?? "bg-muted"} border-0`} variant="secondary">{detail?.action}</Badge>
              <span className="text-sm">{detail?.entity}</span>
              <span className="font-mono text-xs text-muted-foreground">{detail?.entity_no ?? detail?.entity_id}</span>
              {(() => {
                const list = rows as any[];
                const idx = detail ? list.findIndex((r) => r.id === detail.id) : -1;
                return (
                  <span className="ml-2 flex items-center gap-1">
                    <Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={idx <= 0} onClick={() => setDetail(list[idx - 1])} title="Sebelumnya (k)">‹</Button>
                    <span className="text-[11px] text-muted-foreground tabular-nums">{idx + 1}/{list.length}</span>
                    <Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={idx < 0 || idx >= list.length - 1} onClick={() => setDetail(list[idx + 1])} title="Berikutnya (j)">›</Button>
                  </span>
                );
              })()}
              <Button
                variant="outline"
                size="sm"
                className="ml-auto h-7 px-2 text-xs"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(JSON.stringify(detail, null, 2));
                    toast.success("JSON disalin");
                  } catch { toast.error("Gagal menyalin"); }
                }}
              >Salin JSON</Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => {
                  const u = new URL(window.location.href);
                  u.searchParams.set("id", detail.id);
                  navigator.clipboard.writeText(u.toString());
                  toast.success("Tautan entri disalin");
                }}
              >🔗 Salin tautan</Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => {
                  setEntity(detail.entity);
                  setAction(detail.action);
                  setDetail(null);
                  toast.success(`Difilter: ${detail.entity} · ${detail.action}`);
                }}
                title="Filter entri serupa (entity + aksi)"
              >🔎 Serupa</Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs"
                disabled={!detail?.actor_email}
                onClick={() => {
                  if (!detail?.actor_email) return;
                  setQ(detail.actor_email);
                  setDetail(null);
                  toast.success(`Filter aktor: ${detail.actor_email}`);
                }}
                title="Filter semua entri dari aktor ini"
              >👤 Aktor ini</Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => {
                  const d = new Date(detail.created_at);
                  const iso = (dt: Date) => dt.toISOString().slice(0, 10);
                  const a = new Date(d); a.setDate(a.getDate() - 1);
                  const b = new Date(d); b.setDate(b.getDate() + 1);
                  setRange({ from: iso(a), to: iso(b), preset: "custom" });
                  setDetail(null);
                  toast.success(`Rentang ${iso(a)} → ${iso(b)}`);
                }}
                title="Set rentang tanggal ±1 hari dari entri ini"
              >📅 ±1 hari</Button>
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
      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Pintasan keyboard</DialogTitle></DialogHeader>
          <div className="space-y-1.5 text-sm">
            {[
              ["/", "Fokus pencarian"],
              ["Esc", "Reset filter / tutup dialog"],
              ["j", "Detail baris berikutnya"],
              ["k", "Detail baris sebelumnya"],
              ["r", "Reset semua filter aktif"],
              ["?", "Buka bantuan ini"],
            ].map(([k, d]) => (
              <div key={k} className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">{d}</span>
                <kbd className="rounded border bg-muted px-2 py-0.5 font-mono text-xs">{k}</kbd>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
