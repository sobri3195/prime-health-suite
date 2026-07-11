import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/lib/page-head";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Download, MessageCircle, Mail, Copy } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { listInvoices } from "@/lib/finance-tx.functions";
import { downloadCSV, toCSV } from "@/lib/export";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/finance/aging-piutang")({
  head: () => pageHead({ title: "Aging Piutang — Finance", description: "Aging Piutang pada modul keuangan klinik.", path: "/finance/aging-piutang" }),
  component: Page,
});

const fmt = (n: number) => "Rp " + (Number(n) || 0).toLocaleString("id-ID");
const daysBetween = (a: string) => Math.floor((Date.now() - new Date(a).getTime()) / 86400000);
const bucketOf = (d: number) => (d <= 30 ? "0-30" : d <= 60 ? "31-60" : d <= 90 ? "61-90" : ">90");

const BUCKETS = ["all", "0-30", "31-60", "61-90", ">90"] as const;

function reminderText(r: any) {
  const sisa = Number(r.total) - Number(r.dibayar ?? 0);
  const umur = daysBetween(r.tanggal);
  return `Halo ${r.patient_name ?? "Bapak/Ibu"}, kami mengingatkan tagihan invoice ${r.no_invoice} tanggal ${r.tanggal} sebesar ${fmt(sisa)} (umur ${umur} hari). Mohon segera dilunasi. Terima kasih.`;
}

function Page() {
  const fn = useServerFn(listInvoices);
  const { data, isLoading } = useQuery({ queryKey: ["fin-aging-piutang-detail"], queryFn: () => fn({ data: {} }) });
  const allRows = (data?.rows ?? []).filter((r: any) => r.status !== "void" && Number(r.total) > Number(r.dibayar ?? 0));

  const [payer, setPayer] = useState<string>("all");
  const [bucket, setBucket] = useState<(typeof BUCKETS)[number]>("all");
  const [q, setQ] = useState("");

  const payerOptions = useMemo(() => {
    const s = new Set<string>();
    allRows.forEach((r: any) => s.add(r.payer_name ?? "Tunai/Pribadi"));
    return Array.from(s).sort();
  }, [allRows]);

  const rows = useMemo(() => {
    return allRows.filter((r: any) => {
      const p = r.payer_name ?? "Tunai/Pribadi";
      if (payer !== "all" && p !== payer) return false;
      if (bucket !== "all" && bucketOf(daysBetween(r.tanggal)) !== bucket) return false;
      if (q && !`${r.no_invoice} ${r.patient_name ?? ""} ${p}`.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [allRows, payer, bucket, q]);

  const summary = useMemo(() => {
    const b: Record<string, number> = { "0-30": 0, "31-60": 0, "61-90": 0, ">90": 0 };
    const byPayer = new Map<string, Record<string, number>>();
    for (const r of rows) {
      const sisa = Number(r.total) - Number(r.dibayar ?? 0);
      const bk = bucketOf(daysBetween(r.tanggal));
      b[bk] += sisa;
      const p = r.payer_name ?? r.patient_name ?? "Tunai/Pribadi";
      const cur = byPayer.get(p) ?? { "0-30": 0, "31-60": 0, "61-90": 0, ">90": 0 };
      cur[bk] += sisa;
      byPayer.set(p, cur);
    }
    type Row = { nama: string; "0-30": number; "31-60": number; "61-90": number; ">90": number; total: number };
    const list: Row[] = Array.from(byPayer.entries()).map(([nama, v]) => ({ nama, "0-30": v["0-30"], "31-60": v["31-60"], "61-90": v["61-90"], ">90": v[">90"], total: v["0-30"] + v["31-60"] + v["61-90"] + v[">90"] }));
    list.sort((a, z) => z.total - a.total);
    return { b, byPayer: list };
  }, [rows]);
  const total = Object.values(summary.b).reduce((a, b) => a + b, 0);

  const exportCsv = () => {
    const csv = toCSV(rows, [
      { key: "no", label: "No Invoice", get: (r: any) => r.no_invoice },
      { key: "tgl", label: "Tanggal", get: (r: any) => r.tanggal },
      { key: "pasien", label: "Pasien", get: (r: any) => r.patient_name ?? "" },
      { key: "payer", label: "Payer", get: (r: any) => r.payer_name ?? "Tunai" },
      { key: "total", label: "Total", get: (r: any) => r.total },
      { key: "bayar", label: "Dibayar", get: (r: any) => r.dibayar ?? 0 },
      { key: "sisa", label: "Sisa", get: (r: any) => Number(r.total) - Number(r.dibayar ?? 0) },
      { key: "umur", label: "Umur (hari)", get: (r: any) => daysBetween(r.tanggal) },
      { key: "bucket", label: "Bucket", get: (r: any) => bucketOf(daysBetween(r.tanggal)) },
    ]);
    downloadCSV(`aging-piutang.csv`, csv);
  };

  const sendWA = (r: any) => window.open(`https://wa.me/?text=${encodeURIComponent(reminderText(r))}`, "_blank");
  const sendMail = (r: any) => {
    const sisa = Number(r.total) - Number(r.dibayar ?? 0);
    const subj = `Pengingat Tagihan ${r.no_invoice} - ${fmt(sisa)}`;
    window.open(`mailto:?subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(reminderText(r))}`);
  };
  const copyMsg = async (r: any) => { await navigator.clipboard.writeText(reminderText(r)); toast.success("Pesan reminder disalin"); };

  const bulkCopyAll = async () => {
    if (!rows.length) return toast.info("Tidak ada data.");
    const text = rows.map((r: any) => `• ${r.no_invoice} — ${r.patient_name ?? "-"} — ${fmt(Number(r.total) - Number(r.dibayar ?? 0))} (${daysBetween(r.tanggal)}h)`).join("\n");
    await navigator.clipboard.writeText(text);
    toast.success(`${rows.length} tagihan disalin ke clipboard`);
  };

  return (
    <div>
      <PageHeader title="Aging Piutang (Detail)" desc="Detail outstanding invoice per umur, dengan ringkasan per payer/asuransi. Kirim reminder via WhatsApp/email." />

      <div className="mb-3 grid gap-3 md:grid-cols-5">
        <Kpi label="Total Piutang" value={fmt(total)} />
        {Object.entries(summary.b).map(([k, v]) => <Kpi key={k} label={`Umur ${k}`} value={fmt(v)} />)}
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Input placeholder="Cari invoice/pasien/payer…" value={q} onChange={(e) => setQ(e.target.value)} className="h-9 w-64" />
        <Select value={payer} onValueChange={setPayer}>
          <SelectTrigger className="h-9 w-56"><SelectValue placeholder="Payer" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Payer</SelectItem>
            {payerOptions.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1">
          {BUCKETS.map((b) => (
            <Button key={b} size="sm" variant={bucket === b ? "default" : "outline"} className="h-9" onClick={() => setBucket(b)}>
              {b === "all" ? "Semua umur" : b}
            </Button>
          ))}
        </div>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" onClick={bulkCopyAll} className="gap-1"><Copy className="h-4 w-4" /> Copy Daftar</Button>
          <Button variant="outline" size="sm" onClick={exportCsv} className="gap-1"><Download className="h-4 w-4" /> Export CSV</Button>
        </div>
      </div>

      <div className="mb-4 overflow-hidden rounded-xl border border-border bg-card">
        <div className="border-b border-border px-4 py-2 text-sm font-semibold">Ringkasan per Payer</div>
        <Table>
          <TableHeader><TableRow>
            <TableHead>Payer / Pasien</TableHead><TableHead className="text-right">0-30</TableHead>
            <TableHead className="text-right">31-60</TableHead><TableHead className="text-right">61-90</TableHead>
            <TableHead className="text-right">&gt;90</TableHead><TableHead className="text-right">Total</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {summary.byPayer.length === 0 ? <TableRow><TableCell colSpan={6} className="py-6 text-center text-sm text-muted-foreground">-</TableCell></TableRow>
              : summary.byPayer.map((p) => (
                <TableRow key={p.nama} className="cursor-pointer hover:bg-muted/50" onClick={() => setPayer(p.nama)}>
                  <TableCell>{p.nama}</TableCell>
                  <TableCell className="text-right font-mono">{fmt(p["0-30"])}</TableCell>
                  <TableCell className="text-right font-mono">{fmt(p["31-60"])}</TableCell>
                  <TableCell className="text-right font-mono">{fmt(p["61-90"])}</TableCell>
                  <TableCell className="text-right font-mono">{fmt(p[">90"])}</TableCell>
                  <TableCell className="text-right font-mono font-semibold">{fmt(p.total)}</TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader><TableRow>
            <TableHead>No. Invoice</TableHead><TableHead>Tanggal</TableHead><TableHead>Pasien</TableHead><TableHead>Payer</TableHead>
            <TableHead className="text-right">Total</TableHead><TableHead className="text-right">Sisa</TableHead>
            <TableHead className="text-right">Umur</TableHead><TableHead>Bucket</TableHead>
            <TableHead className="text-right">Reminder</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={9} className="py-12 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></TableCell></TableRow>
              : rows.length === 0 ? <TableRow><TableCell colSpan={9} className="py-12 text-center text-sm text-muted-foreground">Tidak ada piutang outstanding.</TableCell></TableRow>
              : rows.map((r: any) => {
                const sisa = Number(r.total) - Number(r.dibayar ?? 0);
                const umur = daysBetween(r.tanggal);
                const bk = bucketOf(umur);
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.no_invoice}</TableCell>
                    <TableCell>{r.tanggal}</TableCell>
                    <TableCell>{r.patient_name ?? "-"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{r.payer_name ?? "Tunai"}</TableCell>
                    <TableCell className="text-right font-mono">{fmt(r.total)}</TableCell>
                    <TableCell className="text-right font-mono font-semibold">{fmt(sisa)}</TableCell>
                    <TableCell className="text-right">{umur} hari</TableCell>
                    <TableCell><Badge variant="secondary" className={bk === ">90" ? "bg-rose-500/15 text-rose-700" : bk === "61-90" ? "bg-amber-500/15 text-amber-700" : "bg-muted text-muted-foreground"}>{bk}</Badge></TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7" title="Kirim WhatsApp" onClick={() => sendWA(r)}><MessageCircle className="h-3.5 w-3.5 text-emerald-600" /></Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" title="Kirim Email" onClick={() => sendMail(r)}><Mail className="h-3.5 w-3.5 text-blue-600" /></Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" title="Copy pesan" onClick={() => copyMsg(r)}><Copy className="h-3.5 w-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-border bg-card p-4"><div className="text-xs text-muted-foreground">{label}</div><div className="mt-1 text-lg font-semibold">{value}</div></div>;
}
