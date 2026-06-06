import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { invoices, master } from "@/data/financeData";
import { expenseSources, bankMutations, openingBankBalance } from "@/data/financeSources";
import { incomeStatement, cashFlow, trialBalance, ledger, periodFilter } from "@/lib/journal";
import { formatIDR, sumOutstanding } from "@/lib/finance";
import { downloadCSV, exportFileName, toCSV } from "@/lib/export";

export const Route = createFileRoute("/_authenticated/finance/laporan")({ component: LaporanPage });

const MONTHS = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agt","Sep","Okt","Nov","Des"];

function LaporanPage() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState<string>("all");

  const period = periodFilter(month === "all" ? "all" : Number(month), year);
  const inv = useMemo(() => invoices.filter((i) => {
    const d = new Date(i.date);
    if (d.getFullYear() !== year) return false;
    if (month !== "all" && d.getMonth() !== Number(month)) return false;
    return true;
  }), [year, month]);
  const exp = useMemo(() => expenseSources.filter((e) => {
    const d = new Date(e.date);
    if (d.getFullYear() !== year) return false;
    if (month !== "all" && d.getMonth() !== Number(month)) return false;
    return true;
  }), [year, month]);

  const is = useMemo(() => incomeStatement(period), [year, month]);
  const cf = useMemo(() => cashFlow(period), [year, month]);
  const tb = useMemo(() => trialBalance(period), [year, month]);
  const lg = useMemo(() => ledger(period), [year, month]);

  const csv = (name: string, rows: any[], cols: any[]) => {
    downloadCSV(exportFileName(name, `${year}-${month}`), toCSV(rows, cols));
    toast.success(`Export ${rows.length} baris (CSV)`);
  };

  return (
    <div>
      <PageHeader title="Laporan Manajemen" desc="Semua laporan menggunakan data jurnal & transaksi yang sama dengan dashboard." />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
          <SelectTrigger className="w-[110px]"><SelectValue /></SelectTrigger>
          <SelectContent>{[currentYear, currentYear - 1].map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={month} onValueChange={setMonth}>
          <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Bulan</SelectItem>
            {MONTHS.map((m, i) => <SelectItem key={m} value={String(i)}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="executive">
        <TabsList className="flex-wrap">
          <TabsTrigger value="executive">Executive</TabsTrigger>
          <TabsTrigger value="rugi-laba">Laba Rugi</TabsTrigger>
          <TabsTrigger value="ebitda">EBITDA</TabsTrigger>
          <TabsTrigger value="arus-kas">Arus Kas</TabsTrigger>
          <TabsTrigger value="neraca">Neraca Saldo</TabsTrigger>
          <TabsTrigger value="bb">Buku Besar</TabsTrigger>
          <TabsTrigger value="pendapatan">Pendapatan</TabsTrigger>
          <TabsTrigger value="piutang">Piutang</TabsTrigger>
          <TabsTrigger value="pengeluaran">Pengeluaran</TabsTrigger>
          <TabsTrigger value="pajak">Pajak</TabsTrigger>
          <TabsTrigger value="bank">Bank</TabsTrigger>
        </TabsList>

        <TabsContent value="executive">
          <div className="grid gap-3 sm:grid-cols-4">
            {[
              { l: "Pendapatan", v: is.revenue, c: "text-emerald-600" },
              { l: "Biaya", v: is.opex, c: "text-rose-600" },
              { l: "EBITDA", v: is.ebitda },
              { l: "Net Profit", v: is.netProfit, c: is.netProfit >= 0 ? "text-emerald-600" : "text-rose-600" },
              { l: "Pajak Estimasi", v: is.tax },
              { l: "Outstanding Piutang", v: sumOutstanding(inv) },
              { l: "Total Pengeluaran", v: exp.reduce((a, e) => a + e.amount, 0) },
              { l: "Saldo Kas/Bank Akhir", v: openingBankBalance + cf.net },
            ].map((k) => (
              <div key={k.l} className="rounded-xl border border-border bg-card p-4">
                <div className="text-xs text-muted-foreground">{k.l}</div>
                <div className={`mt-1 text-lg font-semibold ${k.c ?? ""}`}>{formatIDR(k.v)}</div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="rugi-laba">
          <ReportCard title="Laporan Laba Rugi" onExport={() => csv("laba-rugi",
            [
              { label: "Pendapatan", val: is.revenue },
              { label: "Beban Operasional", val: -is.opex },
              { label: "EBITDA", val: is.ebitda },
              { label: "Pajak", val: -is.tax },
              { label: "Laba Bersih", val: is.netProfit },
            ],
            [{ key: "l", label: "Pos", get: (r: any) => r.label }, { key: "v", label: "Nilai", get: (r: any) => r.val }]
          )}>
            <ReportRow label="Pendapatan" val={is.revenue} />
            <ReportRow label="Beban Operasional" val={-is.opex} />
            <ReportRow label="EBITDA" val={is.ebitda} bold />
            <ReportRow label="Pajak (estimasi)" val={-is.tax} />
            <ReportRow label="Laba Bersih" val={is.netProfit} bold />
          </ReportCard>
        </TabsContent>

        <TabsContent value="ebitda">
          <ReportCard title="EBITDA" onExport={() => csv("ebitda",
            [{ label: "EBITDA", val: is.ebitda }, { label: "Margin", val: is.revenue ? is.ebitda / is.revenue : 0 }],
            [{ key: "l", label: "Pos", get: (r:any)=>r.label }, { key: "v", label: "Nilai", get: (r:any)=>r.val }]
          )}>
            <ReportRow label="Pendapatan" val={is.revenue} />
            <ReportRow label="Total Beban" val={-is.opex} />
            <ReportRow label="EBITDA" val={is.ebitda} bold />
            <ReportRow label="Margin EBITDA" val={is.revenue ? `${((is.ebitda/is.revenue)*100).toFixed(1)}%` : "—"} />
          </ReportCard>
        </TabsContent>

        <TabsContent value="arus-kas">
          <ReportCard title="Arus Kas" onExport={() => csv("arus-kas",
            [{ label: "Masuk", val: cf.inflow }, { label: "Keluar", val: cf.outflow }, { label: "Net", val: cf.net }],
            [{ key: "l", label: "Pos", get: (r:any)=>r.label }, { key: "v", label: "Nilai", get: (r:any)=>r.val }]
          )}>
            <ReportRow label="Saldo Awal" val={openingBankBalance} />
            <ReportRow label="Arus Masuk" val={cf.inflow} />
            <ReportRow label="Arus Keluar" val={-cf.outflow} />
            <ReportRow label="Net Cash Flow" val={cf.net} bold />
            <ReportRow label="Saldo Akhir" val={openingBankBalance + cf.net} bold />
          </ReportCard>
        </TabsContent>

        <TabsContent value="neraca">
          <ReportTable title="Neraca Saldo (Trial Balance)" rows={tb} cols={[
            { h: "Akun", get: (r: any) => `${r.account} – ${r.accountName}` },
            { h: "Debit", align: "right", get: (r: any) => formatIDR(r.debit) },
            { h: "Kredit", align: "right", get: (r: any) => formatIDR(r.credit) },
          ]} onExport={() => csv("neraca", tb, [
            { key: "a", label: "Akun", get: (r: any) => `${r.account} ${r.accountName}` },
            { key: "d", label: "Debit", get: (r: any) => r.debit },
            { key: "c", label: "Kredit", get: (r: any) => r.credit },
          ])} />
        </TabsContent>

        <TabsContent value="bb">
          <ReportTable title="Buku Besar (Saldo per Akun)" rows={lg} cols={[
            { h: "Akun", get: (r: any) => `${r.account} – ${r.accountName}` },
            { h: "Debit", align: "right", get: (r: any) => formatIDR(r.debit) },
            { h: "Kredit", align: "right", get: (r: any) => formatIDR(r.credit) },
            { h: "Saldo Akhir", align: "right", get: (r: any) => formatIDR(r.closing) },
          ]} onExport={() => csv("buku-besar", lg, [
            { key: "a", label: "Akun", get: (r: any) => `${r.account} ${r.accountName}` },
            { key: "d", label: "Debit", get: (r: any) => r.debit },
            { key: "c", label: "Kredit", get: (r: any) => r.credit },
            { key: "s", label: "Saldo", get: (r: any) => r.closing },
          ])} />
        </TabsContent>

        <TabsContent value="pendapatan">
          <ReportTable title="Laporan Pendapatan" rows={inv} cols={[
            { h: "Invoice", get: (r: any) => r.invoice },
            { h: "Tanggal", get: (r: any) => new Date(r.date).toLocaleDateString("id-ID") },
            { h: "Payer", get: (r: any) => r.payer },
            { h: "Layanan", get: (r: any) => r.service },
            { h: "Total", align: "right", get: (r: any) => formatIDR(r.total) },
            { h: "Paid", align: "right", get: (r: any) => formatIDR(r.paid) },
            { h: "Status", get: (r: any) => r.status },
          ]} onExport={() => csv("pendapatan", inv, [
            { key: "i", label: "Invoice", get: (r: any) => r.invoice },
            { key: "d", label: "Tanggal", get: (r: any) => r.date },
            { key: "p", label: "Payer", get: (r: any) => r.payer },
            { key: "t", label: "Total", get: (r: any) => r.total },
            { key: "pd", label: "Paid", get: (r: any) => r.paid },
            { key: "s", label: "Status", get: (r: any) => r.status },
          ])} />
        </TabsContent>

        <TabsContent value="piutang">
          {(() => {
            const piutang = inv.filter((i) => i.status === "unpaid" || i.status === "partial" || i.status === "overdue");
            return (
              <ReportTable title="Laporan Piutang" rows={piutang} cols={[
                { h: "Invoice", get: (r: any) => r.invoice },
                { h: "Payer", get: (r: any) => r.payer },
                { h: "Jatuh Tempo", get: (r: any) => new Date(r.dueDate).toLocaleDateString("id-ID") },
                { h: "Total", align: "right", get: (r: any) => formatIDR(r.total) },
                { h: "Sisa", align: "right", get: (r: any) => formatIDR(r.total - r.paid) },
                { h: "Status", get: (r: any) => r.status },
              ]} onExport={() => csv("piutang", piutang, [
                { key: "i", label: "Invoice", get: (r: any) => r.invoice },
                { key: "p", label: "Payer", get: (r: any) => r.payer },
                { key: "d", label: "Jatuh Tempo", get: (r: any) => r.dueDate },
                { key: "t", label: "Total", get: (r: any) => r.total },
                { key: "s", label: "Sisa", get: (r: any) => r.total - r.paid },
                { key: "st", label: "Status", get: (r: any) => r.status },
              ])} />
            );
          })()}
        </TabsContent>

        <TabsContent value="pengeluaran">
          <ReportTable title="Laporan Pengeluaran" rows={exp} cols={[
            { h: "No", get: (r: any) => r.number },
            { h: "Vendor", get: (r: any) => r.vendor },
            { h: "Kategori", get: (r: any) => r.category },
            { h: "Tanggal", get: (r: any) => new Date(r.date).toLocaleDateString("id-ID") },
            { h: "Nominal", align: "right", get: (r: any) => formatIDR(r.amount) },
            { h: "Pajak", align: "right", get: (r: any) => formatIDR(r.tax) },
            { h: "Status", get: (r: any) => r.status },
          ]} onExport={() => csv("pengeluaran", exp, [
            { key: "n", label: "No", get: (r: any) => r.number },
            { key: "v", label: "Vendor", get: (r: any) => r.vendor },
            { key: "a", label: "Nominal", get: (r: any) => r.amount },
            { key: "t", label: "Pajak", get: (r: any) => r.tax },
            { key: "s", label: "Status", get: (r: any) => r.status },
          ])} />
        </TabsContent>

        <TabsContent value="pajak">
          {(() => {
            const rev = inv.reduce((a, r) => a + (r.status === "paid" ? r.total : r.paid), 0);
            const ppnOut = Math.round(rev * 0.11);
            const ppnIn = exp.filter((e) => e.status === "paid").reduce((a, e) => a + e.tax, 0);
            const drFee = Math.round(rev * 0.4 * 0.05);
            const rows = [
              { jenis: "PPN Pendapatan", base: rev, amount: ppnOut },
              { jenis: "PPN Masukan", base: exp.reduce((a, e) => a + e.amount, 0), amount: ppnIn },
              { jenis: "PPh 21 Dokter", base: Math.round(rev * 0.4), amount: drFee },
              { jenis: "Pajak Bersih (estimasi)", base: 0, amount: ppnOut - ppnIn + drFee },
            ];
            return (
              <ReportTable title="Laporan Pajak" rows={rows} cols={[
                { h: "Jenis", get: (r: any) => r.jenis },
                { h: "DPP", align: "right", get: (r: any) => r.base ? formatIDR(r.base) : "—" },
                { h: "Pajak", align: "right", get: (r: any) => formatIDR(r.amount) },
              ]} onExport={() => csv("pajak", rows, [
                { key: "j", label: "Jenis", get: (r: any) => r.jenis },
                { key: "d", label: "DPP", get: (r: any) => r.base },
                { key: "p", label: "Pajak", get: (r: any) => r.amount },
              ])} />
            );
          })()}
        </TabsContent>

        <TabsContent value="bank">
          {(() => {
            const filtered = bankMutations.filter((m) => {
              const d = new Date(m.date);
              if (d.getFullYear() !== year) return false;
              if (month !== "all" && d.getMonth() !== Number(month)) return false;
              return true;
            });
            return (
              <ReportTable title="Laporan Bank" rows={filtered} cols={[
                { h: "Tanggal", get: (r: any) => new Date(r.date).toLocaleDateString("id-ID") },
                { h: "Bank", get: (r: any) => master.banks.find((b) => b.id === r.bankId)?.name },
                { h: "Deskripsi", get: (r: any) => r.description },
                { h: "Masuk", align: "right", get: (r: any) => r.amount > 0 ? formatIDR(r.amount) : "—" },
                { h: "Keluar", align: "right", get: (r: any) => r.amount < 0 ? formatIDR(Math.abs(r.amount)) : "—" },
                { h: "Status", get: (r: any) => r.matched ? "Reconciled" : "Open" },
              ]} onExport={() => csv("bank", filtered, [
                { key: "d", label: "Tanggal", get: (r: any) => r.date },
                { key: "desc", label: "Deskripsi", get: (r: any) => r.description },
                { key: "amt", label: "Nominal", get: (r: any) => r.amount },
                { key: "m", label: "Matched", get: (r: any) => r.matched ? "Yes" : "No" },
              ])} />
            );
          })()}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ReportCard({ title, children, onExport }: { title: string; children: React.ReactNode; onExport?: () => void }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="font-semibold">{title}</div>
        {onExport && <Button size="sm" variant="outline" className="gap-1" onClick={onExport}><Download className="h-4 w-4" /> CSV</Button>}
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function ReportRow({ label, val, bold }: { label: string; val: number | string; bold?: boolean }) {
  return (
    <div className={`flex justify-between border-b border-border/40 py-2 ${bold ? "font-semibold" : ""}`}>
      <span className={bold ? "" : "text-muted-foreground"}>{label}</span>
      <span className="font-mono">{typeof val === "number" ? formatIDR(val) : val}</span>
    </div>
  );
}

function ReportTable({ title, rows, cols, onExport }: { title: string; rows: any[]; cols: { h: string; align?: "right"; get: (r: any) => any }[]; onExport: () => void }) {
  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border p-3">
        <div className="font-semibold">{title}</div>
        <Button size="sm" variant="outline" className="gap-1" onClick={onExport}><Download className="h-4 w-4" /> CSV</Button>
      </div>
      <div className="max-h-[60vh] overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>{cols.map((c, i) => <TableHead key={i} className={c.align === "right" ? "text-right" : ""}>{c.h}</TableHead>)}</TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow><TableCell colSpan={cols.length} className="py-10 text-center text-sm text-muted-foreground">Tidak ada data untuk periode ini.</TableCell></TableRow>
            ) : rows.slice(0, 80).map((r, i) => (
              <TableRow key={i}>
                {cols.map((c, j) => <TableCell key={j} className={`text-xs ${c.align === "right" ? "text-right font-mono" : ""}`}>{c.get(r)}</TableCell>)}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
