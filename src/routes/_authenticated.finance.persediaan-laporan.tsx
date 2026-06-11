import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/app-shell";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { listFinMaster } from "@/lib/finance-master.functions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/finance/persediaan-laporan")({
  component: Page,
});

const fmt = (n: number) => (Number(n) || 0).toLocaleString("id-ID");

function Page() {
  const fn = useServerFn(listFinMaster);
  const { data, isLoading } = useQuery({ queryKey: ["fin-master", "fin_persediaan"], queryFn: () => fn({ data: { table: "fin_persediaan" } }) });
  const rows = data?.rows ?? [];
  const nilai = rows.reduce((a: number, r: any) => a + (Number(r.stok) * Number(r.harga_beli || 0)), 0);
  const lowStock = rows.filter((r: any) => Number(r.stok) <= Number(r.min_stok || 0));

  return (
    <div>
      <PageHeader title="Laporan Persediaan" desc="Snapshot stok & nilai persediaan." />
      <div className="mb-3 grid gap-3 md:grid-cols-3">
        <Kpi label="Total SKU" value={String(rows.length)} />
        <Kpi label="Nilai Stok (Harga Beli)" value={"Rp " + fmt(nilai)} />
        <Kpi label="SKU Low Stock" value={String(lowStock.length)} />
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Kode</TableHead><TableHead>Nama</TableHead><TableHead>Kategori</TableHead>
            <TableHead className="text-right">Stok</TableHead><TableHead className="text-right">Min</TableHead>
            <TableHead className="text-right">Harga Beli</TableHead><TableHead className="text-right">Nilai</TableHead>
            <TableHead>Status</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={8} className="py-12 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></TableCell></TableRow>
              : rows.length === 0 ? <TableRow><TableCell colSpan={8} className="py-12 text-center text-muted-foreground text-sm">Belum ada persediaan.</TableCell></TableRow>
              : rows.map((r: any) => {
                const low = Number(r.stok) <= Number(r.min_stok || 0);
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.kode}</TableCell>
                    <TableCell>{r.nama}</TableCell>
                    <TableCell className="text-xs">{r.kategori}</TableCell>
                    <TableCell className="text-right font-mono">{fmt(r.stok)}</TableCell>
                    <TableCell className="text-right font-mono">{fmt(r.min_stok)}</TableCell>
                    <TableCell className="text-right font-mono">{fmt(r.harga_beli)}</TableCell>
                    <TableCell className="text-right font-mono">{fmt(Number(r.stok) * Number(r.harga_beli || 0))}</TableCell>
                    <TableCell><Badge variant="secondary" className={low ? "bg-rose-500/15 text-rose-700" : "bg-emerald-500/15 text-emerald-700"}>{low ? "Low" : "OK"}</Badge></TableCell>
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
