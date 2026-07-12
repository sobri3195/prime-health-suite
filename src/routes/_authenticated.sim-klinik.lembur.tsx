import { createFileRoute, useSearch } from "@tanstack/react-router";
import { pageHead } from "@/lib/page-head";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Tabs, TabsList, TabsTrigger, TabsContent,
} from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Coins, Timer, CheckCircle2, XCircle } from "lucide-react";
import { SkeletonList, EmptyState } from "@/components/apps/ui";
import {
  getMyEmployee, listMyOvertime, listPendingOvertime, requestOvertime, approveOvertime,
} from "@/lib/hr.functions";
import { useRoles, hasAnyRole } from "@/lib/rbac";
import { clinicAudit } from "@/lib/clinic-audit";
import { toast } from "sonner";
import { friendlyError } from "@/lib/apps-error";

type LemburSearch = {
  prefill?: string;
  tanggal?: string;
  durasi?: string;
  attendance_id?: string;
};

export const Route = createFileRoute("/_authenticated/sim-klinik/lembur")({
  head: () => pageHead({ title: 'Lembur Karyawan — SIM Klinik', description: 'Pengajuan lembur, persetujuan, dan integrasi payroll.', path: '/sim-klinik/lembur' }),
  validateSearch: (s: Record<string, unknown>): LemburSearch => ({
    prefill: typeof s.prefill === "string" ? s.prefill : undefined,
    tanggal: typeof s.tanggal === "string" ? s.tanggal : undefined,
    durasi: typeof s.durasi === "string" ? s.durasi : undefined,
    attendance_id: typeof s.attendance_id === "string" ? s.attendance_id : undefined,
  }),
  component: LemburPage,
});

type OvertimeRow = {
  id: string; tanggal: string; jam_mulai: string; jam_selesai: string;
  durasi_jam: number; mode: "uang" | "jam"; nominal: number | null;
  status: "pending" | "approved" | "rejected" | "cancelled";
  alasan?: string | null;
  approval_note?: string | null;
  hr_employee?: { nama: string; jabatan: string | null } | null;
};

function fmtIDR(n: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
}

function LemburPage() {
  const qc = useQueryClient();
  const search = useSearch({ from: "/_authenticated/sim-klinik/lembur" });
  const { data: roles } = useRoles({ enabled: true });
  const isApprover = hasAnyRole(roles, ["super_admin"]);

  const emp = useQuery({ queryKey: ["hr.me"], queryFn: () => getMyEmployee() });
  const mine = useQuery({ queryKey: ["hr.ot.mine"], queryFn: () => listMyOvertime({ data: {} }) });
  const pending = useQuery({
    queryKey: ["hr.ot.pending"],
    queryFn: () => listPendingOvertime(),
    enabled: isApprover,
  });

  // Form state
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    tanggal: today,
    jam_mulai: "16:00",
    jam_selesai: "18:00",
    durasi_jam: 2,
    mode: "uang" as "uang" | "jam",
    alasan: "",
    attendance_id: undefined as string | undefined,
  });

  useEffect(() => {
    if (search.prefill === "1") {
      setForm((f) => ({
        ...f,
        tanggal: search.tanggal ?? f.tanggal,
        durasi_jam: search.durasi ? Number(search.durasi) : f.durasi_jam,
        attendance_id: search.attendance_id,
      }));
    }
  }, [search]);

  // Auto-update durasi when jam_mulai/jam_selesai change
  useEffect(() => {
    const [h1, m1] = form.jam_mulai.split(":").map(Number);
    const [h2, m2] = form.jam_selesai.split(":").map(Number);
    let mins = (h2 * 60 + m2) - (h1 * 60 + m1);
    if (mins < 0) mins += 24 * 60;
    setForm((f) => ({ ...f, durasi_jam: +(mins / 60).toFixed(2) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.jam_mulai, form.jam_selesai]);

  const tarif = useMemo(() => {
    const gaji = Number(emp.data?.gaji_pokok ?? 0);
    const override = emp.data?.tarif_lembur_per_jam ? Number(emp.data.tarif_lembur_per_jam) : 0;
    if (override > 0) return override;
    return gaji > 0 ? +((gaji / 173) * 1.5).toFixed(2) : 0;
  }, [emp.data]);

  const preview = form.mode === "uang"
    ? fmtIDR(tarif * form.durasi_jam)
    : `+${form.durasi_jam.toFixed(2)} jam ke saldo cuti`;

  const mReq = useMutation({
    mutationFn: () => requestOvertime({ data: { ...form } }),
    onSuccess: () => {
      toast.success("Pengajuan lembur terkirim");
      clinicAudit("Lembur", "request", undefined, { durasi: form.durasi_jam, mode: form.mode });
      qc.invalidateQueries({ queryKey: ["hr.ot.mine"] });
      qc.invalidateQueries({ queryKey: ["hr.ot.pending"] });
    },
    onError: (e: Error) => toast.error(friendlyError(e)),
  });

  const mApprove = useMutation({
    mutationFn: (vars: { id: string; decision: "approved" | "rejected" }) =>
      approveOvertime({ data: vars }),
    onSuccess: (_d, v) => {
      toast.success(v.decision === "approved" ? "Pengajuan disetujui" : "Pengajuan ditolak");
      clinicAudit("Lembur", v.decision, v.id);
      qc.invalidateQueries({ queryKey: ["hr.ot.pending"] });
      qc.invalidateQueries({ queryKey: ["hr.ot.mine"] });
    },
    onError: (e: Error) => toast.error(friendlyError(e)),
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Lembur" desc="Ajukan lembur dan pilih konversi: uang atau tambah jam cuti." />

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Form */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="mb-4 text-sm font-semibold">Pengajuan Lembur</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1">
              <Label>Tanggal</Label>
              <Input type="date" value={form.tanggal} onChange={(e) => setForm((f) => ({ ...f, tanggal: e.target.value }))} />
            </div>
            <div className="grid gap-1">
              <Label>Durasi (jam)</Label>
              <Input type="number" step="0.25" min={0.25} max={12} value={form.durasi_jam}
                onChange={(e) => setForm((f) => ({ ...f, durasi_jam: Number(e.target.value) }))} />
            </div>
            <div className="grid gap-1">
              <Label>Jam mulai</Label>
              <Input type="time" value={form.jam_mulai} onChange={(e) => setForm((f) => ({ ...f, jam_mulai: e.target.value }))} />
            </div>
            <div className="grid gap-1">
              <Label>Jam selesai</Label>
              <Input type="time" value={form.jam_selesai} onChange={(e) => setForm((f) => ({ ...f, jam_selesai: e.target.value }))} />
            </div>
            <div className="grid gap-1 sm:col-span-2">
              <Label>Alasan</Label>
              <Textarea rows={2} value={form.alasan} maxLength={500}
                onChange={(e) => setForm((f) => ({ ...f, alasan: e.target.value }))}
                placeholder="Contoh: menyelesaikan rekap pasien hari ini" />
            </div>
            <div className="sm:col-span-2">
              <Label className="mb-2 block">Konversi ke</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, mode: "uang" }))}
                  className={`rounded-xl border p-3 text-left transition ${form.mode === "uang" ? "border-cyan-accent bg-cyan-accent/10" : "border-border bg-background"}`}
                >
                  <div className="flex items-center gap-2 text-sm font-medium"><Coins className="h-4 w-4" /> Uang</div>
                  <div className="mt-1 text-xs text-muted-foreground">Masuk payroll bulan ini.</div>
                </button>
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, mode: "jam" }))}
                  className={`rounded-xl border p-3 text-left transition ${form.mode === "jam" ? "border-cyan-accent bg-cyan-accent/10" : "border-border bg-background"}`}
                >
                  <div className="flex items-center gap-2 text-sm font-medium"><Timer className="h-4 w-4" /> Jam Cuti</div>
                  <div className="mt-1 text-xs text-muted-foreground">Disimpan sebagai saldo jam.</div>
                </button>
              </div>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between rounded-xl bg-muted/40 px-4 py-3">
            <div className="text-xs text-muted-foreground">Estimasi</div>
            <div className="text-sm font-semibold">{preview}</div>
          </div>
          <Button className="mt-4 w-full" disabled={mReq.isPending} onClick={() => mReq.mutate()}>
            Ajukan
          </Button>
          <div className="mt-2 text-[11px] text-muted-foreground">
            Tarif/jam: {fmtIDR(tarif)} • Saldo jam Anda: {Number(emp.data?.saldo_jam_lembur ?? 0).toFixed(2)} jam
          </div>
        </div>

        {/* My list & approval */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <Tabs defaultValue="mine">
            <TabsList>
              <TabsTrigger value="mine">Pengajuan Saya</TabsTrigger>
              {isApprover && <TabsTrigger value="approval">Inbox Approval</TabsTrigger>}
            </TabsList>
            <TabsContent value="mine" className="mt-4">
              {mine.isLoading ? <SkeletonList rows={3} />
                : (mine.data ?? []).length === 0
                ? <EmptyState title="Belum ada pengajuan lembur" />
                : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader><TableRow>
                        <TableHead>Tanggal</TableHead><TableHead>Jam</TableHead>
                        <TableHead>Mode</TableHead><TableHead>Nilai</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow></TableHeader>
                      <TableBody>
                        {(mine.data as OvertimeRow[]).map((r) => (
                          <TableRow key={r.id}>
                            <TableCell>{r.tanggal}</TableCell>
                            <TableCell className="tabular-nums">{r.jam_mulai}–{r.jam_selesai} ({Number(r.durasi_jam).toFixed(2)}j)</TableCell>
                            <TableCell><Badge variant="outline">{r.mode}</Badge></TableCell>
                            <TableCell className="tabular-nums">{r.mode === "uang" ? fmtIDR(Number(r.nominal ?? 0)) : `${Number(r.durasi_jam).toFixed(2)} jam`}</TableCell>
                            <TableCell><StatusBadge s={r.status} /></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
            </TabsContent>
            {isApprover && (
              <TabsContent value="approval" className="mt-4">
                {pending.isLoading ? <SkeletonList rows={3} />
                  : (pending.data ?? []).length === 0
                  ? <EmptyState title="Tidak ada pengajuan menunggu" />
                  : (
                    <div className="space-y-3">
                      {(pending.data as OvertimeRow[]).map((r) => (
                        <div key={r.id} className="rounded-xl border border-border bg-background p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="text-sm font-medium">{r.hr_employee?.nama ?? "Karyawan"}</div>
                              <div className="text-xs text-muted-foreground">{r.tanggal} • {r.jam_mulai}–{r.jam_selesai} • {Number(r.durasi_jam).toFixed(2)} jam</div>
                              <div className="mt-1 text-xs">Mode: <b>{r.mode}</b> {r.mode === "uang" ? `• ${fmtIDR(Number(r.nominal ?? 0))}` : ""}</div>
                              {r.alasan && <div className="mt-1 text-xs italic text-muted-foreground">"{r.alasan}"</div>}
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" className="gap-1" disabled={mApprove.isPending}
                                onClick={() => mApprove.mutate({ id: r.id, decision: "rejected" })}>
                                <XCircle className="h-4 w-4" /> Tolak
                              </Button>
                              <Button size="sm" className="gap-1" disabled={mApprove.isPending}
                                onClick={() => mApprove.mutate({ id: r.id, decision: "approved" })}>
                                <CheckCircle2 className="h-4 w-4" /> Setujui
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
              </TabsContent>
            )}
          </Tabs>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ s }: { s: OvertimeRow["status"] }) {
  const map = {
    pending: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    approved: "bg-emerald-accent/15 text-emerald-accent",
    rejected: "bg-destructive/15 text-destructive",
    cancelled: "bg-muted text-muted-foreground",
  } as const;
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${map[s]}`}>{s}</span>;
}
