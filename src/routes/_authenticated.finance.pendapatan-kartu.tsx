import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/app-shell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { listInvoices } from "@/lib/finance-pendapatan.functions";
import { formatIDR } from "@/lib/finance";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { downloadCSV, exportFileName, toCSV } from "@/lib/export";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/finance/pendapatan-kartu")({
  component: Page,
});

type Inv = {
  no_invoice: string; tanggal: string;
  fin_pembayaran: Array<{ id: string; metode: string; bank: string | null; jumlah: number; mdr: number; netto: number }>;
};

function Page() {
  const today = new Date().toISOString().slice(0, 10);
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const [from, setFrom] = useState(monthAgo);
  const [to, setTo] = useState(today);

  const fn = useServerFn(listInvoices);
  const q = useQuery({ queryKey: ["fin-invoices", "kartu", from, to], queryFn: () => fn({ data: { from, to } }) });
  const invoices = (q.data?.rows ?? []) as Inv[];

  const rows = useMemo(() => {
    const out: Array<{ invoice: string; date: string; bank: string; metode: string; gross: number; mdr: number; net: number }> = [];
    for (const inv of invoices) {
      for (const p of inv.fin_pembayaran ?? []) {
        if (p.metode === "edc" || p.metode === "qris") {
          out.push({
            invoice: inv.no_invoice, date: inv.tanggal, bank: p.bank ?? "-",
            metode: p.metode, gross: Number(p.jumlah), mdr: Number(p.mdr), net: Number(p.netto),
          });
        }
      }
    }
    return out;
  }, [invoices]);

  const totalGross = rows.reduce((a, r) => a + r.gross, 0);
  const totalMDR = rows.reduce((a, r) => a + r.mdr, 0);

  const exportCSV = () => {
    const csv = toCSV(rows, [
      { key: "invoice", label: "Invoice", get: (r) => r.invoice },
      { key: "date", label: "Tanggal", get: (r) => r.date },
      { key: "bank", label: "Bank", get: (r) => r.bank },
      { key: "metode", label: "Metode", get: (r) => r.metode },
      { key: "gross", label: "Gross", get: (r) => r.gross },
      { key: "mdr", label: "MDR", get: (r) => r.mdr },
      { key: "net", label: "Net", get: (r) => r.net },
    ]);
    downloadCSV(exportFileName("kartu", `${from}_${to}`), csv);
    toast.success(`Export ${rows.length} transaksi kartu`);
  };

  return (
    <div>
      <PageHeader title="Kartu EDC / QRIS" desc="Transaksi kartu/QRIS beserta MDR (Merchant Discount Rate)." />
      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4">
        <div className="grid gap-1.5"><Label className="text-xs">Dari</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
        <div className="grid gap-1.5"><Label className="text-xs">Sampai</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
      </div>

      <div className="mb-3 grid gap-3 sm:grid-cols-3">
        <Stat label="Gross" value={formatIDR(totalGross)} />
        <Stat label="MDR" value={formatIDR(totalMDR)} tone="rose" />
        <Stat label="Net" value={formatIDR(totalGross - totalMDR)} tone="emerald" />
      </div>

      <div className="mb-3 flex justify-end">
        <Button variant="outline" className="gap-1" onClick={exportCSV}><Download className="h-4 w-4" /> Export CSV</Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Invoice</TableHead><TableHead>Tanggal</TableHead><TableHead>Bank</TableHead><TableHead>Metode</TableHead>
            <TableHead className="text-right">Gross</TableHead><TableHead className="text-right">MDR</TableHead><TableHead className="text-right">Net</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {rows.slice(0, 200).map((r, i) => (
              <TableRow key={i}>
                <TableCell className="font-mono text-xs">{r.invoice}</TableCell>
                <TableCell className="text-xs">{new Date(r.date).toLocaleDateString("id-ID")}</TableCell>
                <TableCell><Badge variant="secondary">{r.bank}</Badge></TableCell>
                <TableCell><Badge variant={r.metode === "qris" ? "outline" : "default"}>{r.metode.toUpperCase()}</Badge></TableCell>
                <TableCell className="text-right font-mono text-xs">{formatIDR(r.gross)}</TableCell>
                <TableCell className="text-right font-mono text-xs text-rose-600">-{formatIDR(r.mdr)}</TableCell>
                <TableCell className="text-right font-mono text-xs text-emerald-600">{formatIDR(r.net)}</TableCell>
              </TableRow>
            ))}
            {!q.isLoading && rows.length === 0 && <TableRow><TableCell colSpan={7} className="py-16 text-center text-sm text-muted-foreground">Tidak ada transaksi EDC/QRIS pada periode ini.</TableCell></TableRow>}
            {q.isLoading && <TableRow><TableCell colSpan={7} className="py-16 text-center text-sm text-muted-foreground">Memuat…</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "emerald" | "rose" }) {
  const c = tone === "emerald" ? "text-emerald-600" : tone === "rose" ? "text-rose-600" : "";
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`mt-1 text-lg font-semibold ${c}`}>{value}</div>
    </div>
  );
}
