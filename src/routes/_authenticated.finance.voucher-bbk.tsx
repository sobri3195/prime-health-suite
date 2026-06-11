import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/app-shell";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { listPayments } from "@/lib/finance-tx.functions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/finance/voucher-bbk")({
  component: Page,
});

const fmt = (n: number) => "Rp " + (Number(n) || 0).toLocaleString("id-ID");

function Page() {
  const fn = useServerFn(listPayments);
  const { data, isLoading } = useQuery({ queryKey: ["fin-bbk"], queryFn: () => fn({ data: {} }) });
  const rows = (data?.rows ?? []).filter((r: any) => r.status !== "void");

  return (
    <div>
      <PageHeader title="Voucher BBK (Bukti Bank/Kas Masuk)" desc="Daftar penerimaan pembayaran invoice dari pasien/payer." />
      <div className="mb-3 flex justify-end">
        <Button asChild><Link to="/finance/piutang">Catat dari Piutang</Link></Button>
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader><TableRow>
            <TableHead>No. Bukti</TableHead><TableHead>Tanggal</TableHead><TableHead>Invoice</TableHead>
            <TableHead>Metode</TableHead><TableHead className="text-right">Jumlah</TableHead><TableHead>Status</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={6} className="py-12 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></TableCell></TableRow>
              : rows.length === 0 ? <TableRow><TableCell colSpan={6} className="py-12 text-center text-muted-foreground text-sm">Belum ada penerimaan.</TableCell></TableRow>
              : rows.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">{r.no_bukti}</TableCell>
                  <TableCell>{r.tanggal}</TableCell>
                  <TableCell className="font-mono text-xs">{r.invoice_no}</TableCell>
                  <TableCell>{r.metode}</TableCell>
                  <TableCell className="text-right font-mono">{fmt(r.jumlah)}</TableCell>
                  <TableCell>{r.status}</TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
