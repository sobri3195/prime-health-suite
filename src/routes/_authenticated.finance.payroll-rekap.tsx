import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/finance/payroll-rekap")({
  component: Page,
});

const fmt = (n: number) => "Rp " + (Number(n) || 0).toLocaleString("id-ID");
const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

function Page() {
  const [runs, setRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("hr_payroll_run")
      .select("*")
      .order("periode_tahun", { ascending: false })
      .order("periode_bulan", { ascending: false })
      .limit(50)
      .then(({ data }) => { setRuns(data ?? []); setLoading(false); });
  }, []);

  const totalTh = runs.reduce((a, r) => a + Number(r.total_take_home || 0), 0);

  return (
    <div>
      <PageHeader title="Rekap Gaji Bulanan" desc="Daftar payroll run per periode. Klik untuk melihat slip per karyawan." />
      <div className="mb-3 grid gap-3 md:grid-cols-3">
        <Kpi label="Jumlah Run" value={String(runs.length)} />
        <Kpi label="Run Final" value={String(runs.filter((r) => r.status === "final").length)} />
        <Kpi label="Total Take-Home" value={fmt(totalTh)} />
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Periode</TableHead><TableHead>Status</TableHead>
            <TableHead className="text-right">Gaji Pokok</TableHead><TableHead className="text-right">Lembur</TableHead>
            <TableHead className="text-right">Take Home</TableHead><TableHead className="w-32" />
          </TableRow></TableHeader>
          <TableBody>
            {loading ? <TableRow><TableCell colSpan={6} className="py-12 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></TableCell></TableRow>
              : runs.length === 0 ? <TableRow><TableCell colSpan={6} className="py-12 text-center text-sm text-muted-foreground">Belum ada payroll run.</TableCell></TableRow>
              : runs.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-semibold">{BULAN[r.periode_bulan - 1]} {r.periode_tahun}</TableCell>
                  <TableCell><Badge variant="secondary" className={r.status === "final" ? "bg-emerald-500/15 text-emerald-700" : "bg-muted text-muted-foreground"}>{r.status}</Badge></TableCell>
                  <TableCell className="text-right font-mono">{fmt(r.total_gaji)}</TableCell>
                  <TableCell className="text-right font-mono">{fmt(r.total_lembur)}</TableCell>
                  <TableCell className="text-right font-mono font-semibold">{fmt(r.total_take_home)}</TableCell>
                  <TableCell><Button asChild variant="ghost" size="sm" className="gap-1"><Link to="/finance/payroll-slip" search={{ run: r.id }}><FileText className="h-3.5 w-3.5" /> Slip</Link></Button></TableCell>
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
