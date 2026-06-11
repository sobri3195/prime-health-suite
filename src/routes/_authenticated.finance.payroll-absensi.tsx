import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { downloadCSV, toCSV } from "@/lib/export";

export const Route = createFileRoute("/_authenticated/finance/payroll-absensi")({
  component: Page,
});

function Page() {
  const today = new Date().toISOString().slice(0, 10);
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const [from, setFrom] = useState(monthAgo);
  const [to, setTo] = useState(today);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    supabase
      .from("hr_attendance")
      .select("id, tanggal, status, clock_in, clock_out, total_jam_kerja, catatan, hr_employee(nama, jabatan)")
      .gte("tanggal", from)
      .lte("tanggal", to)
      .order("tanggal", { ascending: false })
      .limit(500)
      .then(({ data }) => {
        setRows(data ?? []);
        setLoading(false);
      });
  }, [from, to]);

  const exportCsv = () => {
    const csv = toCSV(rows, [
      { key: "tanggal", label: "Tanggal", get: (r) => r.tanggal },
      { key: "nama", label: "Karyawan", get: (r) => r.hr_employee?.nama ?? "-" },
      { key: "jabatan", label: "Jabatan", get: (r) => r.hr_employee?.jabatan ?? "-" },
      { key: "status", label: "Status", get: (r) => r.status },
      { key: "jam", label: "Jam Kerja", get: (r) => r.total_jam_kerja ?? "" },
    ]);
    downloadCSV(`absensi-${from}-${to}.csv`, csv);
  };

  return (
    <div>
      <PageHeader title="Absensi Karyawan" desc="Rekap kehadiran karyawan untuk perhitungan payroll." />
      <div className="mb-3 flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-3">
        <div className="grid gap-1.5"><Label className="text-xs">Dari</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 w-40" /></div>
        <div className="grid gap-1.5"><Label className="text-xs">Sampai</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9 w-40" /></div>
        <div className="ml-auto"><Button variant="outline" onClick={exportCsv} className="gap-1"><Download className="h-4 w-4" /> CSV</Button></div>
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Tanggal</TableHead><TableHead>Karyawan</TableHead><TableHead>Jabatan</TableHead>
            <TableHead>Status</TableHead><TableHead className="text-right">Jam Kerja</TableHead><TableHead>Catatan</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {loading ? <TableRow><TableCell colSpan={6} className="py-12 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></TableCell></TableRow>
              : rows.length === 0 ? <TableRow><TableCell colSpan={6} className="py-12 text-center text-sm text-muted-foreground">Belum ada absensi pada rentang ini.</TableCell></TableRow>
              : rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.tanggal}</TableCell>
                  <TableCell>{r.hr_employee?.nama ?? "-"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.hr_employee?.jabatan ?? "-"}</TableCell>
                  <TableCell><Badge variant="secondary" className={r.status === "hadir" ? "bg-emerald-500/15 text-emerald-700" : r.status === "izin" ? "bg-amber-500/15 text-amber-700" : "bg-rose-500/15 text-rose-700"}>{r.status}</Badge></TableCell>
                  <TableCell className="text-right font-mono">{r.total_jam_kerja ?? "-"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.catatan ?? ""}</TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
