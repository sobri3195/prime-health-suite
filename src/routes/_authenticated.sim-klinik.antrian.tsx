import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/lib/page-head";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { PageHeader } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PhoneCall, PlayCircle, CheckCircle2, RefreshCw, SkipForward, Timer } from "lucide-react";
import { toast } from "sonner";
import { listQueueToday, updateQueueStatus } from "@/lib/klinik.functions";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useRealtimeSubscription } from "@/hooks/use-realtime-subscription";

export const Route = createFileRoute("/_authenticated/sim-klinik/antrian")({
  head: () => pageHead({ title: 'Antrian Pasien — SIM Klinik', description: 'Monitoring antrian pasien harian dan waktu tunggu.', path: '/sim-klinik/antrian' }),
  component: AntrianPage,
});

const STATUS_LABEL: Record<string, string> = { waiting: "Menunggu", called: "Dipanggil", in_service: "Dilayani", done: "Selesai", cancelled: "Batal" };

function AntrianPage() {
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);
  const callList = useServerFn(listQueueToday);
  const callUpd = useServerFn(updateQueueStatus);

  const [date, setDate] = useState(today);
  const [status, setStatus] = useState<string>("all");
  const [display, setDisplay] = useState(false);

  const listQ = useQuery({
    queryKey: ["klinik","queue",date,status],
    queryFn: () => callList({ data: { date, status: status === "all" ? undefined : status } }),
    refetchInterval: 15000,
  });
  useRealtimeSubscription(["klinik_queue", "klinik_visit"], [["klinik", "queue", date, status]]);

  const updM = useMutation({
    mutationFn: (v: { id: string; status: "waiting"|"called"|"in_service"|"done"|"cancelled" }) => callUpd({ data: v }),
    onSuccess: (_d, v) => { toast.success(`Antrian → ${STATUS_LABEL[v.status]}`); qc.invalidateQueries({ queryKey: ["klinik"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  type Row = { id: string; queue_no: string; status: string; counter: string; called_at: string | null; served_at: string | null; done_at: string | null; created_at: string; apps_pasien?: { no_rm: string; nama: string }; fin_dokter?: { name: string }; klinik_visit?: { chief_complaint: string | null } };
  const rows = (listQ.data ?? []) as Row[];

  const waiting = rows.filter((r) => r.status === "waiting");
  const now = rows.find((r) => r.status === "in_service" || r.status === "called");

  // Rata-rata waktu tunggu: selisih created_at → called_at untuk antrian yang sudah dipanggil hari ini.
  const waitDurations = rows
    .filter((r) => r.called_at)
    .map((r) => (new Date(r.called_at!).getTime() - new Date(r.created_at).getTime()) / 60000)
    .filter((m) => m >= 0 && m < 600);
  const avgWait = waitDurations.length ? Math.round(waitDurations.reduce((a, b) => a + b, 0) / waitDurations.length) : null;

  if (display) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background p-8">
        <Button variant="ghost" className="absolute right-4 top-4" onClick={() => setDisplay(false)}>Tutup Display</Button>
        <h2 className="text-3xl font-light text-muted-foreground">Sedang Dilayani</h2>
        <div className="my-8 text-9xl font-bold tabular-nums">{now?.queue_no ?? "—"}</div>
        <div className="text-2xl">{now?.apps_pasien?.nama ?? ""}</div>
        <div className="mt-2 text-lg text-muted-foreground">{now?.fin_dokter?.name ?? ""}</div>
        <div className="mt-12 w-full max-w-4xl">
          <div className="mb-2 text-sm text-muted-foreground">Antrian Berikutnya</div>
          <div className="grid grid-cols-4 gap-3">
            {waiting.slice(0, 8).map((r) => (
              <div key={r.id} className="rounded-md border p-3 text-center">
                <div className="text-2xl font-bold">{r.queue_no}</div>
                <div className="truncate text-xs">{r.apps_pasien?.nama}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Antrian Klinik" desc="Manajemen antrian harian — auto-refresh tiap 15 detik + realtime update." />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-auto" />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            {Object.entries(STATUS_LABEL).map(([k,v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={() => setDisplay(true)}>Mode Display</Button>
        <div className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Timer className="h-3.5 w-3.5" />Rata-rata tunggu: <span className="font-semibold text-foreground">{avgWait !== null ? `${avgWait} mnt` : "—"}</span></span>
          <span>Menunggu: <span className="font-semibold text-foreground">{waiting.length}</span></span>
          <span>Total {rows.length}</span>
        </div>
      </div>

      <div className="grid gap-3">
        {rows.length === 0 ? <Card className="p-8 text-center text-sm text-muted-foreground">Belum ada antrian.</Card>
          : rows.map((r) => (
            <Card key={r.id} className="flex items-center gap-3 p-3">
              <div className="w-20 rounded-md bg-primary/10 px-3 py-2 text-center">
                <div className="text-2xl font-bold tabular-nums">{r.queue_no}</div>
                <div className="text-[10px] text-muted-foreground">Loket {r.counter}</div>
              </div>
              <div className="flex-1">
                <div className="font-medium">{r.apps_pasien?.nama ?? "-"}</div>
                <div className="text-xs text-muted-foreground">{r.apps_pasien?.no_rm} • {r.fin_dokter?.name ?? "-"}</div>
                {r.klinik_visit?.chief_complaint && <div className="mt-1 text-xs italic">"{r.klinik_visit.chief_complaint}"</div>}
              </div>
              <Badge variant={r.status === "in_service" ? "default" : r.status === "done" ? "outline" : "secondary"}>{STATUS_LABEL[r.status]}</Badge>
              <div className="flex flex-wrap gap-1">
                {r.status === "waiting" && <Button size="sm" onClick={() => updM.mutate({ id: r.id, status: "called" })}><PhoneCall className="mr-1 h-3 w-3" />Panggil</Button>}
                {r.status === "called" && <>
                  <Button size="sm" onClick={() => updM.mutate({ id: r.id, status: "in_service" })}><PlayCircle className="mr-1 h-3 w-3" />Mulai</Button>
                  <Button size="sm" variant="outline" onClick={() => updM.mutate({ id: r.id, status: "called" })} title="Panggil ulang"><RefreshCw className="h-3 w-3" /></Button>
                </>}
                {r.status === "in_service" && <Button size="sm" onClick={() => updM.mutate({ id: r.id, status: "done" })}><CheckCircle2 className="mr-1 h-3 w-3" />Selesai</Button>}
                {(r.status === "waiting" || r.status === "called") && (
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => {
                    if (confirm(`Skip antrian ${r.queue_no} (${r.apps_pasien?.nama ?? "-"})? Antrian ini akan dibatalkan.`)) {
                      updM.mutate({ id: r.id, status: "cancelled" });
                    }
                  }} title="Skip / batalkan"><SkipForward className="h-3 w-3" /></Button>
                )}
              </div>
            </Card>
          ))}
      </div>
    </div>
  );
}
