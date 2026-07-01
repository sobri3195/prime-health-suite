import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/lib/page-head";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { PageHeader } from "@/components/app-shell";
import { formatIDR } from "@/lib/finance";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useFinanceDate } from "@/context/finance-date";
import { getHonorRekap } from "@/lib/finance-dashboard.functions";

export const Route = createFileRoute("/_authenticated/finance/honor-potongan")({
  
  head: () => pageHead({ title: "Potongan Jasa Dokter — Finance", description: "Potongan Jasa Dokter pada modul keuangan klinik.", path: "/finance/honor-potongan" }),
  component: Page,
});

const PPH21 = 0.05;
const BPJS_KES = 0.01;
const LAINNYA = 0.005;

function Page() {
  const { from, to, label } = useFinanceDate();
  const call = useServerFn(getHonorRekap);
  const q = useQuery({
    queryKey: ["fin", "honor-rekap", from, to],
    queryFn: () => call({ data: { from, to } }),
  });

  const rekap = useMemo(() => {
    const base = q.data?.rows ?? [];
    return base.map((r) => {
      const pph21 = Math.round(r.jasa * PPH21);
      const bpjsKes = Math.round(r.jasa * BPJS_KES);
      const lainnya = Math.round(r.jasa * LAINNYA);
      return { ...r, pph21, bpjsKes, lainnya, net: r.jasa - pph21 - bpjsKes - lainnya };
    });
  }, [q.data]);

  return (
    <div>
      <PageHeader title="Potongan Jasa Dokter" desc={`Rincian potongan PPh 21 (5%), BPJS Kes (1%), lainnya (0.5%) — periode ${label}.`} />

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Dokter</TableHead>
            <TableHead className="text-right">Jasa Medis</TableHead>
            <TableHead className="text-right">PPh 21 (5%)</TableHead>
            <TableHead className="text-right">BPJS Kes (1%)</TableHead>
            <TableHead className="text-right">Lainnya (0.5%)</TableHead>
            <TableHead className="text-right">Take Home</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {q.isLoading ? (
              <TableRow><TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">Memuat…</TableCell></TableRow>
            ) : rekap.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">Tidak ada data.</TableCell></TableRow>
            ) : rekap.map((r) => (
              <TableRow key={r.dokter}>
                <TableCell className="text-sm">{r.dokter}</TableCell>
                <TableCell className="text-right font-mono text-xs">{formatIDR(r.jasa)}</TableCell>
                <TableCell className="text-right font-mono text-xs text-rose-600">-{formatIDR(r.pph21)}</TableCell>
                <TableCell className="text-right font-mono text-xs text-rose-600">-{formatIDR(r.bpjsKes)}</TableCell>
                <TableCell className="text-right font-mono text-xs text-rose-600">-{formatIDR(r.lainnya)}</TableCell>
                <TableCell className="text-right font-mono text-sm font-medium text-emerald-600">{formatIDR(r.net)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
