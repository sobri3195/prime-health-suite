import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/lib/page-head";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { PageHeader } from "@/components/app-shell";
import { formatIDR } from "@/lib/finance";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Printer, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useFinanceDate } from "@/context/finance-date";
import { getHonorRekap } from "@/lib/finance-dashboard.functions";

export const Route = createFileRoute("/_authenticated/finance/honor-pembayaran")({
  head: () => pageHead({ title: "Pembayaran Honor — Finance", description: "Pembayaran Honor pada modul keuangan klinik.", path: "/finance/honor-pembayaran" }),
  component: Page,
});

const PPH = 0.025;

function Page() {
  const { from, to, label } = useFinanceDate();
  const call = useServerFn(getHonorRekap);
  const q = useQuery({
    queryKey: ["fin", "honor-pembayaran", from, to],
    queryFn: () => call({ data: { from, to } }),
  });
  const [paid, setPaid] = useState<Record<string, boolean>>({});

  const rekap = useMemo(() => {
    return (q.data?.rows ?? []).map((r) => {
      const pph = Math.round(r.jasa * PPH);
      return { dokter: r.dokter, jasa: r.jasa, pph, net: r.jasa - pph };
    }).sort((a, z) => z.net - a.net);
  }, [q.data]);

  const totalNet = rekap.reduce((a, r) => a + r.net, 0);
  const totalPaid = rekap.filter((r) => paid[r.dokter]).reduce((a, r) => a + r.net, 0);

  return (
    <div>
      <PageHeader title="Pembayaran Honor Dokter" desc={`Daftar honor dokter siap dibayar — periode ${label}. Tandai lunas untuk membentuk voucher BKK.`} />
      <div className="mb-3 grid gap-3 md:grid-cols-3">
        <Kpi label="Total Net" value={formatIDR(totalNet)} />
        <Kpi label="Sudah Dibayar" value={formatIDR(totalPaid)} />
        <Kpi label="Outstanding" value={formatIDR(totalNet - totalPaid)} />
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Dokter</TableHead><TableHead className="text-right">Jasa Bruto</TableHead>
            <TableHead className="text-right">PPh</TableHead><TableHead className="text-right">Diterima (Net)</TableHead>
            <TableHead>Status</TableHead><TableHead className="w-32" />
          </TableRow></TableHeader>
          <TableBody>
            {q.isLoading ? <TableRow><TableCell colSpan={6} className="py-12 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></TableCell></TableRow>
              : rekap.length === 0 ? <TableRow><TableCell colSpan={6} className="py-12 text-center text-sm text-muted-foreground">Tidak ada honor dibayar pada periode ini.</TableCell></TableRow>
              : rekap.map((r) => (
                <TableRow key={r.dokter}>
                  <TableCell className="font-semibold">{r.dokter}</TableCell>
                  <TableCell className="text-right font-mono">{formatIDR(r.jasa)}</TableCell>
                  <TableCell className="text-right font-mono text-rose-600">{formatIDR(r.pph)}</TableCell>
                  <TableCell className="text-right font-mono font-semibold text-emerald-600">{formatIDR(r.net)}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={paid[r.dokter] ? "bg-emerald-500/15 text-emerald-700" : "bg-amber-500/15 text-amber-700"}>
                      {paid[r.dokter] ? "Lunas" : "Pending"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {!paid[r.dokter] && (
                        <Button size="sm" variant="outline" className="gap-1" onClick={() => { setPaid({ ...paid, [r.dokter]: true }); toast.success(`Honor ${r.dokter} ditandai lunas`); }}>
                          <Check className="h-3.5 w-3.5" /> Bayar
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => window.print()}><Printer className="h-3.5 w-3.5" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-border bg-card p-4"><div className="text-xs text-muted-foreground">{label}</div><div className="mt-1 text-lg font-semibold">{value}</div></div>;
}
