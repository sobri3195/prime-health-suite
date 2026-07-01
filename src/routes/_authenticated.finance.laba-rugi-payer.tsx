import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/lib/page-head";
import { useMemo } from "react";
import { PageHeader } from "@/components/app-shell";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { listInvoices } from "@/lib/finance-tx.functions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import { useFinanceDate } from "@/context/finance-date";

export const Route = createFileRoute("/_authenticated/finance/laba-rugi-payer")({
  
  head: () => pageHead({ title: "Laba Rugi by Payer — Finance", description: "Laba Rugi by Payer pada modul keuangan klinik.", path: "/finance/laba-rugi-payer" }),
  component: Page,
});

const fmt = (n: number) => "Rp " + (Number(n) || 0).toLocaleString("id-ID");

function Page() {
  const { from, to } = useFinanceDate();
  const fn = useServerFn(listInvoices);
  const { data, isLoading } = useQuery({ queryKey: ["fin-lr-payer", from, to], queryFn: () => fn({ data: { from, to } }) });
  const rows = (data?.rows ?? []).filter((r: any) => r.status !== "void");

  const byPayer = useMemo(() => {
    const m = new Map<string, { revenue: number; count: number; dibayar: number }>();
    for (const r of rows) {
      const k = r.payer_name || r.payer_type || "Umum";
      const ex = m.get(k) ?? { revenue: 0, count: 0, dibayar: 0 };
      ex.revenue += Number(r.total) || 0;
      ex.dibayar += Number(r.dibayar) || 0;
      ex.count += 1;
      m.set(k, ex);
    }
    return Array.from(m.entries()).map(([payer, v]) => ({ payer, ...v, outstanding: v.revenue - v.dibayar })).sort((a, b) => b.revenue - a.revenue);
  }, [rows]);

  const total = byPayer.reduce((a, b) => a + b.revenue, 0);

  return (
    <div>
      <PageHeader title="Laba Rugi by Payer" desc="Distribusi pendapatan per payer/asuransi pada periode terpilih." />
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Payer</TableHead><TableHead className="text-right">Invoice</TableHead>
            <TableHead className="text-right">Pendapatan</TableHead><TableHead className="text-right">Terbayar</TableHead>
            <TableHead className="text-right">Outstanding</TableHead><TableHead className="text-right">Kontribusi</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={6} className="py-12 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></TableCell></TableRow>
              : byPayer.length === 0 ? <TableRow><TableCell colSpan={6} className="py-12 text-center text-muted-foreground text-sm">Tidak ada invoice.</TableCell></TableRow>
              : byPayer.map((r) => (
                <TableRow key={r.payer}>
                  <TableCell>{r.payer}</TableCell>
                  <TableCell className="text-right">{r.count}</TableCell>
                  <TableCell className="text-right font-mono">{fmt(r.revenue)}</TableCell>
                  <TableCell className="text-right font-mono">{fmt(r.dibayar)}</TableCell>
                  <TableCell className="text-right font-mono">{fmt(r.outstanding)}</TableCell>
                  <TableCell className="text-right">{total ? ((r.revenue / total) * 100).toFixed(1) + "%" : "—"}</TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
