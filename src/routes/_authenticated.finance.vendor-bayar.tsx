import { createFileRoute, Link } from "@tanstack/react-router";
import { pageHead } from "@/lib/page-head";
import { PageHeader } from "@/components/app-shell";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { listExpenses } from "@/lib/finance-tx.functions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/finance/vendor-bayar")({
  
  head: () => pageHead({ title: "Pembayaran Vendor — Finance", description: "Pembayaran Vendor pada modul keuangan klinik.", path: "/finance/vendor-bayar" }),
  component: Page,
});

const fmt = (n: number) => "Rp " + (Number(n) || 0).toLocaleString("id-ID");

function Page() {
  const fn = useServerFn(listExpenses);
  const { data, isLoading } = useQuery({ queryKey: ["fin-vendor-bayar"], queryFn: () => fn({ data: {} }) });
  const rows = (data?.rows ?? []).filter((r: any) => r.status !== "void");

  return (
    <div>
      <PageHeader title="Pembayaran Vendor (AP)" desc="Status pembayaran ke vendor/supplier." />
      <div className="mb-3 flex justify-end gap-2">
        <Button asChild variant="outline"><Link to="/finance/pengeluaran">Buat Pengeluaran</Link></Button>
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader><TableRow>
            <TableHead>No. Voucher</TableHead><TableHead>Tanggal</TableHead><TableHead>Vendor</TableHead>
            <TableHead className="text-right">Total</TableHead><TableHead className="text-right">Dibayar</TableHead>
            <TableHead className="text-right">Sisa</TableHead><TableHead>Status</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={7} className="py-12 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></TableCell></TableRow>
              : rows.length === 0 ? <TableRow><TableCell colSpan={7} className="py-12 text-center text-muted-foreground text-sm">Belum ada voucher pengeluaran.</TableCell></TableRow>
              : rows.map((r: any) => {
                const sisa = Number(r.total) - Number(r.dibayar ?? 0);
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.no_voucher}</TableCell>
                    <TableCell>{r.tanggal}</TableCell>
                    <TableCell>{r.vendor_name ?? "-"}</TableCell>
                    <TableCell className="text-right font-mono">{fmt(r.total)}</TableCell>
                    <TableCell className="text-right font-mono">{fmt(r.dibayar ?? 0)}</TableCell>
                    <TableCell className="text-right font-mono font-semibold">{fmt(sisa)}</TableCell>
                    <TableCell><Badge variant="secondary">{r.status}</Badge></TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
