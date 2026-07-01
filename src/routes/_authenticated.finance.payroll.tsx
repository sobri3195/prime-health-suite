import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/lib/page-head";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Wallet, PlusCircle, Lock } from "lucide-react";
import { SkeletonList, EmptyState } from "@/components/apps/ui";
import { ExportBar, defaultRange, type DateRange } from "@/components/export-bar";
import { exportCsv, exportPdf, type Column } from "@/lib/exporter";
import {
  listPayrollRuns, createPayrollRun, getPayrollDetail, finalizePayrollRun, payPayrollRun,
} from "@/lib/payroll.functions";
import { clinicAudit } from "@/lib/clinic-audit";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/finance/payroll")({
  
  head: () => pageHead({ title: "Payroll (Umum) — Finance", description: "Payroll (Umum) pada modul keuangan klinik.", path: "/finance/payroll" }),
  component: PayrollPage,
});

type RunRow = {
  id: string; periode_bulan: number; periode_tahun: number; status: "draft" | "final" | "paid";
  total_gaji: number; total_lembur: number; total_take_home: number;
};
type ItemRow = {
  id: string; nama_snapshot: string; gaji_pokok: number; total_jam_lembur: number;
  nominal_lembur: number; potongan: number; take_home: number;
};

function fmtIDR(n: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(n ?? 0));
}
const monthName = (m: number) => new Date(2000, m - 1, 1).toLocaleDateString("id-ID", { month: "long" });

function PayrollPage() {
  const qc = useQueryClient();
  const now = new Date();
  const [bulan, setBulan] = useState(now.getMonth() + 1);
  const [tahun, setTahun] = useState(now.getFullYear());
  const [selectedRun, setSelectedRun] = useState<string | null>(null);
  const [range, setRange] = useState<DateRange>(() => defaultRange(180));

  const runs = useQuery({ queryKey: ["hr.runs"], queryFn: () => listPayrollRuns() });
  const detail = useQuery({
    queryKey: ["hr.run.detail", selectedRun],
    queryFn: () => getPayrollDetail({ data: { id: selectedRun! } }),
    enabled: !!selectedRun,
  });

  const mCreate = useMutation({
    mutationFn: () => createPayrollRun({ data: { periode_bulan: bulan, periode_tahun: tahun } }),
    onSuccess: (run) => {
      toast.success(`Payroll ${monthName(bulan)} ${tahun} dibuat`);
      clinicAudit("Payroll", "create_run", run?.id, { bulan, tahun });
      qc.invalidateQueries({ queryKey: ["hr.runs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const mFinal = useMutation({
    mutationFn: (id: string) => finalizePayrollRun({ data: { id } }),
    onSuccess: (_d, id) => {
      toast.success("Payroll difinalisasi");
      clinicAudit("Payroll", "finalize", id);
      qc.invalidateQueries({ queryKey: ["hr.runs"] });
      qc.invalidateQueries({ queryKey: ["hr.run.detail", id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const mPay = useMutation({
    mutationFn: (id: string) => payPayrollRun({ data: { id, metode: "transfer" } }),
    onSuccess: (d, id) => {
      toast.success(`Payroll dibayar → voucher ${d?.expense?.no_voucher ?? ""}`);
      clinicAudit("Payroll", "pay", id, { expense_id: d?.expense?.id });
      qc.invalidateQueries({ queryKey: ["hr.runs"] });
      qc.invalidateQueries({ queryKey: ["hr.run.detail", id] });
      qc.invalidateQueries({ queryKey: ["fin-expenses"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const runCols: Column<RunRow>[] = useMemo(() => [
    { key: "periode", header: "Periode", format: (r) => `${monthName(r.periode_bulan)} ${r.periode_tahun}` },
    { key: "status", header: "Status" },
    { key: "total_gaji", header: "Total Gaji", format: (r) => fmtIDR(r.total_gaji) },
    { key: "total_lembur", header: "Total Lembur", format: (r) => fmtIDR(r.total_lembur) },
    { key: "total_take_home", header: "Take Home", format: (r) => fmtIDR(r.total_take_home) },
  ], []);

  const itemCols: Column<ItemRow>[] = useMemo(() => [
    { key: "nama_snapshot", header: "Karyawan" },
    { key: "gaji_pokok", header: "Gaji Pokok", format: (r) => fmtIDR(r.gaji_pokok) },
    { key: "total_jam_lembur", header: "Jam Lembur", format: (r) => Number(r.total_jam_lembur).toFixed(2) },
    { key: "nominal_lembur", header: "Nominal Lembur", format: (r) => fmtIDR(r.nominal_lembur) },
    { key: "potongan", header: "Potongan", format: (r) => fmtIDR(r.potongan) },
    { key: "take_home", header: "Take Home", format: (r) => fmtIDR(r.take_home) },
  ], []);

  return (
    <div className="space-y-6">
      <PageHeader title="Payroll" desc="Proses penggajian bulanan dengan lembur dari absensi." />

      {/* Create run */}
      <div className="flex flex-wrap items-end gap-2 rounded-2xl border border-border bg-card p-4">
        <div className="grid gap-1">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Bulan</span>
          <Select value={String(bulan)} onValueChange={(v) => setBulan(Number(v))}>
            <SelectTrigger className="h-9 w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <SelectItem key={m} value={String(m)}>{monthName(m)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Tahun</span>
          <Select value={String(tahun)} onValueChange={(v) => setTahun(Number(v))}>
            <SelectTrigger className="h-9 w-28"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[tahun - 1, tahun, tahun + 1].map((y) => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button className="gap-1" disabled={mCreate.isPending} onClick={() => mCreate.mutate()}>
          <PlusCircle className="h-4 w-4" /> Buat Payroll Run
        </Button>
      </div>

      {/* Runs list */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-semibold flex items-center gap-2"><Wallet className="h-4 w-4" /> Daftar Payroll Run</h3>
          <ExportBar
            range={range}
            onRange={setRange}
            onCsv={() => exportCsv("payroll-runs.csv", runCols, (runs.data ?? []) as RunRow[], range)}
            onPdf={() => exportPdf("payroll-runs.pdf", "Payroll Runs", runCols, (runs.data ?? []) as RunRow[], range)}
          />
        </div>
        {runs.isLoading ? <SkeletonList rows={4} />
          : (runs.data ?? []).length === 0
          ? <EmptyState title="Belum ada payroll run" hint="Buat run pertama bulan ini." />
          : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Periode</TableHead><TableHead>Status</TableHead>
                  <TableHead className="text-right">Gaji</TableHead>
                  <TableHead className="text-right">Lembur</TableHead>
                  <TableHead className="text-right">Take Home</TableHead>
                  <TableHead></TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {(runs.data as RunRow[]).map((r) => (
                    <TableRow key={r.id} data-state={selectedRun === r.id ? "selected" : undefined}>
                      <TableCell>{monthName(r.periode_bulan)} {r.periode_tahun}</TableCell>
                      <TableCell>
                        <Badge variant={r.status === "draft" ? "outline" : "default"}>{r.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{fmtIDR(r.total_gaji)}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtIDR(r.total_lembur)}</TableCell>
                      <TableCell className="text-right tabular-nums font-medium">{fmtIDR(r.total_take_home)}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" onClick={() => setSelectedRun(r.id)}>Detail</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
      </div>

      {/* Detail */}
      {selectedRun && (
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-semibold">Detail Payroll</h3>
            <div className="flex gap-2">
              {detail.data?.run?.status === "draft" && (
                <Button size="sm" className="gap-1" disabled={mFinal.isPending}
                  onClick={() => mFinal.mutate(selectedRun)}>
                  <Lock className="h-4 w-4" /> Finalize
                </Button>
              )}
              {detail.data?.run?.status === "final" && (
                <Button size="sm" className="gap-1" disabled={mPay.isPending}
                  onClick={() => mPay.mutate(selectedRun)}>
                  <Wallet className="h-4 w-4" /> Bayar & Post ke Expense
                </Button>
              )}
              {detail.data?.run?.status === "paid" && (
                <Badge>Sudah Dibayar</Badge>
              )}
              <Button size="sm" variant="outline"
                onClick={() => exportCsv("payroll-detail.csv", itemCols, (detail.data?.items ?? []) as ItemRow[])}>
                Export CSV
              </Button>
              <Button size="sm" variant="outline"
                onClick={() => exportPdf("payroll-detail.pdf", "Slip Gaji Massal", itemCols, (detail.data?.items ?? []) as ItemRow[])}>
                Export PDF
              </Button>
            </div>
          </div>
          {detail.isLoading ? <SkeletonList rows={5} />
            : (detail.data?.items ?? []).length === 0
            ? <EmptyState title="Belum ada item" hint="Pastikan karyawan aktif terdaftar di HR." />
            : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Karyawan</TableHead>
                    <TableHead className="text-right">Gaji Pokok</TableHead>
                    <TableHead className="text-right">Jam Lembur</TableHead>
                    <TableHead className="text-right">Nominal Lembur</TableHead>
                    <TableHead className="text-right">Potongan</TableHead>
                    <TableHead className="text-right">Take Home</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {(detail.data!.items as ItemRow[]).map((i) => (
                      <TableRow key={i.id}>
                        <TableCell>{i.nama_snapshot}</TableCell>
                        <TableCell className="text-right tabular-nums">{fmtIDR(i.gaji_pokok)}</TableCell>
                        <TableCell className="text-right tabular-nums">{Number(i.total_jam_lembur).toFixed(2)}</TableCell>
                        <TableCell className="text-right tabular-nums">{fmtIDR(i.nominal_lembur)}</TableCell>
                        <TableCell className="text-right tabular-nums">{fmtIDR(i.potongan)}</TableCell>
                        <TableCell className="text-right tabular-nums font-medium">{fmtIDR(i.take_home)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
        </div>
      )}
    </div>
  );
}
