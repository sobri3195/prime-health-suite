import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2, Printer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

const search = z.object({ run: z.string().optional() });

export const Route = createFileRoute("/_authenticated/finance/payroll-slip")({
  validateSearch: search,
  component: Page,
});

const fmt = (n: number) => "Rp " + (Number(n) || 0).toLocaleString("id-ID");
const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

function Page() {
  const { run } = Route.useSearch();
  const [runs, setRuns] = useState<any[]>([]);
  const [selected, setSelected] = useState<string | undefined>(run);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.from("hr_payroll_run").select("id, periode_bulan, periode_tahun, status")
      .order("periode_tahun", { ascending: false }).order("periode_bulan", { ascending: false }).limit(24)
      .then(({ data }) => { setRuns(data ?? []); if (!selected && data?.length) setSelected(data[0].id); });
  }, []);

  useEffect(() => {
    if (!selected) return;
    setLoading(true);
    supabase.from("hr_payroll_item").select("*").eq("payroll_run_id", selected).order("nama_snapshot")
      .then(({ data }) => { setItems(data ?? []); setLoading(false); });
  }, [selected]);

  const curRun = runs.find((r) => r.id === selected);

  return (
    <div>
      <PageHeader title="Slip Gaji" desc="Slip gaji per karyawan untuk satu periode payroll." />
      <div className="mb-3 flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-3">
        <div className="grid gap-1.5">
          <span className="text-xs text-muted-foreground">Periode</span>
          <select className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={selected ?? ""} onChange={(e) => setSelected(e.target.value)}>
            {runs.map((r) => <option key={r.id} value={r.id}>{BULAN[r.periode_bulan - 1]} {r.periode_tahun} ({r.status})</option>)}
          </select>
        </div>
        <Button variant="outline" className="ml-auto gap-1" onClick={() => window.print()}><Printer className="h-4 w-4" /> Cetak</Button>
      </div>

      {curRun && (
        <div className="mb-3 rounded-xl border border-border bg-card p-4">
          <div className="text-sm text-muted-foreground">Periode</div>
          <div className="text-lg font-semibold">{BULAN[curRun.periode_bulan - 1]} {curRun.periode_tahun}</div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Karyawan</TableHead>
            <TableHead className="text-right">Gaji Pokok</TableHead>
            <TableHead className="text-right">Jam Lembur</TableHead>
            <TableHead className="text-right">Nominal Lembur</TableHead>
            <TableHead className="text-right">Potongan</TableHead>
            <TableHead className="text-right">Take Home</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {loading ? <TableRow><TableCell colSpan={6} className="py-12 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></TableCell></TableRow>
              : items.length === 0 ? <TableRow><TableCell colSpan={6} className="py-12 text-center text-sm text-muted-foreground">Belum ada slip untuk periode ini.</TableCell></TableRow>
              : items.map((it) => (
                <TableRow key={it.id}>
                  <TableCell className="font-semibold">{it.nama_snapshot}</TableCell>
                  <TableCell className="text-right font-mono">{fmt(it.gaji_pokok)}</TableCell>
                  <TableCell className="text-right font-mono">{it.total_jam_lembur}</TableCell>
                  <TableCell className="text-right font-mono">{fmt(it.nominal_lembur)}</TableCell>
                  <TableCell className="text-right font-mono text-rose-600">{fmt(it.potongan)}</TableCell>
                  <TableCell className="text-right font-mono font-semibold text-emerald-600">{fmt(it.take_home)}</TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
