import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/lib/page-head";
import { useMemo } from "react";
import { PageHeader } from "@/components/app-shell";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { listFinMaster } from "@/lib/finance-master.functions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/finance/aset-laporan")({
  
  head: () => pageHead({ title: "Laporan Aset by Cost Center — Finance", description: "Laporan Aset by Cost Center pada modul keuangan klinik.", path: "/finance/aset-laporan" }),
  component: Page,
});

const fmt = (n: number) => "Rp " + (Number(n) || 0).toLocaleString("id-ID");

function Page() {
  const fn = useServerFn(listFinMaster);
  const { data } = useQuery({ queryKey: ["fin-master", "fin_aset"], queryFn: () => fn({ data: { table: "fin_aset" } }) });
  const rows = data?.rows ?? [];

  const byCC = useMemo(() => {
    const m = new Map<string, { harga: number; akm: number; buku: number; count: number }>();
    for (const row of rows) {
      const r = row as any;
      const cc = r.cost_center_code || "(tanpa CC)";
      const ex = m.get(cc) ?? { harga: 0, akm: 0, buku: 0, count: 0 };
      ex.harga += Number(r.harga_perolehan) || 0;
      ex.akm += Number(r.akumulasi_penyusutan) || 0;
      ex.buku += Number(r.nilai_buku) || 0;
      ex.count += 1;
      m.set(cc, ex);
    }
    return Array.from(m.entries()).map(([cc, v]) => ({ cc, ...v }));
  }, [rows]);

  return (
    <div>
      <PageHeader title="Laporan Aset by Cost Center" desc="Rekap nilai aset, akumulasi penyusutan, dan nilai buku per cost center." />
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Cost Center</TableHead><TableHead className="text-right">Jumlah Aset</TableHead>
            <TableHead className="text-right">Harga Perolehan</TableHead><TableHead className="text-right">Akm Penyusutan</TableHead>
            <TableHead className="text-right">Nilai Buku</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {byCC.length === 0 ? <TableRow><TableCell colSpan={5} className="py-12 text-center text-muted-foreground text-sm">Belum ada aset.</TableCell></TableRow>
              : byCC.map((r) => (
                <TableRow key={r.cc}>
                  <TableCell>{r.cc}</TableCell>
                  <TableCell className="text-right font-mono">{r.count}</TableCell>
                  <TableCell className="text-right font-mono">{fmt(r.harga)}</TableCell>
                  <TableCell className="text-right font-mono">{fmt(r.akm)}</TableCell>
                  <TableCell className="text-right font-mono font-semibold">{fmt(r.buku)}</TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
