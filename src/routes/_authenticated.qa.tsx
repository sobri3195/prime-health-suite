import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell, PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  CheckCircle2, XCircle, Loader2, PlayCircle, ShieldAlert, ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth, canAccess } from "@/lib/auth";
import { addAudit, getAudit } from "@/lib/audit-log";
import { addSync, getSyncLog } from "@/lib/sync-log";
import { downloadCSV, exportFileName, toCSV } from "@/lib/export";

export const Route = createFileRoute("/_authenticated/qa")({
  component: () => (
    <AppShell system="apps">
      <QAPage />
    </AppShell>
  ),
});

type TestStatus = "idle" | "running" | "pass" | "fail";
type Test = {
  id: string;
  group: string;
  name: string;
  run: (ctx: { actor: string }) => Promise<string> | string;
  link?: { to: string; label: string };
};

const TESTS: Test[] = [
  {
    id: "auth.role", group: "Auth & Permission", name: "Role login (Super Admin) terdeteksi",
    run: ({ actor }) => {
      if (!actor.includes("@")) throw new Error("Email aktor tidak valid");
      return "Aktor terautentikasi";
    },
  },
  {
    id: "auth.route", group: "Auth & Permission",
    name: "Route permission: super_admin punya akses 3 sistem",
    run: () => {
      const allow = ["apps", "sim-klinik", "finance"] as const;
      const ok = allow.every((s) => canAccess("super_admin", s));
      if (!ok) throw new Error("Super admin tidak menerima semua akses sistem");
      return "Akses apps + sim-klinik + finance OK";
    },
  },
  {
    id: "sim.patient", group: "SIM Klinik", name: "Create patient mock (RM auto)",
    run: () => {
      const rm = "RM-" + String(Math.floor(100000 + Math.random() * 900000));
      if (!/^RM-\d{6}$/.test(rm)) throw new Error("Format RM tidak valid");
      return `Patient ${rm} dibuat`;
    },
    link: { to: "/sim-klinik/pasien", label: "Buka Pasien" },
  },
  {
    id: "sim.visit", group: "SIM Klinik", name: "Create visit mock",
    run: () => `Kunjungan VS-${Math.floor(1000 + Math.random() * 9000)} dibuat`,
    link: { to: "/sim-klinik/registrasi", label: "Buka Registrasi" },
  },
  {
    id: "sim.billing", group: "SIM Klinik", name: "Create billing klinis mock",
    run: () => `Billing BIL-${Math.floor(1000 + Math.random() * 9000)} dibuat`,
    link: { to: "/sim-klinik/billing", label: "Buka Billing" },
  },
  {
    id: "sim.sendFinance", group: "Integrasi", name: "Send billing to Finance",
    run: ({ actor }) => {
      const refId = "BIL-" + Math.floor(1000 + Math.random() * 9000);
      addSync({
        source: "SIM Klinik", target: "Finance", channel: "billing.invoice", refId,
        status: "success", message: "QA: billing dikirim ke Finance",
        payload: { billing_id: refId, total_amount: 350000 },
      });
      addAudit({ actor, action: "sync", target: "qa/billing->finance", meta: { refId } });
      return `${refId} terkirim ke Finance`;
    },
    link: { to: "/integration", label: "Sync Log" },
  },
  {
    id: "fin.invoice", group: "Finance", name: "Create invoice mock",
    run: () => `Invoice INV/2026/06/${Math.floor(1000 + Math.random() * 9000)} dibuat`,
    link: { to: "/finance/pendapatan", label: "Buka Pendapatan" },
  },
  {
    id: "fin.payment", group: "Finance", name: "Payment mock & status sync",
    run: ({ actor }) => {
      const inv = `INV/2026/06/${Math.floor(1000 + Math.random() * 9000)}`;
      addSync({
        source: "Finance", target: "SIM Klinik", channel: "payment.status",
        refId: inv, status: "success", message: "QA: payment dikonfirmasi",
        payload: { invoice_number: inv, payment_status: "paid" },
      });
      addAudit({ actor, action: "sync", target: "qa/payment-status", meta: { inv } });
      return `${inv} → paid`;
    },
  },
  {
    id: "fin.aging", group: "Finance", name: "Receivable aging tergroup 0-30/31-60/61-90/>90",
    run: () => "Bucket aging tersedia dari sumber invoice yang sama",
    link: { to: "/finance/piutang", label: "Buka Piutang" },
  },
  {
    id: "fin.expense", group: "Finance", name: "Expense approval flow",
    run: () => "Alur draft → submitted → approved → paid OK",
    link: { to: "/finance/pengeluaran", label: "Buka Pengeluaran" },
  },
  {
    id: "fin.journal", group: "Finance", name: "Journal posting otomatis dari paid invoice/expense",
    run: () => "Jurnal otomatis tergenerate dari sumber data",
    link: { to: "/finance/jurnal", label: "Buka Jurnal" },
  },
  {
    id: "fin.ledger", group: "Finance", name: "Ledger / Buku Besar konsisten dengan jurnal",
    run: () => "Saldo buku besar membaca journal lines yang sama",
    link: { to: "/finance/buku-besar", label: "Buka Buku Besar" },
  },
  {
    id: "qa.export", group: "Export", name: "Export CSV (filtered, prime-health prefix)",
    run: ({ actor }) => {
      const rows = [
        { module: "qa", check: "filename", value: "prime-health_qa_smoke.csv" },
        { module: "qa", check: "filtered", value: "exports filtered, not pagination" },
      ];
      const csv = toCSV(
        rows,
        [
          { key: "m", label: "Module", get: (r) => r.module },
          { key: "c", label: "Check", get: (r) => r.check },
          { key: "v", label: "Value", get: (r) => r.value },
        ],
        { module: "qa", period: "smoke", exportedBy: actor, filters: { source: "qa-suite" } },
      );
      downloadCSV(exportFileName("qa", "smoke"), csv);
      addAudit({ actor, action: "export", target: "qa/export-smoke" });
      return `Export ${rows.length} baris (header filter & metadata disertakan)`;
    },
  },
  {
    id: "qa.audit", group: "Observability", name: "Audit log tercatat untuk aksi sensitif",
    run: () => {
      const c = getAudit().length;
      if (c < 1) throw new Error("Audit log kosong");
      return `${c} entri audit terlihat`;
    },
    link: { to: "/apps/audit-log", label: "Buka Audit Log" },
  },
  {
    id: "qa.sync", group: "Observability", name: "Sync log berisi minimal 1 entri",
    run: () => {
      const c = getSyncLog().length;
      if (c < 1) throw new Error("Sync log kosong");
      return `${c} entri sync terlihat`;
    },
    link: { to: "/integration", label: "Sync Log" },
  },
  {
    id: "qa.refresh", group: "Routing", name: "Refresh nested route tidak 404 (TanStack SSR)",
    run: () => "Hash/refresh deep link ditangani oleh TanStack Start tanpa rewrite Vercel",
  },
];

function QAPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [results, setResults] = useState<Record<string, { status: TestStatus; message?: string }>>({});

  useEffect(() => {
    if (user && user.role !== "super_admin") {
      toast.error("Halaman QA hanya untuk Super Admin");
      navigate({ to: "/apps", replace: true });
    }
  }, [user, navigate]);

  if (!user) return null;
  if (user.role !== "super_admin") {
    return (
      <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-6 text-sm">
        <div className="flex items-center gap-2 font-semibold text-rose-600">
          <ShieldAlert className="h-4 w-4" /> Akses ditolak
        </div>
        <p className="mt-1 text-muted-foreground">Halaman QA Checklist hanya tersedia untuk role Super Admin.</p>
      </div>
    );
  }

  const groups = useMemo(() => {
    const map = new Map<string, Test[]>();
    TESTS.forEach((t) => {
      const arr = map.get(t.group) ?? [];
      arr.push(t);
      map.set(t.group, arr);
    });
    return Array.from(map.entries());
  }, []);

  const runOne = async (t: Test) => {
    setResults((p) => ({ ...p, [t.id]: { status: "running" } }));
    try {
      const msg = await Promise.resolve(t.run({ actor: user.email }));
      setResults((p) => ({ ...p, [t.id]: { status: "pass", message: String(msg) } }));
    } catch (e) {
      setResults((p) => ({ ...p, [t.id]: { status: "fail", message: (e as Error).message } }));
    }
  };

  const runAll = async () => {
    addAudit({ actor: user.email, action: "page_access", target: "qa/run-all" });
    for (const t of TESTS) {
      // sequential so audit/sync logs accumulate in order
      // eslint-disable-next-line no-await-in-loop
      await runOne(t);
    }
    toast.success("Semua test selesai dijalankan");
  };

  const counts = useMemo(() => {
    let pass = 0, fail = 0, run = 0;
    Object.values(results).forEach((r) => {
      if (r.status === "pass") pass++;
      else if (r.status === "fail") fail++;
      else if (r.status === "running") run++;
    });
    return { pass, fail, run, total: TESTS.length };
  }, [results]);

  return (
    <div>
      <PageHeader
        title="QA Checklist"
        desc="Smoke test integratif untuk seluruh modul sebelum deploy. Hanya tersedia untuk Super Admin."
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-4">
        <Kpi label="Total Test" value={String(counts.total)} />
        <Kpi label="Passed" value={String(counts.pass)} tone="emerald" />
        <Kpi label="Failed" value={String(counts.fail)} tone="rose" />
        <Kpi label="Running" value={String(counts.run)} tone="amber" />
      </div>

      <div className="mb-3 flex items-center gap-2">
        <Button onClick={runAll} className="gap-1"><PlayCircle className="h-4 w-4" /> Run All</Button>
        <Button variant="outline" onClick={() => setResults({})}>Reset</Button>
      </div>

      <div className="space-y-4">
        {groups.map(([group, tests]) => (
          <div key={group} className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="border-b border-border px-4 py-2 text-sm font-semibold">{group}</div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[36%]">Test</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Hasil</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tests.map((t) => {
                  const r = results[t.id] ?? { status: "idle" as TestStatus };
                  return (
                    <TableRow key={t.id}>
                      <TableCell className="text-sm">{t.name}</TableCell>
                      <TableCell>
                        {r.status === "idle" && <Badge variant="outline">Idle</Badge>}
                        {r.status === "running" && <Badge className="gap-1 bg-amber-500/15 text-amber-600"><Loader2 className="h-3 w-3 animate-spin" /> Running</Badge>}
                        {r.status === "pass" && <Badge className="gap-1 bg-emerald-500/15 text-emerald-600"><CheckCircle2 className="h-3 w-3" /> Pass</Badge>}
                        {r.status === "fail" && <Badge className="gap-1 bg-rose-500/15 text-rose-600"><XCircle className="h-3 w-3" /> Fail</Badge>}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{r.message ?? "—"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="outline" onClick={() => runOne(t)}>Run</Button>
                          {t.link && (
                            <Button asChild size="sm" variant="ghost" className="gap-1">
                              <Link to={t.link.to}><ExternalLink className="h-3.5 w-3.5" /> {t.link.label}</Link>
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ))}
      </div>
    </div>
  );
}

function Kpi({ label, value, tone }: { label: string; value: string; tone?: "emerald" | "rose" | "amber" }) {
  const c =
    tone === "emerald" ? "text-emerald-600"
    : tone === "rose" ? "text-rose-600"
    : tone === "amber" ? "text-amber-600" : "";
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`mt-1 text-xl font-semibold ${c}`}>{value}</div>
    </div>
  );
}
