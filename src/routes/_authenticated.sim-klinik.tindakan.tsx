import { pageHead } from "@/lib/page-head";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/app-shell";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Search } from "lucide-react";
import { formatIDR } from "@/lib/sync-log";

export const Route = createFileRoute("/_authenticated/sim-klinik/tindakan")({
  head: () => pageHead({ title: 'Tindakan & Billing — SIM Klinik', description: 'Daftar tindakan pasien dan status billing live dari Finance.', path: '/sim-klinik/tindakan' }),
  component: TindakanPage,
});

type TStatus = "planned" | "performed" | "cancelled";

interface ActionRow {
  id: string;
  no_invoice: string;
  tanggal: string;
  patient: string;
  layanan: string;
  qty: number;
  tarif: number;
  subtotal: number;
  status: TStatus;
}

function mapStatus(s: string | null): TStatus {
  if (s === "paid" || s === "posted") return "performed";
  if (s === "void" || s === "cancelled") return "cancelled";
  return "planned";
}

function TindakanPage() {
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | TStatus>("all");

  const { data = [], isLoading, error } = useQuery<ActionRow[]>({
    queryKey: ["sim-tindakan"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fin_invoice_item")
        .select("id,layanan_nama,tarif,qty,subtotal,created_at,invoice:fin_invoice!inner(no_invoice,tanggal,patient_name,status)")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []).map((r: any) => ({
        id: r.id,
        no_invoice: r.invoice?.no_invoice ?? "-",
        tanggal: r.invoice?.tanggal ?? r.created_at,
        patient: r.invoice?.patient_name ?? "-",
        layanan: r.layanan_nama,
        qty: r.qty ?? 1,
        tarif: Number(r.tarif ?? 0),
        subtotal: Number(r.subtotal ?? 0),
        status: mapStatus(r.invoice?.status ?? null),
      }));
    },
  });

  const filtered = useMemo(() => data.filter((r) => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (q && !`${r.no_invoice} ${r.layanan} ${r.patient}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  }), [data, q, statusFilter]);

  const totalRevenue = filtered.filter((r) => r.status === "performed").reduce((a, r) => a + r.subtotal, 0);

  return (
    <div>
      <PageHeader
        title="Tindakan Klinik Mata"
        desc="Transaksi tindakan/layanan yang tercatat pada invoice klinik."
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="text-xs text-muted-foreground">Total Tindakan</div>
          <div className="mt-1 text-2xl font-semibold">{filtered.length}</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="text-xs text-muted-foreground">Performed</div>
          <div className="mt-1 text-2xl font-semibold">{filtered.filter((r) => r.status === "performed").length}</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="text-xs text-muted-foreground">Revenue (Performed)</div>
          <div className="mt-1 text-2xl font-semibold">{formatIDR(totalRevenue)}</div>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari invoice / tindakan / pasien…" className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            <SelectItem value="planned">Planned</SelectItem>
            <SelectItem value="performed">Performed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tanggal</TableHead>
              <TableHead>No. Invoice</TableHead>
              <TableHead>Pasien</TableHead>
              <TableHead>Tindakan</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Tarif</TableHead>
              <TableHead className="text-right">Subtotal</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={8} className="py-12 text-center text-sm text-muted-foreground">Memuat tindakan…</TableCell></TableRow>
            ) : error ? (
              <TableRow><TableCell colSpan={8} className="py-12 text-center text-sm text-destructive">Gagal memuat data.</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="py-12 text-center text-sm text-muted-foreground">Belum ada tindakan tercatat. Buat invoice di Kasir & Billing.</TableCell></TableRow>
            ) : filtered.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="text-sm">{new Date(r.tanggal).toLocaleDateString("id-ID")}</TableCell>
                <TableCell className="font-mono text-xs">{r.no_invoice}</TableCell>
                <TableCell className="text-sm">{r.patient}</TableCell>
                <TableCell className="font-medium">{r.layanan}</TableCell>
                <TableCell className="text-right">{r.qty}</TableCell>
                <TableCell className="text-right font-mono text-sm">{formatIDR(r.tarif)}</TableCell>
                <TableCell className="text-right font-mono text-sm">{formatIDR(r.subtotal)}</TableCell>
                <TableCell><StatusBadge s={r.status} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function StatusBadge({ s }: { s: TStatus }) {
  if (s === "performed") return <Badge className="bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/20">Performed</Badge>;
  if (s === "cancelled") return <Badge variant="destructive">Cancelled</Badge>;
  return <Badge variant="secondary">Planned</Badge>;
}
