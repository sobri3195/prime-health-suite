import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Download, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { ledger, journals, periodFilter } from "@/lib/journal";
import { master } from "@/data/financeData";
import { formatIDR } from "@/lib/finance";
import { downloadCSV, exportFileName, toCSV } from "@/lib/export";

export const Route = createFileRoute("/_authenticated/finance/buku-besar")({ component: BukuBesarPage });

const MONTHS = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agt","Sep","Okt","Nov","Des"];

function BukuBesarPage() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState<string>("all");
  const [accountCode, setAccountCode] = useState<string>("all");
  const [drill, setDrill] = useState<string | null>(null);

  const rows = useMemo(() =>
    ledger(periodFilter(month === "all" ? "all" : Number(month), year)),
    [year, month]
  );

  const filtered = useMemo(() => rows.filter((r) =>
    accountCode === "all" || r.account === accountCode
  ), [rows, accountCode]);

  const drillJournals = useMemo(() => {
    if (!drill) return [];
    return journals.filter((j) => {
      if (!j.lines.some((l) => l.account === drill)) return false;
      const d = new Date(j.date);
      if (d.getFullYear() !== year) return false;
      if (month !== "all" && d.getMonth() !== Number(month)) return false;
      return true;
    });
  }, [drill, year, month]);

  const exportCSV = () => {
    const csv = toCSV(filtered, [
      { key: "code", label: "Akun", get: (r) => `${r.account} – ${r.accountName}` },
      { key: "type", label: "Tipe", get: (r) => r.type },
      { key: "open", label: "Saldo Awal", get: (r) => r.opening },
      { key: "deb", label: "Debit", get: (r) => r.debit },
      { key: "cre", label: "Kredit", get: (r) => r.credit },
      { key: "close", label: "Saldo Akhir", get: (r) => r.closing },
    ]);
    downloadCSV(exportFileName("buku-besar", `${year}-${month}`), csv);
    toast.success(`Export ${filtered.length} akun (CSV)`);
  };

  return (
    <div>
      <PageHeader title="Buku Besar" desc="Saldo per akun dari semua jurnal yang ter-posting. Drilldown ke jurnal sumber." />

      <div className="mb-3 flex flex-wrap items-center gap-2">
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
        <Select value={accountCode} onValueChange={setAccountCode}>
          <SelectTrigger className="w-[260px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Akun</SelectItem>
            {master.coa.map((c) => <SelectItem key={c.code} value={c.code}>{c.code} – {c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="outline" className="gap-1" onClick={exportCSV}><Download className="h-4 w-4" /> Export CSV</Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kode</TableHead>
              <TableHead>Akun</TableHead>
              <TableHead>Tipe</TableHead>
              <TableHead className="text-right">Saldo Awal</TableHead>
              <TableHead className="text-right">Debit</TableHead>
              <TableHead className="text-right">Kredit</TableHead>
              <TableHead className="text-right">Saldo Akhir</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="py-16 text-center text-sm text-muted-foreground">Tidak ada data buku besar.</TableCell></TableRow>
            ) : filtered.map((r) => (
              <TableRow key={r.account} className="cursor-pointer hover:bg-muted/40" onClick={() => setDrill(r.account)}>
                <TableCell className="font-mono text-xs">{r.account}</TableCell>
                <TableCell>{r.accountName}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{r.type}</TableCell>
                <TableCell className="text-right font-mono text-xs">{formatIDR(r.opening)}</TableCell>
                <TableCell className="text-right font-mono text-xs">{formatIDR(r.debit)}</TableCell>
                <TableCell className="text-right font-mono text-xs">{formatIDR(r.credit)}</TableCell>
                <TableCell className="text-right font-mono text-sm font-semibold">{formatIDR(r.closing)}</TableCell>
                <TableCell><ChevronRight className="h-4 w-4 text-muted-foreground" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!drill} onOpenChange={(o) => !o && setDrill(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>Drilldown – {drill} {master.coa.find((c) => c.code === drill)?.name}</DialogTitle></DialogHeader>
          <div className="max-h-[60vh] overflow-auto">
            <Table>
              <TableHeader><TableRow><TableHead>No Jurnal</TableHead><TableHead>Tanggal</TableHead><TableHead>Deskripsi</TableHead><TableHead className="text-right">Debit</TableHead><TableHead className="text-right">Kredit</TableHead></TableRow></TableHeader>
              <TableBody>
                {drillJournals.map((j) => {
                  const l = j.lines.find((x) => x.account === drill)!;
                  return (
                    <TableRow key={j.id}>
                      <TableCell className="font-mono text-xs">{j.number}</TableCell>
                      <TableCell className="text-xs">{new Date(j.date).toLocaleDateString("id-ID")}</TableCell>
                      <TableCell className="text-xs">{j.description}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{l.debit ? formatIDR(l.debit) : "—"}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{l.credit ? formatIDR(l.credit) : "—"}</TableCell>
                    </TableRow>
                  );
                })}
                {drillJournals.length === 0 && <TableRow><TableCell colSpan={5} className="py-8 text-center text-xs text-muted-foreground">Tidak ada jurnal untuk akun ini.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
