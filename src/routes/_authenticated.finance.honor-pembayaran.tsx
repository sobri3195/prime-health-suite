import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/lib/page-head";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { FinanceFilters, defaultFilter } from "@/components/finance-filters";
import { invoices } from "@/data/financeData";
import { applyFilter, formatIDR } from "@/lib/finance";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Printer } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/finance/honor-pembayaran")({
  
  head: () => pageHead({ title: "Pembayaran Honor — Finance", description: "Pembayaran Honor pada modul keuangan klinik.", path: "/finance/honor-pembayaran" }),
  component: Page,
});

const PCT: Record<string, number> = {
  "dr. Rini, Sp.M": 40, "dr. Bagas, Sp.M": 45, "dr. Anisa, Sp.M": 45,
  "dr. Hadi, Sp.M(K)": 50, "dr. Tania, Sp.M": 40, "dr. Yusuf, Sp.M": 45,
};
const PPH = 0.025;

function Page() {
  const [filter, setFilter] = useState(defaultFilter);
  const [paid, setPaid] = useState<Record<string, boolean>>({});
  const doctors = useMemo(() => Array.from(new Set(invoices.map((r) => r.doctor))), []);
  const services = useMemo(() => Array.from(new Set(invoices.map((r) => r.category))), []);
  const rows = applyFilter(invoices, filter);

  const rekap = useMemo(() => {
    const m = new Map<string, { dokter: string; jasa: number; pph: number; net: number }>();
    rows.forEach((r) => {
      const pct = PCT[r.doctor] ?? 40;
      const jasa = Math.round((r.total * pct) / 100);
      const cur = m.get(r.doctor) ?? { dokter: r.doctor, jasa: 0, pph: 0, net: 0 };
      cur.jasa += jasa; cur.pph += Math.round(jasa * PPH); cur.net = cur.jasa - cur.pph;
      m.set(r.doctor, cur);
    });
    return Array.from(m.values()).sort((a, z) => z.net - a.net);
  }, [rows]);

  const totalNet = rekap.reduce((a, r) => a + r.net, 0);
  const totalPaid = rekap.filter((r) => paid[r.dokter]).reduce((a, r) => a + r.net, 0);

  return (
    <div>
      <PageHeader title="Pembayaran Honor Dokter" desc="Daftar honor dokter siap dibayar. Tandai lunas untuk membentuk voucher BKK." />
      <FinanceFilters value={filter} onChange={setFilter} doctors={doctors} services={services} />
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
            {rekap.length === 0 ? <TableRow><TableCell colSpan={6} className="py-12 text-center text-sm text-muted-foreground">Tidak ada honor dibayar pada periode ini.</TableCell></TableRow>
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
