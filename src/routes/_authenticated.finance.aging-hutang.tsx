import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { PageHeader } from "@/components/app-shell";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { listExpenses } from "@/lib/finance-tx.functions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/finance/aging-hutang")({
  component: Page,
});

const fmt = (n: number) => "Rp " + (Number(n) || 0).toLocaleString("id-ID");
const daysBetween = (a: string) => Math.floor((Date.now() - new Date(a).getTime()) / 86400000);

function Page() {
  const fn = useServerFn(listExpenses);
  const { data, isLoading } = useQuery({ queryKey: ["fin-aging-hutang"], queryFn: () => fn({ data: {} }) });
  const rows = (data?.rows ?? []).filter((r: any) => r.status !== "void" && Number(r.total) > Number(r.dibayar ?? 0));

  const aging = useMemo(() => {
    const b: Record<string, number> = { "0-30": 0, "31-60": 0, "61-90": 0, ">90": 0 };
    for (const r of rows) {
      const sisa = Number(r.total) - Number(r.dibayar ?? 0);
      const d = daysBetween(r.tanggal);
      const k = d <= 30 ? "0-30" : d <= 60 ? "31-60" : d <= 90 ? "61-90" : ">90";
      b[k] += sisa;
    }
    return b;
  }, [rows]);
  const total = Object.values(aging).reduce((a, b) => a + b, 0);

  return (
    <div>
      <PageHeader title="Aging Hutang (AP)" desc="Outstanding voucher pengeluaran berdasarkan umur." />
      <div className="mb-3 grid gap-3 md:grid-cols-5">
        <Kpi label="Total Hutang" value={fmt(total)} />
        {Object.entries(aging).map(([k, v]) => <Kpi key={k} label={`Umur ${k} hari`} value={fmt(v)} />)}
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader><TableRow>
            <TableHead>No. Voucher</TableHead><TableHead>Tanggal</TableHead><TableHead>Vendor</TableHead>
            <TableHead className="text-right">Total</TableHead><TableHead className="text-right">Dibayar</TableHead>
            <TableHead className="text-right">Sisa</TableHead><TableHead className="text-right">Umur</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={7} className="py-12 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></TableCell></TableRow>
              : rows.length === 0 ? <TableRow><TableCell colSpan={7} className="py-12 text-center text-muted-foreground text-sm">Tidak ada hutang outstanding.</TableCell></TableRow>
              : rows.map((r: any) => {
                const sisa = Number(r.total) - Number(r.dibayar ?? 0);
                const umur = daysBetween(r.tanggal);
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.no_voucher}</TableCell>
                    <TableCell>{r.tanggal}</TableCell>
                    <TableCell>{r.vendor_name ?? "-"}</TableCell>
                    <TableCell className="text-right font-mono">{fmt(r.total)}</TableCell>
                    <TableCell className="text-right font-mono">{fmt(r.dibayar ?? 0)}</TableCell>
                    <TableCell className="text-right font-mono font-semibold">{fmt(sisa)}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="secondary" className={umur > 90 ? "bg-rose-500/15 text-rose-700" : umur > 60 ? "bg-amber-500/15 text-amber-700" : "bg-muted text-muted-foreground"}>{umur} hari</Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-border bg-card p-4"><div className="text-xs text-muted-foreground">{label}</div><div className="mt-1 text-lg font-semibold">{value}</div></div>;
}
