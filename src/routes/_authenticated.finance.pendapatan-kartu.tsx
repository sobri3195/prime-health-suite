import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { FinanceFilters, defaultFilter } from "@/components/finance-filters";
import { invoices } from "@/data/financeData";
import { applyFilter, formatIDR } from "@/lib/finance";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { downloadCSV, exportFileName, toCSV } from "@/lib/export";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/finance/pendapatan-kartu")({
  component: Page,
});

const BANKS = ["BCA", "Mandiri", "BNI", "BRI"];
const CARD_TYPES = ["Debit", "Kredit"] as const;

function Page() {
  const [filter, setFilter] = useState(defaultFilter);
  const doctors = useMemo(() => Array.from(new Set(invoices.map((r) => r.doctor))), []);
  const services = useMemo(() => Array.from(new Set(invoices.map((r) => r.category))), []);

  const rows = applyFilter(invoices, filter)
    .filter((r) => r.payer === "Umum")
    .map((r, i) => ({
      ...r,
      bank: BANKS[i % BANKS.length],
      cardType: CARD_TYPES[i % CARD_TYPES.length],
      mdr: r.payer === "Umum" ? Math.round(r.total * (i % 2 === 0 ? 0.012 : 0.018)) : 0,
    }));

  const totalMDR = rows.reduce((a, r) => a + r.mdr, 0);
  const totalGross = rows.reduce((a, r) => a + r.total, 0);

  const exportCSV = () => {
    const csv = toCSV(rows, [
      { key: "invoice", label: "Invoice", get: (r) => r.invoice },
      { key: "date", label: "Tanggal", get: (r) => new Date(r.date).toLocaleDateString("id-ID") },
      { key: "bank", label: "Bank", get: (r) => r.bank },
      { key: "cardType", label: "Tipe", get: (r) => r.cardType },
      { key: "gross", label: "Gross", get: (r) => r.total },
      { key: "mdr", label: "MDR", get: (r) => r.mdr },
      { key: "net", label: "Net", get: (r) => r.total - r.mdr },
    ]);
    downloadCSV(exportFileName("kartu", filter.period), csv);
    toast.success(`Export ${rows.length} transaksi kartu`);
  };

  return (
    <div>
      <PageHeader title="Kartu Debit/Kredit" desc="Transaksi kartu beserta MDR (Merchant Discount Rate)." />
      <FinanceFilters value={filter} onChange={setFilter} doctors={doctors} services={services} />

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
            <TableHead>Invoice</TableHead><TableHead>Tanggal</TableHead><TableHead>Bank</TableHead><TableHead>Tipe</TableHead>
            <TableHead className="text-right">Gross</TableHead><TableHead className="text-right">MDR</TableHead><TableHead className="text-right">Net</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {rows.slice(0, 50).map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-xs">{r.invoice}</TableCell>
                <TableCell className="text-xs">{new Date(r.date).toLocaleDateString("id-ID")}</TableCell>
                <TableCell><Badge variant="secondary">{r.bank}</Badge></TableCell>
                <TableCell><Badge variant={r.cardType === "Kredit" ? "default" : "outline"}>{r.cardType}</Badge></TableCell>
                <TableCell className="text-right font-mono text-xs">{formatIDR(r.total)}</TableCell>
                <TableCell className="text-right font-mono text-xs text-rose-600">-{formatIDR(r.mdr)}</TableCell>
                <TableCell className="text-right font-mono text-xs text-emerald-600">{formatIDR(r.total - r.mdr)}</TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && <TableRow><TableCell colSpan={7} className="py-16 text-center text-sm text-muted-foreground">Tidak ada transaksi kartu.</TableCell></TableRow>}
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
