import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/lib/page-head";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/app-shell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { listInvoices } from "@/lib/finance-pendapatan.functions";
import { formatIDR } from "@/lib/finance";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { downloadCSV, exportFileName, toCSV } from "@/lib/export";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/finance/pendapatan-ranking-dokter")({
  
  head: () => pageHead({ title: "Ranking Dokter — Finance", description: "Ranking Dokter pada modul keuangan klinik.", path: "/finance/pendapatan-ranking-dokter" }),
  component: Page,
});

type Inv = { total: number; fin_dokter: { name: string } | null };

function Page() {
  const today = new Date().toISOString().slice(0, 10);
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const [from, setFrom] = useState(monthAgo);
  const [to, setTo] = useState(today);

  const fn = useServerFn(listInvoices);
  const q = useQuery({ queryKey: ["fin-invoices", "ranking", from, to], queryFn: () => fn({ data: { from, to } }) });
  const rows = (q.data?.rows ?? []) as Inv[];

  const ranking = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of rows) {
      const name = r.fin_dokter?.name ?? "(Tanpa dokter)";
      map.set(name, (map.get(name) ?? 0) + Number(r.total));
    }
    return Array.from(map.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 20);
  }, [rows]);
  const max = ranking[0]?.value || 1;
  const total = ranking.reduce((a, r) => a + r.value, 0);

  const exportCSV = () => {
    const csv = toCSV(
      ranking.map((r, i) => ({ rank: i + 1, name: r.name, value: r.value, share: ((r.value / (total || 1)) * 100).toFixed(2) })),
      [
        { key: "rank", label: "Rank", get: (r) => r.rank },
        { key: "name", label: "Dokter", get: (r) => r.name },
        { key: "value", label: "Pendapatan", get: (r) => r.value },
        { key: "share", label: "Share (%)", get: (r) => r.share },
      ],
    );
    downloadCSV(exportFileName("ranking-dokter", `${from}_${to}`), csv);
    toast.success(`Export ${ranking.length} dokter`);
  };

  return (
    <div>
      <PageHeader title="Ranking Dokter" desc="Peringkat dokter berdasarkan total pendapatan periode (data real-time)." />
      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4">
        <div className="grid gap-1.5"><Label className="text-xs">Dari</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
        <div className="grid gap-1.5"><Label className="text-xs">Sampai</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
        <div className="ml-auto text-sm text-muted-foreground">Total {ranking.length} dokter · {formatIDR(total)}</div>
        <Button variant="outline" className="gap-1" onClick={exportCSV}><Download className="h-4 w-4" /> Export CSV</Button>
      </div>

      <div className="space-y-2 rounded-xl border border-border bg-card p-5">
        {ranking.map((r, i) => (
          <div key={r.name} className="flex items-center gap-3">
            <span className="w-6 text-right text-xs font-mono text-muted-foreground">#{i + 1}</span>
            <span className="w-40 truncate text-sm">{r.name}</span>
            <div className="relative h-6 flex-1 overflow-hidden rounded bg-muted">
              <div className="absolute inset-y-0 left-0 bg-[var(--gradient-hero)]" style={{ width: `${(r.value / max) * 100}%` }} />
            </div>
            <span className="w-32 text-right font-mono text-xs">{formatIDR(r.value)}</span>
            <span className="w-14 text-right text-xs text-muted-foreground">{((r.value / (total || 1)) * 100).toFixed(1)}%</span>
          </div>
        ))}
        {!q.isLoading && ranking.length === 0 && <div className="py-12 text-center text-sm text-muted-foreground">Belum ada invoice di periode ini.</div>}
        {q.isLoading && <div className="py-12 text-center text-sm text-muted-foreground">Memuat…</div>}
      </div>
    </div>
  );
}
