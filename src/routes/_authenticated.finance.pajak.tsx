import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/lib/page-head";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, ShieldCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { formatIDR } from "@/lib/finance";
import { downloadCSV, exportFileName, toCSV } from "@/lib/export";
import { getPajakRekap } from "@/lib/finance-dashboard.functions";

export const Route = createFileRoute("/_authenticated/finance/pajak")({
  head: () => pageHead({ title: "Pajak (Umum) — Finance", description: "Pajak (Umum) pada modul keuangan klinik.", path: "/finance/pajak" }),
  component: PajakPage,
});

type TaxStatus = "draft" | "calculated" | "reviewed" | "paid";
const STATUS_LABEL: Record<TaxStatus, string> = { draft: "Draft", calculated: "Calculated", reviewed: "Reviewed", paid: "Paid" };
const statusCls = (s: TaxStatus) =>
  s === "paid" ? "bg-emerald-500/15 text-emerald-600"
  : s === "reviewed" ? "bg-blue-500/15 text-blue-600"
  : s === "calculated" ? "bg-amber-500/15 text-amber-600"
  : "bg-muted text-muted-foreground";

interface TaxRow { id: string; period: string; type: string; base: number; rate: number; amount: number; status: TaxStatus }

function deriveStatus(period: string): TaxStatus {
  const [y, m] = period.split("-").map(Number);
  const now = new Date();
  const target = new Date(y, m - 1, 1);
  const monthsAgo = (now.getFullYear() - target.getFullYear()) * 12 + (now.getMonth() - target.getMonth());
  if (monthsAgo >= 2) return "paid";
  if (monthsAgo === 1) return "reviewed";
  if (monthsAgo === 0) return "calculated";
  return "draft";
}

function PajakPage() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [type, setType] = useState("all");
  const [status, setStatus] = useState<string>("all");

  const call = useServerFn(getPajakRekap);
  const q = useQuery({
    queryKey: ["fin", "pajak-rekap", year],
    queryFn: () => call({ data: { year } }),
  });

  const rows: TaxRow[] = useMemo(() => {
    const src = q.data?.rows ?? [];
    const out: TaxRow[] = [];
    src.forEach((r: any) => {
      const st = deriveStatus(r.period);
      if (r.ppnOut > 0) out.push({ id: `PPN-OUT-${r.period}`, period: r.period, type: "PPN Keluaran", base: r.revenue, rate: 0.11, amount: r.ppnOut, status: st });
      if (r.ppnIn > 0) out.push({ id: `PPN-IN-${r.period}`, period: r.period, type: "PPN Masukan", base: r.expense, rate: 0.11, amount: r.ppnIn, status: st });
      if (r.pph21 > 0) out.push({ id: `PPH21-${r.period}`, period: r.period, type: "PPh 21 Dokter", base: Math.round(r.revenue * 0.4), rate: 0.05, amount: r.pph21, status: st === "calculated" ? "draft" : st });
    });
    return out;
  }, [q.data]);

  const filtered = rows.filter((r) => (type === "all" || r.type === type) && (status === "all" || r.status === status));
  const total = filtered.reduce((a, r) => a + r.amount, 0);
  const paid = filtered.filter((r) => r.status === "paid").reduce((a, r) => a + r.amount, 0);
  const owe = filtered.filter((r) => r.status !== "paid").reduce((a, r) => a + r.amount, 0);
  const types = Array.from(new Set(rows.map((r) => r.type)));

  const exportCSV = () => {
    const csv = toCSV(filtered, [
      { key: "period", label: "Periode", get: (r) => r.period },
      { key: "type", label: "Jenis Pajak", get: (r) => r.type },
      { key: "base", label: "DPP", get: (r) => r.base },
      { key: "rate", label: "Tarif", get: (r) => `${(r.rate * 100).toFixed(0)}%` },
      { key: "amount", label: "Pajak", get: (r) => r.amount },
      { key: "status", label: "Status", get: (r) => STATUS_LABEL[r.status] },
    ]);
    downloadCSV(exportFileName("pajak", `${year}`), csv);
    toast.success(`Export ${filtered.length} baris pajak (CSV)`);
  };

  return (
    <div>
      <PageHeader title="Pajak" desc="Rekap pajak bulanan dari pendapatan, pengeluaran, dan honor dokter (data live)." />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        {[
          { l: "Total Pajak", v: total, c: "" },
          { l: "Paid", v: paid, c: "text-emerald-600" },
          { l: "Terutang", v: owe, c: "text-amber-600" },
        ].map((k) => (
          <div key={k.l} className="rounded-xl border border-border bg-card p-4">
            <div className="text-xs text-muted-foreground">{k.l}</div>
            <div className={`mt-1 text-xl font-semibold ${k.c}`}>{formatIDR(k.v)}</div>
          </div>
        ))}
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
          <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
          <SelectContent>{[currentYear, currentYear - 1, currentYear - 2].map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Jenis</SelectItem>
            {types.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            {(Object.keys(STATUS_LABEL) as TaxStatus[]).map((s) =>
              <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="outline" className="gap-1" onClick={exportCSV}><Download className="h-4 w-4" /> Export CSV</Button>
        <div className="ml-auto flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs text-primary">
          <ShieldCheck className="h-3.5 w-3.5" /> PPN 11% · PPh 21 5% (dari 40% jasa)
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Periode</TableHead>
              <TableHead>Jenis</TableHead>
              <TableHead className="text-right">DPP</TableHead>
              <TableHead className="text-right">Tarif</TableHead>
              <TableHead className="text-right">Pajak</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {q.isLoading ? (
              <TableRow><TableCell colSpan={6} className="py-16 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="py-16 text-center text-sm text-muted-foreground">Tidak ada data pajak untuk filter ini.</TableCell></TableRow>
            ) : filtered.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-xs">{r.period}</TableCell>
                <TableCell>{r.type}</TableCell>
                <TableCell className="text-right font-mono text-sm">{formatIDR(r.base)}</TableCell>
                <TableCell className="text-right text-xs text-muted-foreground">{(r.rate * 100).toFixed(0)}%</TableCell>
                <TableCell className="text-right font-mono text-sm">{formatIDR(r.amount)}</TableCell>
                <TableCell><span className={`rounded-full px-2 py-0.5 text-xs ${statusCls(r.status)}`}>{STATUS_LABEL[r.status]}</span></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
