import { useState } from "react";
import { pageHead } from "@/lib/page-head";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { PageHeader } from "@/components/app-shell";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, AlertTriangle, RefreshCw, FileSpreadsheet, Download, ExternalLink, Bell } from "lucide-react";
import { useFinanceDate, type DatePreset } from "@/context/finance-date";
import { reconJurnal, reconUnposted, postingAudit, slaConfig } from "@/lib/finance-recon-jurnal.functions";
import { FinanceDrillDialog } from "@/components/finance-drill-dialog";
import { exportCsv, exportPdf, exportReportPdf, type Column } from "@/lib/exporter";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/finance/konsistensi-jurnal")({
  
  head: () => pageHead({ title: "Konsistensi Jurnal — Finance", description: "Konsistensi Jurnal pada modul keuangan klinik.", path: "/finance/konsistensi-jurnal" }),
  component: Page,
});

const fmt = (n: number) => "Rp " + (Number(n) || 0).toLocaleString("id-ID");

const sumberLabel: Record<string, string> = {
  pembayaran: "Pembayaran Invoice",
  expense: "Pengeluaran / Voucher",
  bukti_setor: "Setoran Bank",
  invoice: "Invoice / Piutang",
};

// Map sumber → finance route slug for "buka transaksi"
const sumberRoute: Record<string, string> = {
  pembayaran: "/finance/piutang",
  expense: "/finance/pengeluaran",
  bukti_setor: "/finance/bukti-setor",
  invoice: "/finance/piutang",
};

// SLA aging threshold (hours) — configurable per environment via FINANCE_UNPOSTED_SLA_HOURS.
const DEFAULT_SLA_HOURS = 24;

const PERIOD_PRESETS: { key: Exclude<DatePreset, "custom">; label: string }[] = [
  { key: "today", label: "Harian" },
  { key: "7d", label: "Mingguan" },
  { key: "mtd", label: "Bulan ini" },
  { key: "qtd", label: "Kuartal" },
  { key: "ytd", label: "Tahun ini" },
];

function ageHours(tanggal: string): number {
  const t = new Date(tanggal + "T00:00:00").getTime();
  return Math.max(0, Math.floor((Date.now() - t) / 36e5));
}

function Page() {
  const { from, to, preset, setPreset, label } = useFinanceDate();
  const reconFn = useServerFn(reconJurnal);
  const unpostedFn = useServerFn(reconUnposted);
  const auditFn = useServerFn(postingAudit);
  const slaFn = useServerFn(slaConfig);

  const sla = useQuery({ queryKey: ["sla-config"], queryFn: () => slaFn(), staleTime: 5 * 60_000 });
  const UNPOSTED_SLA_HOURS = sla.data?.slaHours ?? DEFAULT_SLA_HOURS;
  const slaSource = sla.data?.source ?? "default";

  const recon = useQuery({ queryKey: ["recon-jurnal", from, to], queryFn: () => reconFn({ data: { from, to } }) });
  const unposted = useQuery({ queryKey: ["recon-unposted", from, to], queryFn: () => unpostedFn({ data: { from, to } }) });
  const audit = useQuery({ queryKey: ["posting-audit", from, to], queryFn: () => auditFn({ data: { from, to, limit: 500 } }) });

  // Drill state
  const [drillEntry, setDrillEntry] = useState<{ id: string; title: string } | null>(null);
  const [sumberFilter, setSumberFilter] = useState<string | null>(null);

  const rows: any[] = recon.data?.rows ?? [];
  const auditRows: any[] = audit.data?.rows ?? [];
  const unpostedRows: any[] = unposted.data?.rows ?? [];

  const totalSelisih = rows.reduce((a, r) => a + Math.abs(Number(r.selisih) || 0), 0);
  const totalUnposted = rows.reduce((a, r) => a + Number(r.unposted_count || 0), 0);
  const overdueUnposted = unpostedRows.filter((r) => ageHours(r.tanggal) >= UNPOSTED_SLA_HOURS);
  const allConsistent = totalSelisih === 0 && totalUnposted === 0 && rows.length > 0;

  const filteredAudit = sumberFilter ? auditRows.filter((r) => r.sumber === sumberFilter) : auditRows;
  const filteredUnposted = sumberFilter ? unpostedRows.filter((r) => r.sumber === sumberFilter) : unpostedRows;

  // ============ EXPORT ============
  const reconCols: Column<any>[] = [
    { key: "sumber", header: "Sumber", format: (r) => sumberLabel[r.sumber] ?? r.sumber },
    { key: "live_count", header: "Live (#)" },
    { key: "live_total", header: "Live Total", format: (r) => fmt(r.live_total) },
    { key: "posted_count", header: "Posted (#)" },
    { key: "posted_total", header: "Jurnal Total", format: (r) => fmt(r.posted_total) },
    { key: "ledger_total", header: "Buku Besar", format: (r) => fmt(r.ledger_total) },
    { key: "selisih", header: "Selisih", format: (r) => fmt(r.selisih) },
    { key: "unposted_count", header: "Unposted (#)" },
  ];
  const auditCols: Column<any>[] = [
    { key: "no_jurnal", header: "No. Jurnal" },
    { key: "tanggal", header: "Tanggal", format: (r) => r.tanggal ? new Date(r.tanggal).toLocaleDateString("id-ID") : "" },
    { key: "sumber", header: "Sumber" },
    { key: "ref_no", header: "Referensi" },
    { key: "posted_by", header: "Dipost oleh" },
    { key: "posted_at", header: "Timestamp", format: (r) => r.posted_at ? new Date(r.posted_at).toLocaleString("id-ID") : "" },
    { key: "total", header: "Total", format: (r) => fmt(r.total) },
    { key: "journal_status", header: "Status" },
  ];

  const base = `konsistensi-jurnal-${from}_${to}`;
  const handleCsvRecon = () => {
    if (!rows.length) return toast.info("Tidak ada data.");
    exportCsv(`${base}-summary.csv`, reconCols, rows, { from, to });
    toast.success("CSV ringkasan diunduh");
  };
  const handleCsvAudit = () => {
    if (!auditRows.length) return toast.info("Tidak ada audit trail.");
    exportCsv(`${base}-audit.csv`, auditCols, auditRows, { from, to });
    toast.success("CSV audit trail diunduh");
  };
  const handlePdfReport = () => {
    if (!rows.length) return toast.info("Tidak ada data.");
    exportReportPdf({
      filename: `${base}-report.pdf`,
      title: "Laporan Konsistensi Jurnal & Audit Trail",
      subtitle: "Rekonsiliasi transaksi live vs jurnal & buku besar",
      range: { from, to },
      summary: [
        { label: "Status", value: allConsistent ? "Konsisten" : "Perlu Diperiksa" },
        { label: "Total Selisih", value: fmt(totalSelisih) },
        { label: "Transaksi Unposted", value: String(totalUnposted) },
        { label: "Overdue (>24 jam)", value: String(overdueUnposted.length) },
      ],
      sections: [
        {
          title: "Ringkasan per Sumber",
          columns: [
            { key: "sumber", header: "Sumber" },
            { key: "live", header: "Live", align: "right" },
            { key: "ledger", header: "Buku Besar", align: "right" },
            { key: "selisih", header: "Selisih", align: "right" },
            { key: "unposted", header: "Unposted", align: "right" },
          ],
          rows: rows.map((r) => ({
            sumber: sumberLabel[r.sumber] ?? r.sumber,
            live: fmt(r.live_total),
            ledger: fmt(r.ledger_total),
            selisih: fmt(r.selisih),
            unposted: r.unposted_count,
          })),
        },
        ...(unpostedRows.length ? [{
          title: `Transaksi Unposted (${unpostedRows.length})`,
          columns: [
            { key: "tanggal", header: "Tanggal" },
            { key: "sumber", header: "Sumber" },
            { key: "ref", header: "Ref" },
            { key: "ket", header: "Keterangan" },
            { key: "amount", header: "Jumlah", align: "right" as const },
          ],
          rows: unpostedRows.map((r) => ({
            tanggal: r.tanggal,
            sumber: sumberLabel[r.sumber] ?? r.sumber,
            ref: r.ref_no,
            ket: r.keterangan,
            amount: fmt(r.amount),
          })),
        }] : []),
        {
          title: `Audit Trail Posting (${auditRows.length})`,
          columns: [
            { key: "no_jurnal", header: "No. Jurnal" },
            { key: "tanggal", header: "Tgl" },
            { key: "sumber", header: "Sumber" },
            { key: "ref", header: "Ref" },
            { key: "by", header: "Dipost oleh" },
            { key: "total", header: "Total", align: "right" as const },
          ],
          rows: auditRows.slice(0, 200).map((r) => ({
            no_jurnal: r.no_jurnal,
            tanggal: r.tanggal,
            sumber: r.sumber,
            ref: r.ref_no ?? "-",
            by: r.posted_by,
            total: fmt(r.total),
          })),
        },
      ],
    });
    toast.success("PDF laporan diunduh");
  };
  const handlePdfAudit = () => {
    if (!auditRows.length) return toast.info("Tidak ada audit trail.");
    exportPdf(`${base}-audit.pdf`, `Audit Trail Posting Jurnal • ${label}`, auditCols, auditRows, { from, to });
    toast.success("PDF audit trail diunduh");
  };

  return (
    <div>
      <PageHeader
        title="Konsistensi Jurnal"
        desc="Bandingkan total transaksi live (pembayaran, pengeluaran, setoran, invoice) dengan ringkasan jurnal & buku besar. Setiap selisih atau transaksi unposted ditampilkan untuk ditindaklanjuti."
      />

      {/* Toolbar: period filter + actions */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">Periode:</span>
          {PERIOD_PRESETS.map((p) => (
            <Button
              key={p.key}
              size="sm"
              variant={preset === p.key ? "default" : "outline"}
              className="h-8"
              onClick={() => setPreset(p.key)}
            >
              {p.label}
            </Button>
          ))}
          <span className="ml-2 text-xs text-muted-foreground">{from} → {to}</span>
          <Badge variant="outline" className="ml-1 gap-1 text-[10px]" title={slaSource === "env" ? "Dari FINANCE_UNPOSTED_SLA_HOURS" : "Default (set FINANCE_UNPOSTED_SLA_HOURS untuk override)"}>
            <Bell className="h-3 w-3" /> SLA {UNPOSTED_SLA_HOURS}j · {slaSource}
          </Badge>
        </div>
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="sm" className="h-8 gap-1" onClick={handleCsvRecon}>
            <FileSpreadsheet className="h-3.5 w-3.5" /> CSV Ringkasan
          </Button>
          <Button variant="outline" size="sm" className="h-8 gap-1" onClick={handleCsvAudit}>
            <FileSpreadsheet className="h-3.5 w-3.5" /> CSV Audit
          </Button>
          <Button variant="outline" size="sm" className="h-8 gap-1" onClick={handlePdfAudit}>
            <Download className="h-3.5 w-3.5" /> PDF Audit
          </Button>
          <Button size="sm" className="h-8 gap-1" onClick={handlePdfReport}>
            <Download className="h-3.5 w-3.5" /> PDF Laporan
          </Button>
          <Button variant="ghost" size="sm" onClick={() => { recon.refetch(); unposted.refetch(); audit.refetch(); }} className="h-8 gap-1">
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* SLA alert */}
      {overdueUnposted.length > 0 && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3">
          <Bell className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div className="flex-1 text-sm">
            <div className="font-semibold text-amber-700">
              {overdueUnposted.length} transaksi unposted melewati SLA {UNPOSTED_SLA_HOURS} jam
            </div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              Periksa & posting manual via halaman terkait, atau jalankan ulang trigger auto-journal.
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {Object.entries(
                overdueUnposted.reduce<Record<string, number>>((m, r) => { m[r.sumber] = (m[r.sumber] || 0) + 1; return m; }, {})
              ).map(([s, n]) => (
                <Link key={s} to={sumberRoute[s] ?? "/finance"} className="inline-flex items-center gap-1 rounded-md border border-amber-600/40 bg-background px-2 py-1 text-xs hover:bg-amber-500/10">
                  <ExternalLink className="h-3 w-3" />
                  {sumberLabel[s] ?? s} ({n})
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* KPI cards */}
      <div className="mb-4 grid gap-3 md:grid-cols-3">
        <div className={`rounded-xl border p-4 ${allConsistent ? "border-emerald-500/40 bg-emerald-500/10" : "border-amber-500/40 bg-amber-500/10"}`}>
          <div className="flex items-center gap-2 text-xs font-semibold">
            {allConsistent ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <AlertTriangle className="h-4 w-4 text-amber-600" />}
            Status Rekonsiliasi
          </div>
          <div className="mt-1 text-lg font-semibold">{allConsistent ? "Konsisten" : "Perlu Diperiksa"}</div>
          <div className="text-xs text-muted-foreground">{label}</div>
        </div>
        <button
          type="button"
          onClick={() => {
            const first = rows.find((r) => Math.abs(Number(r.selisih) || 0) > 0);
            if (!first) return toast.info("Tidak ada selisih.");
            setSumberFilter(first.sumber);
            toast.info(`Memfilter audit trail: ${sumberLabel[first.sumber] ?? first.sumber}`);
            setTimeout(() => document.getElementById("audit-section")?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
          }}
          className="rounded-xl border border-border bg-card p-4 text-left transition hover:border-rose-500/50 hover:bg-rose-500/5"
        >
          <div className="text-xs text-muted-foreground">Total Selisih (|live − ledger|) — klik untuk drill</div>
          <div className={`mt-1 text-lg font-semibold ${totalSelisih === 0 ? "text-emerald-600" : "text-rose-600"}`}>{fmt(totalSelisih)}</div>
        </button>
        <button
          type="button"
          onClick={() => document.getElementById("unposted-section")?.scrollIntoView({ behavior: "smooth", block: "start" })}
          className="rounded-xl border border-border bg-card p-4 text-left transition hover:border-amber-500/50 hover:bg-amber-500/5"
        >
          <div className="text-xs text-muted-foreground">Transaksi Unposted — klik untuk lihat daftar</div>
          <div className={`mt-1 text-lg font-semibold ${totalUnposted === 0 ? "text-emerald-600" : "text-amber-600"}`}>{totalUnposted}</div>
          {overdueUnposted.length > 0 && (
            <div className="mt-1 text-xs text-amber-700">{overdueUnposted.length} overdue &gt;{UNPOSTED_SLA_HOURS}j</div>
          )}
        </button>
      </div>

      <section className="mb-6">
        <h3 className="mb-2 text-sm font-semibold">Ringkasan per Sumber <span className="text-xs font-normal text-muted-foreground">— klik baris untuk filter audit trail</span></h3>
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sumber</TableHead>
                <TableHead className="text-right">Live (#)</TableHead>
                <TableHead className="text-right">Live Total</TableHead>
                <TableHead className="text-right">Posted</TableHead>
                <TableHead className="text-right">Jurnal Total</TableHead>
                <TableHead className="text-right">Buku Besar</TableHead>
                <TableHead className="text-right">Selisih</TableHead>
                <TableHead className="text-right">Unposted</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recon.isLoading ? (
                <TableRow><TableCell colSpan={9} className="py-12 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></TableCell></TableRow>
              ) : rows.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="py-12 text-center text-sm text-muted-foreground">Belum ada transaksi pada periode ini.</TableCell></TableRow>
              ) : rows.map((r) => {
                const selisih = Number(r.selisih) || 0;
                const ok = selisih === 0 && Number(r.unposted_count) === 0;
                const active = sumberFilter === r.sumber;
                return (
                  <TableRow
                    key={r.sumber}
                    className={`cursor-pointer transition ${active ? "bg-primary/10" : "hover:bg-muted/50"}`}
                    onClick={() => {
                      setSumberFilter(active ? null : r.sumber);
                      if (!active) setTimeout(() => document.getElementById("audit-section")?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
                    }}
                  >
                    <TableCell className="font-semibold">{sumberLabel[r.sumber] ?? r.sumber}</TableCell>
                    <TableCell className="text-right font-mono">{r.live_count}</TableCell>
                    <TableCell className="text-right font-mono">{fmt(r.live_total)}</TableCell>
                    <TableCell className="text-right font-mono">{r.posted_count}</TableCell>
                    <TableCell className="text-right font-mono">{fmt(r.posted_total)}</TableCell>
                    <TableCell className="text-right font-mono">{fmt(r.ledger_total)}</TableCell>
                    <TableCell className={`text-right font-mono font-semibold ${selisih === 0 ? "text-emerald-600" : "text-rose-600"}`}>{fmt(selisih)}</TableCell>
                    <TableCell className="text-right font-mono">{r.unposted_count}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={ok ? "bg-emerald-500/15 text-emerald-700" : "bg-amber-500/15 text-amber-700"}>
                        {ok ? "OK" : "Periksa"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </section>

      <section id="unposted-section" className="mb-6">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold">
            Transaksi Unposted {sumberFilter && <span className="text-xs font-normal text-muted-foreground">— filter: {sumberLabel[sumberFilter]}</span>}
          </h3>
          {sumberFilter && (
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setSumberFilter(null)}>Reset filter</Button>
          )}
        </div>
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sumber</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Umur</TableHead>
                <TableHead>Referensi</TableHead>
                <TableHead>Keterangan</TableHead>
                <TableHead className="text-right">Jumlah</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {unposted.isLoading ? (
                <TableRow><TableCell colSpan={7} className="py-8 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></TableCell></TableRow>
              ) : filteredUnposted.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="py-8 text-center text-sm text-emerald-700">✓ Semua transaksi sudah ter-posting ke jurnal.</TableCell></TableRow>
              ) : filteredUnposted.map((r: any) => {
                const age = ageHours(r.tanggal);
                const overdue = age >= UNPOSTED_SLA_HOURS;
                return (
                  <TableRow key={r.sumber + r.id}>
                    <TableCell><Badge variant="outline">{sumberLabel[r.sumber] ?? r.sumber}</Badge></TableCell>
                    <TableCell>{r.tanggal}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={overdue ? "bg-rose-500/15 text-rose-700" : "bg-muted text-muted-foreground"}>
                        {age < 24 ? `${age}j` : `${Math.floor(age / 24)}h`} {overdue && "⚠"}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{r.ref_no}</TableCell>
                    <TableCell className="text-sm">{r.keterangan}</TableCell>
                    <TableCell className="text-right font-mono">{fmt(r.amount)}</TableCell>
                    <TableCell className="text-right">
                      <Link to={sumberRoute[r.sumber] ?? "/finance"} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                        Buka <ExternalLink className="h-3 w-3" />
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </section>

      <section id="audit-section">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold">
            Audit Trail Posting Jurnal {sumberFilter && <span className="text-xs font-normal text-muted-foreground">— filter: {sumberLabel[sumberFilter]}</span>}
          </h3>
          {sumberFilter && (
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setSumberFilter(null)}>Reset filter</Button>
          )}
        </div>
        <p className="mb-2 text-xs text-muted-foreground">
          Klik baris untuk melihat detail baris buku besar (debit/kredit per akun).
        </p>
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No. Jurnal</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Sumber</TableHead>
                <TableHead>Referensi</TableHead>
                <TableHead>Dipost oleh</TableHead>
                <TableHead>Timestamp</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {audit.isLoading ? (
                <TableRow><TableCell colSpan={8} className="py-8 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></TableCell></TableRow>
              ) : filteredAudit.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">Belum ada entri jurnal pada periode ini.</TableCell></TableRow>
              ) : filteredAudit.map((r: any) => (
                <TableRow
                  key={r.journal_id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setDrillEntry({ id: r.journal_id, title: `Detail Jurnal ${r.no_jurnal} • ${sumberLabel[r.sumber] ?? r.sumber}` })}
                >
                  <TableCell className="font-mono text-xs">{r.no_jurnal}</TableCell>
                  <TableCell>{r.tanggal}</TableCell>
                  <TableCell><Badge variant="outline">{r.sumber}</Badge></TableCell>
                  <TableCell className="font-mono text-xs">{r.ref_no ?? "-"}</TableCell>
                  <TableCell><span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{r.posted_by}</span></TableCell>
                  <TableCell className="text-xs">{r.posted_at ? new Date(r.posted_at).toLocaleString("id-ID") : "-"}</TableCell>
                  <TableCell className="text-right font-mono">{fmt(r.total)}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={r.journal_status === "posted" ? "bg-emerald-500/15 text-emerald-700" : "bg-muted text-muted-foreground"}>
                      {r.journal_status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <FinanceDrillDialog
        open={!!drillEntry}
        onClose={() => setDrillEntry(null)}
        entry_id={drillEntry?.id}
        title={drillEntry?.title}
        from={from}
        to={to}
      />
    </div>
  );
}
