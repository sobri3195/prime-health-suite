import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Search, X } from "lucide-react";
import { drillCoa } from "@/lib/finance-report.functions";

const fmt = (n: number) => (Number(n) || 0).toLocaleString("id-ID");

export function FinanceDrillDialog({
  open, onClose, coa_code, coa_name, entry_id, from, to, title,
}: {
  open: boolean;
  onClose: () => void;
  coa_code?: string;
  coa_name?: string;
  entry_id?: string;
  from?: string;
  to?: string;
  title?: string;
}) {
  const fn = useServerFn(drillCoa);
  const { data, isLoading } = useQuery({
    enabled: open,
    queryKey: ["drill", coa_code, entry_id, from, to],
    queryFn: () => fn({ data: { coa_code, entry_id, from, to } }),
  });

  const [q, setQ] = useState("");
  const [sumberFilter, setSumberFilter] = useState<string>("all");

  const allLines: any[] = data?.lines ?? [];
  const sumberOptions = useMemo(() => {
    const set = new Set<string>();
    allLines.forEach((l) => l.sumber && set.add(l.sumber));
    return Array.from(set);
  }, [allLines]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return allLines.filter((l) => {
      if (sumberFilter !== "all" && l.sumber !== sumberFilter) return false;
      if (!needle) return true;
      return [l.no_jurnal, l.ref_no, l.coa_code, l.coa_nama, l.keterangan, l.entry_keterangan]
        .some((v) => v && String(v).toLowerCase().includes(needle));
    });
  }, [allLines, q, sumberFilter]);

  const sumD = filtered.reduce((a, l) => a + (Number(l.debit) || 0), 0);
  const sumK = filtered.reduce((a, l) => a + (Number(l.kredit) || 0), 0);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {title ?? (coa_code ? `Detail Jurnal ${coa_code}${coa_name ? " — " + coa_name : ""}` : "Detail Jurnal")}
          </DialogTitle>
        </DialogHeader>

        <div className="mb-2 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari no. jurnal, no. invoice/voucher, COA, atau keterangan…"
              className="h-9 pl-8 pr-8"
            />
            {q && (
              <button onClick={() => setQ("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          {sumberOptions.length > 1 && (
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">Sumber:</span>
              <Button size="sm" variant={sumberFilter === "all" ? "default" : "outline"} className="h-8" onClick={() => setSumberFilter("all")}>Semua</Button>
              {sumberOptions.map((s) => (
                <Button key={s} size="sm" variant={sumberFilter === s ? "default" : "outline"} className="h-8" onClick={() => setSumberFilter(s)}>{s}</Button>
              ))}
            </div>
          )}
        </div>

        <div className="text-xs text-muted-foreground">
          Periode {from ?? "—"} s/d {to ?? "—"} • {filtered.length} / {allLines.length} baris •
          Total D <b>{fmt(sumD)}</b> / K <b>{fmt(sumK)}</b>
          {(sumD !== sumK) && <span className="ml-2 text-rose-600">⚠ Tidak balance</span>}
        </div>

        <div className="overflow-hidden rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead>No. Jurnal</TableHead>
                <TableHead>Sumber</TableHead>
                <TableHead>Ref</TableHead>
                {!coa_code && <TableHead>COA</TableHead>}
                <TableHead>Keterangan</TableHead>
                <TableHead className="text-right">Debit</TableHead>
                <TableHead className="text-right">Kredit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} className="py-8 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">
                  {allLines.length === 0 ? "Belum ada entri." : "Tidak ada baris yang cocok dengan pencarian."}
                </TableCell></TableRow>
              ) : filtered.map((l: any) => (
                <TableRow key={l.id}>
                  <TableCell className="whitespace-nowrap text-xs">{l.tanggal}</TableCell>
                  <TableCell className="font-mono text-xs">{l.no_jurnal}</TableCell>
                  <TableCell><Badge variant="secondary" className="text-[10px]">{l.sumber}</Badge></TableCell>
                  <TableCell className="font-mono text-xs">{l.ref_no ?? "—"}</TableCell>
                  {!coa_code && <TableCell className="font-mono text-xs">{l.coa_code}</TableCell>}
                  <TableCell className="max-w-sm truncate text-xs">{l.keterangan ?? l.entry_keterangan}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{l.debit ? fmt(l.debit) : ""}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{l.kredit ? fmt(l.kredit) : ""}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
