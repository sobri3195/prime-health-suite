import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/lib/page-head";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { listExpenses } from "@/lib/finance-tx.functions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Download, MessageCircle, Mail, Copy } from "lucide-react";
import { downloadCSV, toCSV } from "@/lib/export";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/finance/aging-hutang")({
  head: () => pageHead({ title: "Aging Hutang — Finance", description: "Aging Hutang pada modul keuangan klinik.", path: "/finance/aging-hutang" }),
  component: Page,
});

const fmt = (n: number) => "Rp " + (Number(n) || 0).toLocaleString("id-ID");
const daysBetween = (a: string) => Math.floor((Date.now() - new Date(a).getTime()) / 86400000);
const bucketOf = (d: number) => (d <= 30 ? "0-30" : d <= 60 ? "31-60" : d <= 90 ? "61-90" : ">90");
const BUCKETS = ["all", "0-30", "31-60", "61-90", ">90"] as const;

function reminderText(r: any) {
  const sisa = Number(r.total) - Number(r.dibayar ?? 0);
  return `Halo tim ${r.vendor_name ?? "Vendor"}, kami mohon konfirmasi pembayaran voucher ${r.no_voucher} tgl ${r.tanggal} sebesar ${fmt(sisa)}. Terima kasih.`;
}

function Page() {
  const fn = useServerFn(listExpenses);
  const { data, isLoading } = useQuery({ queryKey: ["fin-aging-hutang"], queryFn: () => fn({ data: {} }) });
  const allRows = (data?.rows ?? []).filter((r: any) => r.status !== "void" && Number(r.total) > Number(r.dibayar ?? 0));

  const [vendor, setVendor] = useState<string>("all");
  const [bucket, setBucket] = useState<(typeof BUCKETS)[number]>("all");
  const [q, setQ] = useState("");

  const vendorOptions = useMemo(() => {
    const s = new Set<string>();
    allRows.forEach((r: any) => s.add(r.vendor_name ?? "-"));
    return Array.from(s).sort();
  }, [allRows]);

  const rows = useMemo(() => allRows.filter((r: any) => {
    const v = r.vendor_name ?? "-";
    if (vendor !== "all" && v !== vendor) return false;
    if (bucket !== "all" && bucketOf(daysBetween(r.tanggal)) !== bucket) return false;
    if (q && !`${r.no_voucher} ${v}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  }), [allRows, vendor, bucket, q]);

  const aging = useMemo(() => {
    const b: Record<string, number> = { "0-30": 0, "31-60": 0, "61-90": 0, ">90": 0 };
    const byVendor = new Map<string, Record<string, number>>();
    for (const r of rows) {
      const sisa = Number(r.total) - Number(r.dibayar ?? 0);
      const k = bucketOf(daysBetween(r.tanggal));
      b[k] += sisa;
      const v = r.vendor_name ?? "-";
      const cur = byVendor.get(v) ?? { "0-30": 0, "31-60": 0, "61-90": 0, ">90": 0 };
      cur[k] += sisa; byVendor.set(v, cur);
    }
    const list = Array.from(byVendor.entries()).map(([nama, x]) => ({ nama, ...x, total: x["0-30"] + x["31-60"] + x["61-90"] + x[">90"] }));
    list.sort((a, z) => z.total - a.total);
    return { b, list };
  }, [rows]);
  const total = Object.values(aging.b).reduce((a, b) => a + b, 0);

  const exportCsv = () => {
    const csv = toCSV(rows, [
      { key: "no", label: "No Voucher", get: (r: any) => r.no_voucher },
      { key: "tgl", label: "Tanggal", get: (r: any) => r.tanggal },
      { key: "vendor", label: "Vendor", get: (r: any) => r.vendor_name ?? "" },
      { key: "total", label: "Total", get: (r: any) => r.total },
      { key: "bayar", label: "Dibayar", get: (r: any) => r.dibayar ?? 0 },
      { key: "sisa", label: "Sisa", get: (r: any) => Number(r.total) - Number(r.dibayar ?? 0) },
      { key: "umur", label: "Umur", get: (r: any) => daysBetween(r.tanggal) },
      { key: "bucket", label: "Bucket", get: (r: any) => bucketOf(daysBetween(r.tanggal)) },
    ]);
    downloadCSV("aging-hutang.csv", csv);
  };

  const sendWA = (r: any) => window.open(`https://wa.me/?text=${encodeURIComponent(reminderText(r))}`, "_blank");
  const sendMail = (r: any) => window.open(`mailto:?subject=${encodeURIComponent(`Konfirmasi Voucher ${r.no_voucher}`)}&body=${encodeURIComponent(reminderText(r))}`);
  const copyMsg = async (r: any) => { await navigator.clipboard.writeText(reminderText(r)); toast.success("Pesan disalin"); };

  return (
    <div>
      <PageHeader title="Aging Hutang (AP)" desc="Outstanding voucher pengeluaran berdasarkan umur, dengan ringkasan per vendor." />
      <div className="mb-3 grid gap-3 md:grid-cols-5">
        <Kpi label="Total Hutang" value={fmt(total)} />
        {Object.entries(aging.b).map(([k, v]) => <Kpi key={k} label={`Umur ${k} hari`} value={fmt(v)} />)}
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Input placeholder="Cari voucher/vendor…" value={q} onChange={(e) => setQ(e.target.value)} className="h-9 w-64" />
        <Select value={vendor} onValueChange={setVendor}>
          <SelectTrigger className="h-9 w-56"><SelectValue placeholder="Vendor" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Vendor</SelectItem>
            {vendorOptions.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1">
          {BUCKETS.map((b) => (
            <Button key={b} size="sm" variant={bucket === b ? "default" : "outline"} className="h-9" onClick={() => setBucket(b)}>
              {b === "all" ? "Semua umur" : b}
            </Button>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={exportCsv} className="ml-auto gap-1"><Download className="h-4 w-4" /> Export CSV</Button>
      </div>

      <div className="mb-4 overflow-hidden rounded-xl border border-border bg-card">
        <div className="border-b border-border px-4 py-2 text-sm font-semibold">Ringkasan per Vendor</div>
        <Table>
          <TableHeader><TableRow>
            <TableHead>Vendor</TableHead><TableHead className="text-right">0-30</TableHead>
            <TableHead className="text-right">31-60</TableHead><TableHead className="text-right">61-90</TableHead>
            <TableHead className="text-right">&gt;90</TableHead><TableHead className="text-right">Total</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {aging.list.length === 0 ? <TableRow><TableCell colSpan={6} className="py-6 text-center text-sm text-muted-foreground">-</TableCell></TableRow>
              : aging.list.map((p) => (
                <TableRow key={p.nama} className="cursor-pointer hover:bg-muted/50" onClick={() => setVendor(p.nama)}>
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
            <TableHead>No. Voucher</TableHead><TableHead>Tanggal</TableHead><TableHead>Vendor</TableHead>
            <TableHead className="text-right">Total</TableHead><TableHead className="text-right">Dibayar</TableHead>
            <TableHead className="text-right">Sisa</TableHead><TableHead className="text-right">Umur</TableHead>
            <TableHead className="text-right">Reminder</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={8} className="py-12 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></TableCell></TableRow>
              : rows.length === 0 ? <TableRow><TableCell colSpan={8} className="py-12 text-center text-muted-foreground text-sm">Tidak ada hutang outstanding.</TableCell></TableRow>
              : rows.map((r: any) => {
                const sisa = Number(r.total) - Number(r.dibayar ?? 0);
                const umur = daysBetween(r.tanggal);
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.no_voucher}</TableCell>
                    <TableCell>{r.tanggal}</TableCell>
                    <TableCell>{r.vendor_name ?? "-"}</TableCell>
                    <TableCell className="text-right font-mono">{fmt(r.total)}</TableCell>
                    <TableCell className="text-right font-mono">{fmt(r.dibayar ?? 0)}</TableCell>
                    <TableCell className="text-right font-mono font-semibold">{fmt(sisa)}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="secondary" className={umur > 90 ? "bg-rose-500/15 text-rose-700" : umur > 60 ? "bg-amber-500/15 text-amber-700" : "bg-muted text-muted-foreground"}>{umur} hari</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7" title="WhatsApp" onClick={() => sendWA(r)}><MessageCircle className="h-3.5 w-3.5 text-emerald-600" /></Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" title="Email" onClick={() => sendMail(r)}><Mail className="h-3.5 w-3.5 text-blue-600" /></Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" title="Copy" onClick={() => copyMsg(r)}><Copy className="h-3.5 w-3.5" /></Button>
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
