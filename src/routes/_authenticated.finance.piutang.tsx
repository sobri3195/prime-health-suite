import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { PageHeader } from "@/components/app-shell";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { listInvoices } from "@/lib/finance-tx.functions";
import { useFinanceDate } from "@/context/finance-date";

export const Route = createFileRoute("/_authenticated/finance/piutang")({
  component: PiutangPage,
});

const fmt = (n: number) => "Rp " + (Number(n) || 0).toLocaleString("id-ID");

function daysBetween(a: string) {
  return Math.floor((Date.now() - new Date(a).getTime()) / 86400000);
}

function PiutangPage() {
  const { from, to } = useFinanceDate();
  const fn = useServerFn(listInvoices);
  const { data, isLoading } = useQuery({ queryKey: ["fin-piutang", from, to], queryFn: () => fn({ data: { from, to } }) });
  const rows = (data?.rows ?? []).filter((r: any) => r.status !== "void" && Number(r.total) > Number(r.dibayar ?? 0));

  const aging = useMemo(() => {
    const buckets = { "0-30": 0, "31-60": 0, "61-90": 0, ">90": 0 } as Record<string, number>;
    for (const r of rows) {
      const sisa = Number(r.total) - Number(r.dibayar ?? 0);
      const d = daysBetween(r.tanggal);
      const b = d <= 30 ? "0-30" : d <= 60 ? "31-60" : d <= 90 ? "61-90" : ">90";
      buckets[b] += sisa;
    }
    return buckets;
  }, [rows]);
  const total = Object.values(aging).reduce((a, b) => a + b, 0);

  return (
    <div>
      <PageHeader title="Piutang Usaha" desc="Outstanding invoice & AR aging." />
      <div className="mb-3 grid gap-3 md:grid-cols-5">
        <Kpi label="Total Piutang" value={fmt(total)} />
        {Object.entries(aging).map(([k, v]) => <Kpi key={k} label={`Umur ${k} hari`} value={fmt(v)} />)}
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader><TableRow>
            <TableHead>No. Invoice</TableHead><TableHead>Tanggal</TableHead><TableHead>Pasien</TableHead>
            <TableHead className="text-right">Total</TableHead><TableHead className="text-right">Terbayar</TableHead>
            <TableHead className="text-right">Outstanding</TableHead><TableHead className="text-right">Umur</TableHead><TableHead>Status</TableHead><TableHead>Jurnal</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={9} className="py-12 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></TableCell></TableRow>
              : rows.length === 0 ? <TableRow><TableCell colSpan={9} className="py-12 text-center text-sm text-muted-foreground">Tidak ada piutang outstanding.</TableCell></TableRow>
              : rows.map((r: any) => {
                const sisa = Number(r.total) - Number(r.dibayar ?? 0);
                const umur = daysBetween(r.tanggal);
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.no_invoice}</TableCell>
                    <TableCell>{r.tanggal}</TableCell>
                    <TableCell>{r.patient_name ?? r.patient_code}</TableCell>
                    <TableCell className="text-right font-mono">{fmt(r.total)}</TableCell>
                    <TableCell className="text-right font-mono">{fmt(r.dibayar ?? 0)}</TableCell>
                    <TableCell className="text-right font-mono font-semibold">{fmt(sisa)}</TableCell>
                    <TableCell className="text-right">{umur} hari</TableCell>
                    <TableCell><Badge variant="secondary" className={umur > 90 ? "bg-rose-500/15 text-rose-700" : umur > 60 ? "bg-amber-500/15 text-amber-700" : "bg-muted text-muted-foreground"}>{r.status}</Badge></TableCell>
                    <TableCell><Badge variant="secondary" className={r.posted_journal_id ? "bg-emerald-500/15 text-emerald-700" : "bg-amber-500/15 text-amber-700"}>{r.posted_journal_id ? "Posted" : "Unposted"}</Badge></TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">Catat pembayaran lewat halaman Pendapatan (tombol struk pada baris invoice).</p>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-border bg-card p-4"><div className="text-xs text-muted-foreground">{label}</div><div className="mt-1 text-lg font-semibold">{value}</div></div>;
}
