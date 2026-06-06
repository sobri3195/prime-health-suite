import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Search } from "lucide-react";
import { FinanceFilters, defaultFilter } from "@/components/finance-filters";
import { invoices } from "@/data/financeData";
import { applyFilter, formatIDR, statusBadgeClass, statusLabel } from "@/lib/finance";

export const Route = createFileRoute("/_authenticated/finance/pendapatan")({
  component: PendapatanPage,
});

const PAGE = 12;

function PendapatanPage() {
  const [filter, setFilter] = useState(defaultFilter);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);

  const doctors = useMemo(() => Array.from(new Set(invoices.map((i) => i.doctor))), []);
  const services = useMemo(() => Array.from(new Set(invoices.map((i) => i.category))), []);

  const filtered = useMemo(() => {
    const a = applyFilter(invoices, filter);
    return q
      ? a.filter((r) => `${r.invoice} ${r.patientCode} ${r.doctor} ${r.service}`.toLowerCase().includes(q.toLowerCase()))
      : a;
  }, [filter, q]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const safePage = Math.min(page, totalPages);
  const slice = filtered.slice((safePage - 1) * PAGE, safePage * PAGE);

  const total = filtered.reduce((a, r) => a + r.total, 0);
  const paid = filtered.reduce((a, r) => a + r.paid, 0);
  const outstanding = total - paid;

  return (
    <div>
      <PageHeader title="Pendapatan" desc="Daftar invoice ringkas yang masuk ke Finance dari klinik." />

      <FinanceFilters value={filter} onChange={(v) => { setFilter(v); setPage(1); }} doctors={doctors} services={services} />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Stat label="Total" value={formatIDR(total)} />
        <Stat label="Paid" value={formatIDR(paid)} tone="emerald" />
        <Stat label="Outstanding" value={formatIDR(outstanding)} tone="amber" />
      </div>

      <div className="mb-3 relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Cari invoice / patient code / dokter…" className="pl-9 max-w-md" />
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice</TableHead>
              <TableHead>Tanggal</TableHead>
              <TableHead>Patient Code</TableHead>
              <TableHead>Payer</TableHead>
              <TableHead>Dokter</TableHead>
              <TableHead>Tindakan</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Paid</TableHead>
              <TableHead className="text-right">Outstanding</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {slice.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="py-16 text-center text-sm text-muted-foreground">
                  Tidak ada data sesuai filter.
                </TableCell>
              </TableRow>
            ) : slice.map((r) => {
              const out = r.total - r.paid;
              return (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">{r.invoice}</TableCell>
                  <TableCell className="text-xs">{new Date(r.date).toLocaleDateString("id-ID")}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{r.patientCode}</TableCell>
                  <TableCell><Badge variant="secondary">{r.payer}</Badge></TableCell>
                  <TableCell className="text-sm">{r.doctor}</TableCell>
                  <TableCell className="text-sm">{r.service}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{formatIDR(r.total)}</TableCell>
                  <TableCell className="text-right font-mono text-sm text-emerald-600">{formatIDR(r.paid)}</TableCell>
                  <TableCell className="text-right font-mono text-sm text-amber-600">{formatIDR(out)}</TableCell>
                  <TableCell><span className={`rounded-full px-2 py-0.5 text-xs ${statusBadgeClass(r.status)}`}>{statusLabel(r.status)}</span></TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
        <span>Menampilkan {slice.length} dari {filtered.length} invoice</span>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" disabled={safePage <= 1} onClick={() => setPage((p) => p - 1)}>Prev</Button>
          <span>Hal. {safePage} / {totalPages}</span>
          <Button size="sm" variant="outline" disabled={safePage >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "emerald" | "amber" }) {
  const color = tone === "emerald" ? "text-emerald-600" : tone === "amber" ? "text-amber-600" : "";
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`mt-1 text-xl font-semibold ${color}`}>{value}</div>
    </div>
  );
}
