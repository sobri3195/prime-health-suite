import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/lib/page-head";
import { PageHeader } from "@/components/app-shell";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { listPayments } from "@/lib/finance-tx.functions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, FileDown } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { generateVoucherPDF, downloadPDF } from "@/lib/pdf-templates";


export const Route = createFileRoute("/_authenticated/finance/voucher-bbk")({
  
  head: () => pageHead({ title: "Voucher BBK (Penerimaan) — Finance", description: "Voucher BBK (Penerimaan) pada modul keuangan klinik.", path: "/finance/voucher-bbk" }),
  component: Page,
});

const fmt = (n: number) => "Rp " + (Number(n) || 0).toLocaleString("id-ID");

function Page() {
  const fn = useServerFn(listPayments);
  const { data, isLoading } = useQuery({ queryKey: ["fin-bbk"], queryFn: () => fn({ data: {} }) });
  const rows = (data?.rows ?? []).filter((r: any) => r.status !== "void");

  return (
    <div>
      <PageHeader title="Voucher BBK (Bukti Bank/Kas Masuk)" desc="Daftar penerimaan pembayaran invoice dari pasien/payer." />
      <div className="mb-3 flex justify-end">
        <Button asChild><Link to="/finance/piutang">Catat dari Piutang</Link></Button>
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader><TableRow>
            <TableHead>No. Bukti</TableHead><TableHead>Tanggal</TableHead><TableHead>Invoice</TableHead>
            <TableHead>Metode</TableHead><TableHead className="text-right">Jumlah</TableHead><TableHead>Status</TableHead>
            <TableHead className="text-right">PDF</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={7} className="py-12 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></TableCell></TableRow>
              : rows.length === 0 ? <TableRow><TableCell colSpan={7} className="py-12 text-center text-muted-foreground text-sm">Belum ada penerimaan.</TableCell></TableRow>
              : rows.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">{r.no_bukti}</TableCell>
                  <TableCell>{r.tanggal}</TableCell>
                  <TableCell className="font-mono text-xs">{r.invoice_no}</TableCell>
                  <TableCell>{r.metode}</TableCell>
                  <TableCell className="text-right font-mono">{fmt(r.jumlah)}</TableCell>
                  <TableCell>{r.status}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" className="h-7 gap-1" onClick={async () => {
                      const doc = await generateVoucherPDF({
                        jenis: "BBK",
                        no_voucher: r.no_bukti,
                        tanggal: r.tanggal,
                        pihak_label: "Diterima dari",
                        pihak_nama: r.patient_name ?? r.payer_name ?? r.invoice_no ?? "-",
                        keterangan: `Pelunasan invoice ${r.invoice_no ?? ""}`,
                        metode: r.metode,
                        bank: r.bank,
                        items: [
                          { label: `Pembayaran invoice ${r.invoice_no ?? ""}`, nominal: Number(r.jumlah) || 0 },
                          ...(r.mdr ? [{ label: "Potongan MDR", nominal: -Number(r.mdr) }] : []),
                        ],
                        total: Number(r.netto ?? r.jumlah) || 0,
                      });
                      downloadPDF(doc, `BBK-${r.no_bukti}.pdf`);
                    }}>
                      <FileDown className="h-3.5 w-3.5" /> PDF
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>

      </div>
    </div>
  );
}
