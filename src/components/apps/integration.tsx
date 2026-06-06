// i18n-lint-disable-file — internal/admin or operator UI; strings tracked separately.
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Activity, ArrowRight, CheckCircle2, AlertTriangle, Loader2, Send,
  RefreshCw, Eye, Plug, ShieldCheck, Bell,
} from "lucide-react";
import { toast } from "sonner";
import {
  getSyncLog, subscribeSync, addSync, retrySync, type SyncEntry, type SyncSystem,
} from "@/lib/sync-log";
import { addAudit, getAudit } from "@/lib/audit-log";
import { useAuth } from "@/lib/auth";
import { formatIDR } from "@/lib/finance";

const SYSTEMS: { id: SyncSystem; desc: string }[] = [
  { id: "SIM Klinik", desc: "Operasional klinik mata, pasien, billing." },
  { id: "Finance",    desc: "Invoice, piutang, jurnal, laporan." },
  { id: "Prime Apps", desc: "Portal & workspace internal." },
];

const STATUS_CLS: Record<SyncEntry["status"], string> = {
  success: "bg-emerald-500/15 text-emerald-600",
  pending: "bg-amber-500/15 text-amber-600",
  failed:  "bg-rose-500/15 text-rose-600",
};

function useSyncLog() {
  return useSyncExternalStore(subscribeSync, getSyncLog, getSyncLog);
}

export function IntegrationPage() {
  const log = useSyncLog();
  const { user } = useAuth();
  const [detail, setDetail] = useState<SyncEntry | null>(null);
  const [tick, setTick] = useState(0);

  // Simulated "online" status per system (mock).
  const [status] = useState<Record<SyncSystem, "online" | "offline">>({
    "SIM Klinik": "online", "Finance": "online", "Prime Apps": "online",
  });

  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 30000);
    return () => clearInterval(t);
  }, []);

  const today = useMemo(() => {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    return log.filter((e) => new Date(e.ts).getTime() >= start.getTime());
  }, [log, tick]);

  const lastSync = log[0];
  const errorsToday = today.filter((e) => e.status === "failed").length;

  const audit = getAudit().filter((a) => a.action === "sync" || a.target.startsWith("integration"));

  const actor = user?.email ?? "system";

  const sendBilling = () => {
    const refId = "BIL-" + Math.floor(1000 + Math.random() * 9000);
    addSync({
      source: "SIM Klinik", target: "Finance", channel: "billing.invoice", refId,
      status: "success",
      message: `Billing ${refId} dikirim ke Finance`,
      payload: {
        billing_id: refId,
        invoice_number: `INV/2026/06/${refId.slice(-4)}`,
        patient_code: "RM-000183",
        payer: "BPJS",
        doctor: "dr. Rini, Sp.M",
        service_items: ["Konsultasi Sp.M", "Refraksi"],
        total_amount: 260000,
        billing_status: "issued",
        created_at: new Date().toISOString(),
      },
    });
    addAudit({ actor, action: "sync", target: "integration/sim->finance", meta: { refId } });
    toast.success(`Billing ${refId} terkirim ke Finance`);
  };

  const syncPayment = () => {
    const invNo = `INV/2026/06/${Math.floor(1000 + Math.random() * 9000)}`;
    addSync({
      source: "Finance", target: "SIM Klinik", channel: "payment.status", refId: invNo,
      status: "success",
      message: `Status pembayaran ${invNo} disinkron`,
      payload: {
        invoice_number: invNo,
        payment_status: "paid",
        paid_amount: 450000,
        outstanding_amount: 0,
        payment_date: new Date().toISOString(),
        receipt_number: "RC-" + Math.floor(1000 + Math.random() * 9000),
      },
    });
    addAudit({ actor, action: "sync", target: "integration/finance->sim", meta: { invNo } });
    toast.success(`Pembayaran ${invNo} disinkron ke SIM`);
  };

  const retryAllFailed = () => {
    const failed = log.filter((e) => e.status === "failed");
    if (failed.length === 0) return toast.info("Tidak ada sync gagal.");
    failed.forEach((e) => retrySync(e.id));
    addAudit({ actor, action: "sync", target: "integration/retry-all", meta: { count: failed.length } });
    toast.success(`${failed.length} sync gagal di-retry`);
  };

  const retryOne = (e: SyncEntry) => {
    retrySync(e.id);
    addAudit({ actor, action: "sync", target: "integration/retry", meta: { id: e.id, refId: e.refId } });
    toast.success(`${e.refId} berhasil di-retry`);
  };

  return (
    <div>
      <PageHeader
        title="System Integration"
        desc="Penghubung antara Prime Apps, SIM Klinik Mata, dan Prime Simon Finance — hanya berbagi data minimum yang diperlukan."
      />

      {/* System Status */}
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        {SYSTEMS.map((s) => (
          <div key={s.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Plug className="h-4 w-4 text-primary" /> {s.id}
              </div>
              <Badge className={status[s.id] === "online" ? "bg-emerald-500/15 text-emerald-600" : "bg-rose-500/15 text-rose-600"}>
                <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-current" /> {status[s.id]}
              </Badge>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">{s.desc}</div>
          </div>
        ))}
      </div>

      {/* KPI */}
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Kpi icon={<Activity className="h-4 w-4 text-primary" />} label="Sync Hari Ini" value={String(today.length)} />
        <Kpi
          icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />}
          label="Last Sync"
          value={lastSync ? new Date(lastSync.ts).toLocaleString("id-ID") : "—"}
          hint={lastSync ? `${lastSync.source} → ${lastSync.target}` : ""}
        />
        <Kpi
          icon={<AlertTriangle className="h-4 w-4 text-rose-600" />}
          label="Error Sync (hari ini)"
          value={String(errorsToday)}
        />
      </div>

      {/* Connectors */}
      <div className="mb-4 grid gap-3 lg:grid-cols-3">
        <ConnectorCard
          title="SIM → Finance"
          from="SIM Klinik" to="Finance"
          desc="Mengirim ringkasan billing/invoice (tanpa data klinis detail)."
          icon={<Send className="h-4 w-4" />}
          onAction={sendBilling}
          actionLabel="Send Billing to Finance"
        />
        <ConnectorCard
          title="Finance → SIM"
          from="Finance" to="SIM Klinik"
          desc="Mengirim status pembayaran & nomor kwitansi."
          icon={<RefreshCw className="h-4 w-4" />}
          onAction={syncPayment}
          actionLabel="Sync Payment Status"
        />
        <ConnectorCard
          title="↔ Prime Apps"
          from="SIM Klinik" to="Prime Apps"
          desc="Notifikasi ringkas dari kedua sistem (tanpa data pasien detail)."
          icon={<Bell className="h-4 w-4" />}
          onAction={() => {
            addSync({
              source: "SIM Klinik", target: "Prime Apps", channel: "notification.summary",
              refId: "NTF-" + Math.floor(100 + Math.random() * 900),
              status: "success", message: "Notifikasi ringkas terkirim ke portal",
            });
            toast.success("Notifikasi terkirim ke Prime Apps");
          }}
          actionLabel="Push Notification"
        />
      </div>

      <Tabs defaultValue="log">
        <TabsList>
          <TabsTrigger value="log">Sync Log</TabsTrigger>
          <TabsTrigger value="mapping">Data Mapping</TabsTrigger>
          <TabsTrigger value="privacy">Privacy Rules</TabsTrigger>
          <TabsTrigger value="audit">Audit Integrasi</TabsTrigger>
        </TabsList>

        <TabsContent value="log" className="space-y-3">
          <div className="flex items-center justify-end">
            <Button size="sm" variant="outline" className="gap-1" onClick={retryAllFailed}>
              <RefreshCw className="h-4 w-4" /> Retry Failed Sync
            </Button>
          </div>
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Waktu</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead></TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Data Type</TableHead>
                  <TableHead>Ref</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Pesan</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {log.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="py-16 text-center text-sm text-muted-foreground">Belum ada sync.</TableCell></TableRow>
                ) : log.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="text-xs">{new Date(e.ts).toLocaleString("id-ID")}</TableCell>
                    <TableCell className="text-xs">{e.source}</TableCell>
                    <TableCell><ArrowRight className="h-3.5 w-3.5 text-muted-foreground" /></TableCell>
                    <TableCell className="text-xs">{e.target}</TableCell>
                    <TableCell className="font-mono text-xs">{e.channel}</TableCell>
                    <TableCell className="font-mono text-xs">{e.refId}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${STATUS_CLS[e.status]}`}>
                        {e.status === "pending" && <Loader2 className="h-3 w-3 animate-spin" />}
                        {e.status}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-[260px] truncate text-xs text-muted-foreground">{e.message ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => setDetail(e)}><Eye className="h-3.5 w-3.5" /></Button>
                        {e.status === "failed" && (
                          <Button size="sm" variant="outline" onClick={() => retryOne(e)}><RefreshCw className="h-3.5 w-3.5" /></Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="mapping" className="grid gap-3 md:grid-cols-2">
          <MappingCard
            title="SIM Klinik → Finance"
            channel="billing.invoice"
            fields={[
              "billing_id", "invoice_number", "patient_code (bukan nama)",
              "payer", "doctor", "service_items", "total_amount",
              "billing_status", "created_at",
            ]}
          />
          <MappingCard
            title="Finance → SIM Klinik"
            channel="payment.status"
            fields={[
              "invoice_number", "payment_status", "paid_amount",
              "outstanding_amount", "payment_date", "receipt_number",
            ]}
          />
        </TabsContent>

        <TabsContent value="privacy">
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <ShieldCheck className="h-4 w-4 text-primary" /> Privacy Rules
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• <span className="text-foreground">Finance</span> tidak menampilkan data klinis (anamnesis, diagnosis, terapi, resep).</li>
              <li>• <span className="text-foreground">Prime Apps</span> tidak menampilkan data pasien detail — hanya notifikasi & ringkasan.</li>
              <li>• <span className="text-foreground">SIM Klinik Mata</span> tidak menampilkan laba rugi, jurnal, atau buku besar.</li>
              <li>• Semua sistem hanya berbagi <span className="text-foreground">data minimum</span> sesuai mapping di tab Data Mapping.</li>
              <li>• Identitas pasien selalu menggunakan <span className="font-mono">patient_code</span>, bukan nama lengkap.</li>
            </ul>
          </div>
        </TabsContent>

        <TabsContent value="audit">
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Waktu</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Aksi</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Detail</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {audit.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="py-12 text-center text-sm text-muted-foreground">Belum ada audit integrasi.</TableCell></TableRow>
                ) : audit.slice(0, 30).map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="text-xs">{new Date(a.ts).toLocaleString("id-ID")}</TableCell>
                    <TableCell className="text-xs">{a.actor}</TableCell>
                    <TableCell><Badge variant="outline">{a.action}</Badge></TableCell>
                    <TableCell className="font-mono text-xs">{a.target}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{a.meta ? JSON.stringify(a.meta) : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Detail */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>Sync Detail — {detail?.refId}</DialogTitle></DialogHeader>
          {detail && (
            <div className="space-y-2 text-sm">
              <Row k="Waktu" v={new Date(detail.ts).toLocaleString("id-ID")} />
              <Row k="Source → Target" v={`${detail.source} → ${detail.target}`} />
              <Row k="Channel" v={detail.channel} />
              <Row k="Status" v={detail.status} />
              {detail.message && <Row k="Pesan" v={detail.message} />}
              {detail.payload && (
                <div>
                  <div className="mb-1 text-xs text-muted-foreground">Payload (data minimum)</div>
                  <pre className="max-h-64 overflow-auto rounded-lg bg-muted p-3 text-xs">{JSON.stringify(detail.payload, null, 2)}</pre>
                  {typeof detail.payload.total_amount === "number" && (
                    <div className="mt-2 text-xs text-muted-foreground">Total: <span className="font-mono">{formatIDR(detail.payload.total_amount)}</span></div>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Kpi({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
      {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

function ConnectorCard({ title, from, to, desc, icon, onAction, actionLabel }: {
  title: string; from: SyncSystem; to: SyncSystem; desc: string;
  icon: React.ReactNode; onAction: () => void; actionLabel: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-sm font-semibold">{title}</div>
      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
        <Badge variant="outline">{from}</Badge>
        <ArrowRight className="h-3 w-3" />
        <Badge variant="outline">{to}</Badge>
      </div>
      <div className="mt-2 text-xs text-muted-foreground">{desc}</div>
      <Button size="sm" className="mt-3 w-full gap-1" onClick={onAction}>{icon} {actionLabel}</Button>
    </div>
  );
}

function MappingCard({ title, channel, fields }: { title: string; channel: string; fields: string[] }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">{title}</div>
        <Badge variant="outline" className="font-mono text-xs">{channel}</Badge>
      </div>
      <ul className="mt-3 grid gap-1 text-xs">
        {fields.map((f) => (
          <li key={f} className="flex items-center gap-2 rounded-md bg-muted/50 px-2 py-1 font-mono">
            <CheckCircle2 className="h-3 w-3 text-emerald-600" /> {f}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="grid grid-cols-3 gap-2 border-b border-border/60 pb-1.5 last:border-0">
      <span className="text-muted-foreground">{k}</span>
      <span className="col-span-2 break-words">{v}</span>
    </div>
  );
}
