import { createFileRoute, Link } from "@tanstack/react-router";
import { pageHead } from "@/lib/page-head";
import { PageHeader } from "@/components/app-shell";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { listExpenses } from "@/lib/finance-tx.functions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, FileDown } from "lucide-react";
import { generateVoucherPDF, downloadPDF } from "@/lib/pdf-templates";


export const Route = createFileRoute("/_authenticated/finance/voucher-bkk")({
  
  head: () => pageHead({ title: "Voucher BKK (Pengeluaran) — Finance", description: "Voucher BKK (Pengeluaran) pada modul keuangan klinik.", path: "/finance/voucher-bkk" }),
  component: Page,
});

const fmt = (n: number) => "Rp " + (Number(n) || 0).toLocaleString("id-ID");

function Page() {
  const fn = useServerFn(listExpenses);
  const { data, isLoading } = useQuery({ queryKey: ["fin-bkk"], queryFn: () => fn({ data: {} }) });
  const rows = (data?.rows ?? []).filter((r: any) => r.status !== "void");

  return (
    <div>
      <PageHeader title="Voucher BKK (Bukti Kas/Bank Keluar)" desc="Daftar voucher pengeluaran (kas atau bank) untuk vendor, biaya operasional, dan lainnya." />
      <div className="mb-3 flex justify-end">
        <Button asChild><Link to="/finance/pengeluaran">+ Voucher Baru</Link></Button>
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader><TableRow>
            <TableHead>No. Voucher</TableHead><TableHead>Tanggal</TableHead><TableHead>Vendor / Penerima</TableHead>
            <TableHead>Metode</TableHead><TableHead className="text-right">Total</TableHead>
            <TableHead className="text-right">Sisa</TableHead><TableHead>Status</TableHead>
            <TableHead className="text-right">PDF</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={8} className="py-12 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></TableCell></TableRow>
              : rows.length === 0 ? <TableRow><TableCell colSpan={8} className="py-12 text-center text-sm text-muted-foreground">Belum ada voucher BKK.</TableCell></TableRow>
              : rows.map((r: any) => {
                const sisa = Number(r.total) - Number(r.dibayar ?? 0);
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.no_voucher}</TableCell>
                    <TableCell>{r.tanggal}</TableCell>
                    <TableCell>{r.vendor_name ?? r.penerima ?? "-"}</TableCell>
                    <TableCell className="text-sm">{r.metode ?? "transfer"}</TableCell>
                    <TableCell className="text-right font-mono">{fmt(r.total)}</TableCell>
                    <TableCell className="text-right font-mono">{fmt(sisa)}</TableCell>
                    <TableCell><Badge variant="secondary" className={r.status === "posted" || r.status === "paid" ? "bg-emerald-500/15 text-emerald-700" : "bg-muted text-muted-foreground"}>{r.status}</Badge></TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" className="h-7 gap-1" onClick={() => {
                        const doc = generateVoucherPDF({
                          jenis: "BKK",
                          no_voucher: r.no_voucher,
                          tanggal: r.tanggal,
                          pihak_label: "Dibayarkan kepada",
                          pihak_nama: r.vendor_name ?? r.penerima ?? "-",
                          keterangan: r.keterangan ?? "",
                          metode: r.metode,
                          bank: r.bank,
                          items: [{ label: r.keterangan ?? "Pengeluaran", nominal: Number(r.subtotal ?? r.total) || 0 }, ...(r.pajak ? [{ label: "Pajak", nominal: Number(r.pajak) }] : [])],
                          total: Number(r.total) || 0,
                        });
                        downloadPDF(doc, `BKK-${r.no_voucher}.pdf`);
                      }}>
                        <FileDown className="h-3.5 w-3.5" /> PDF
                      </Button>
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
