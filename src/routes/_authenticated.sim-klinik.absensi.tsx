import { createFileRoute, Link } from "@tanstack/react-router";
import { pageHead } from "@/lib/page-head";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Clock, LogIn, LogOut, Timer } from "lucide-react";
import { SkeletonList, EmptyState } from "@/components/apps/ui";
import { ExportBar, defaultRange, type DateRange } from "@/components/export-bar";
import { exportCsv, exportPdf, type Column } from "@/lib/exporter";
import {
  clockIn, clockOut, getMyEmployee, listMyAttendance, listShift,
} from "@/lib/hr.functions";
import { clinicAudit } from "@/lib/clinic-audit";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/sim-klinik/absensi")({
  head: () => pageHead({ title: 'Absensi Karyawan — SIM Klinik', description: 'Rekap kehadiran, shift, dan jam kerja karyawan klinik.', path: '/sim-klinik/absensi' }),
  component: AbsensiPage,
});

type AttRow = {
  id: string; tanggal: string; clock_in: string | null; clock_out: string | null;
  total_jam_kerja: number | null; status: string; shift_id: string | null;
};

function AbsensiPage() {
  const qc = useQueryClient();
  const [now, setNow] = useState(new Date());
  const [range, setRange] = useState<DateRange>(() => defaultRange(30));

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const emp = useQuery({ queryKey: ["hr.me"], queryFn: () => getMyEmployee() });
  const shifts = useQuery({ queryKey: ["hr.shifts"], queryFn: () => listShift() });
  const att = useQuery({
    queryKey: ["hr.att", range],
    queryFn: () => listMyAttendance({ data: range }),
  });

  const today = new Date().toISOString().slice(0, 10);
  const todayRow = (att.data ?? []).find((r: AttRow) => r.tanggal === today) ?? null;

  const mIn = useMutation({
    mutationFn: () => clockIn({ data: {} }),
    onSuccess: () => {
      toast.success("Clock-in tercatat");
      clinicAudit("Absensi", "clock_in");
      qc.invalidateQueries({ queryKey: ["hr.att"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const mOut = useMutation({
    mutationFn: () => clockOut(),
    onSuccess: () => {
      toast.success("Clock-out tercatat");
      clinicAudit("Absensi", "clock_out");
      qc.invalidateQueries({ queryKey: ["hr.att"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const columns: Column<AttRow>[] = useMemo(() => [
    { key: "tanggal", header: "Tanggal" },
    { key: "clock_in", header: "Masuk", format: (r) => r.clock_in ? new Date(r.clock_in).toLocaleTimeString("id-ID") : "—" },
    { key: "clock_out", header: "Keluar", format: (r) => r.clock_out ? new Date(r.clock_out).toLocaleTimeString("id-ID") : "—" },
    { key: "total_jam_kerja", header: "Total Jam", format: (r) => r.total_jam_kerja ? Number(r.total_jam_kerja).toFixed(2) : "—" },
    { key: "status", header: "Status" },
  ], []);

  const shiftMap = useMemo(() => {
    const m = new Map<string, { nama: string; jam_selesai: string }>();
    (shifts.data ?? []).forEach((s: { id: string; nama: string; jam_selesai: string }) => m.set(s.id, s));
    return m;
  }, [shifts.data]);

  // Hitung jam ekstra hari ini → CTA Lembur
  let extraHours = 0;
  if (todayRow?.clock_out && todayRow?.shift_id) {
    const sh = shiftMap.get(todayRow.shift_id);
    if (sh) {
      const [sh_h, sh_m] = sh.jam_selesai.split(":").map(Number);
      const end = new Date(todayRow.clock_out);
      const shiftEnd = new Date(end);
      shiftEnd.setHours(sh_h, sh_m, 0, 0);
      extraHours = Math.max(0, +((end.getTime() - shiftEnd.getTime()) / 3_600_000).toFixed(2));
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Absensi" desc="Catat kehadiran harian Anda. Lembur otomatis ter-deteksi dari shift." />

      {/* Clock card */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-6 md:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Sekarang</div>
              <div className="mt-1 text-4xl font-semibold tabular-nums">
                {now.toLocaleTimeString("id-ID")}
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                {now.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </div>
            </div>
            <Clock className="h-12 w-12 text-cyan-accent" />
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button
              size="lg"
              className="gap-2"
              disabled={!!todayRow?.clock_in || mIn.isPending}
              onClick={() => mIn.mutate()}
            >
              <LogIn className="h-4 w-4" /> Clock-in
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="gap-2"
              disabled={!todayRow?.clock_in || !!todayRow?.clock_out || mOut.isPending}
              onClick={() => mOut.mutate()}
            >
              <LogOut className="h-4 w-4" /> Clock-out
            </Button>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Hari ini</div>
          <div className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Masuk</span>
              <span className="tabular-nums">{todayRow?.clock_in ? new Date(todayRow.clock_in).toLocaleTimeString("id-ID") : "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Keluar</span>
              <span className="tabular-nums">{todayRow?.clock_out ? new Date(todayRow.clock_out).toLocaleTimeString("id-ID") : "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total jam</span>
              <span className="tabular-nums">{todayRow?.total_jam_kerja ? Number(todayRow.total_jam_kerja).toFixed(2) : "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Karyawan</span>
              <span>{emp.data?.nama ?? "—"}</span>
            </div>
          </div>
          {extraHours >= 0.5 && (
            <div className="mt-4 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs">
              <div className="mb-2 flex items-center gap-2"><Timer className="h-4 w-4 text-amber-500" /> Lembur ~{extraHours.toFixed(2)} jam terdeteksi.</div>
              <Button asChild size="sm" variant="outline">
                <Link
                  to="/sim-klinik/lembur"
                  search={{
                    prefill: "1",
                    tanggal: today,
                    durasi: String(extraHours),
                    attendance_id: todayRow!.id,
                  } as never}
                >Ajukan Lembur</Link>
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* History */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-semibold">Riwayat Absensi</h3>
          <ExportBar
            range={range}
            onRange={setRange}
            onCsv={() => exportCsv("absensi.csv", columns, att.data ?? [], range)}
            onPdf={() => exportPdf("absensi.pdf", "Riwayat Absensi", columns, att.data ?? [], range)}
          />
        </div>
        {att.isLoading ? (
          <SkeletonList rows={4} />
        ) : (att.data ?? []).length === 0 ? (
          <EmptyState title="Belum ada absensi" hint="Mulai dengan Clock-in di atas." />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map((c) => <TableHead key={String(c.key)}>{c.header}</TableHead>)}
                </TableRow>
              </TableHeader>
              <TableBody>
                {(att.data as AttRow[]).map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.tanggal}</TableCell>
                    <TableCell className="tabular-nums">{r.clock_in ? new Date(r.clock_in).toLocaleTimeString("id-ID") : "—"}</TableCell>
                    <TableCell className="tabular-nums">{r.clock_out ? new Date(r.clock_out).toLocaleTimeString("id-ID") : "—"}</TableCell>
                    <TableCell className="tabular-nums">{r.total_jam_kerja ? Number(r.total_jam_kerja).toFixed(2) : "—"}</TableCell>
                    <TableCell><Badge variant="outline">{r.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
