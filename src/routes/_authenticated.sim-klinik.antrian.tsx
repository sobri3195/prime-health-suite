import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/lib/page-head";
import { useEffect, useRef, useState } from "react";
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
import { friendlyError } from "@/lib/apps-error";

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
  const [skipTarget, setSkipTarget] = useState<{ id: string; queue_no: string; nama: string } | null>(null);
  const [search, setSearch] = useState("");

  const listQ = useQuery({
    queryKey: ["klinik","queue",date,status],
    queryFn: () => callList({ data: { date, status: status === "all" ? undefined : status } }),
    refetchInterval: 15000,
  });
  useRealtimeSubscription(["klinik_queue", "klinik_visit"], [["klinik", "queue", date, status]]);

  const updM = useMutation({
    mutationFn: (v: { id: string; status: "waiting"|"called"|"in_service"|"done"|"cancelled" }) => callUpd({ data: v }),
    onSuccess: (_d, v) => { toast.success(`Antrian → ${STATUS_LABEL[v.status]}`); qc.invalidateQueries({ queryKey: ["klinik"] }); },
    onError: (e: Error) => toast.error(friendlyError(e)),
  });

  type Row = { id: string; queue_no: string; status: string; counter: string; called_at: string | null; served_at: string | null; done_at: string | null; created_at: string; apps_pasien?: { no_rm: string; nama: string }; fin_dokter?: { name: string }; klinik_visit?: { chief_complaint: string | null } };
  const allRows = (listQ.data ?? []) as Row[];
  const sTerm = search.trim().toLowerCase();
  const rows = sTerm ? allRows.filter((r) => r.queue_no.toLowerCase().includes(sTerm) || (r.apps_pasien?.nama ?? "").toLowerCase().includes(sTerm) || (r.apps_pasien?.no_rm ?? "").toLowerCase().includes(sTerm)) : allRows;

  const waiting = rows.filter((r) => r.status === "waiting");
  // Now-serving per loket: prefer in_service, fallback to called, per counter.
  // Menggantikan single global "sedang dilayani" agar semua loket aktif tampak.
  const perCounter = new Map<string, Row>();
  for (const r of rows) {
    if (r.status !== "in_service" && r.status !== "called") continue;
    const cur = perCounter.get(r.counter);
    if (!cur) { perCounter.set(r.counter, r); continue; }
    const rank = (x: Row) => (x.status === "in_service" ? 0 : 1);
    if (rank(r) < rank(cur)) perCounter.set(r.counter, r);
  }
  const nowServing = Array.from(perCounter.values()).sort((a, b) => a.counter.localeCompare(b.counter));
  const inService = rows.find((r) => r.status === "in_service");
  const called = rows.find((r) => r.status === "called");

  // Rata-rata waktu tunggu: selisih created_at → called_at untuk antrian yang sudah dipanggil hari ini.
  const waitDurations = rows
    .filter((r) => r.called_at)
    .map((r) => (new Date(r.called_at!).getTime() - new Date(r.created_at).getTime()) / 60000)
    .filter((m) => m >= 0 && m < 600);
  const avgWait = waitDurations.length ? Math.round(waitDurations.reduce((a, b) => a + b, 0) / waitDurations.length) : null;

  // Text-to-Speech untuk mode display — panggil saat nomor antrian yg dipanggil berubah.
  const lastSpokenRef = useRef<string | null>(null);
  useEffect(() => {
    if (!display || !called) return;
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const key = `${called.id}:${called.queue_no}`;
    if (lastSpokenRef.current === key) return;
    lastSpokenRef.current = key;
    const utter = new SpeechSynthesisUtterance(
      `Nomor antrian ${called.queue_no.split("").join(" ")}, atas nama ${called.apps_pasien?.nama ?? ""}, silakan menuju loket ${called.counter}.`,
    );
    utter.lang = "id-ID"; utter.rate = 0.95;
    try { window.speechSynthesis.cancel(); window.speechSynthesis.speak(utter); } catch { /* noop */ }
  }, [display, called]);

  // Keyboard shortcuts (non-display mode) — n: panggil antrian menunggu berikutnya, c: selesai, p: panggil ulang.
  useEffect(() => {
    if (display) return;
    const handler = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (updM.isPending) return;
      if (k === "n" && waiting[0]) { e.preventDefault(); updM.mutate({ id: waiting[0].id, status: "called" }); }
      else if (k === "c" && inService) { e.preventDefault(); updM.mutate({ id: inService.id, status: "done" }); }
      else if (k === "p" && called) { e.preventDefault(); updM.mutate({ id: called.id, status: "called" }); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [display, waiting, inService, called, updM]);

  if (display) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background p-8">
        <Button variant="ghost" className="absolute right-4 top-4" onClick={() => setDisplay(false)}>Tutup Display</Button>
        <h2 className="text-3xl font-light text-muted-foreground">Sedang Dilayani</h2>
        {nowServing.length === 0 ? (
          <div className="my-8 text-6xl font-bold tabular-nums text-muted-foreground">—</div>
        ) : (
          <div className="my-8 grid w-full max-w-6xl gap-4" style={{ gridTemplateColumns: `repeat(${Math.min(nowServing.length, 4)}, minmax(0,1fr))` }}>
            {nowServing.map((r) => (
              <div key={r.id} className="rounded-2xl border-2 border-primary/40 bg-primary/5 p-6 text-center">
                <div className="text-xs uppercase tracking-widest text-muted-foreground">Loket {r.counter}</div>
                <div className="my-2 text-7xl font-bold tabular-nums">{r.queue_no}</div>
                <div className="truncate text-lg">{r.apps_pasien?.nama ?? ""}</div>
                <div className="text-xs text-muted-foreground">{r.fin_dokter?.name ?? ""}</div>
                <div className="mt-1 text-[10px] uppercase tracking-wider text-primary">{STATUS_LABEL[r.status]}</div>
              </div>
            ))}
          </div>
        )}
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
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari no antrian / nama / RM…" className="w-56" />
        <Button variant="outline" onClick={() => setDisplay(true)}>Mode Display</Button>
        <div className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Timer className="h-3.5 w-3.5" />Rata-rata tunggu: <span className="font-semibold text-foreground">{avgWait !== null ? `${avgWait} mnt` : "—"}</span></span>
          <span>Menunggu: <span className="font-semibold text-foreground">{waiting.length}</span></span>
          <span className="hidden text-[10px] text-muted-foreground md:inline" title="n=panggil berikutnya · c=selesai · p=panggil ulang">⌨ n / c / p</span>
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
                  <Button size="sm" variant="ghost" className="text-destructive"
                    onClick={() => setSkipTarget({ id: r.id, queue_no: r.queue_no, nama: r.apps_pasien?.nama ?? "-" })}
                    title="Skip / batalkan"><SkipForward className="h-3 w-3" /></Button>
                )}
              </div>
            </Card>
          ))}
      </div>
      <ConfirmDialog
        open={!!skipTarget}
        onOpenChange={(o) => { if (!o) setSkipTarget(null); }}
        title="Batalkan antrian?"
        description={skipTarget ? `Antrian ${skipTarget.queue_no} (${skipTarget.nama}) akan ditandai batal. Tindakan ini tidak dapat dibatalkan.` : ""}
        destructive
        confirmLabel="Ya, batalkan"
        onConfirm={() => { if (skipTarget) { updM.mutate({ id: skipTarget.id, status: "cancelled" }); setSkipTarget(null); } }}
      />
    </div>
  );
}
