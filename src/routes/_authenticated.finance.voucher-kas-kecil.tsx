import { createFileRoute, Link } from "@tanstack/react-router";
import { pageHead } from "@/lib/page-head";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, FileDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { generateVoucherPDF, downloadPDF } from "@/lib/pdf-templates";


export const Route = createFileRoute("/_authenticated/finance/voucher-kas-kecil")({
  
  head: () => pageHead({ title: "Voucher Kas Kecil — Finance", description: "Voucher Kas Kecil pada modul keuangan klinik.", path: "/finance/voucher-kas-kecil" }),
  component: Page,
});

const fmt = (n: number) => "Rp " + (Number(n) || 0).toLocaleString("id-ID");

function Page() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("fin_kas_kecil").select("*").order("tanggal", { ascending: false }).limit(200)
      .then(({ data }) => { setRows(data ?? []); setLoading(false); });
  }, []);

  const isMasuk = (t: any) => t === "masuk" || t === "in" || t === "penerimaan" || t === "replenish";
  const sum = useMemo(() => {
    let masuk = 0, keluar = 0;
    for (const r of rows.filter((r) => r.status !== "void")) {
      if (isMasuk(r.tipe)) masuk += Number(r.amount || 0);
      else keluar += Number(r.amount || 0);
    }
    return { masuk, keluar, saldo: masuk - keluar };
  }, [rows]);

  return (
    <div>
      <PageHeader title="Voucher Kas Kecil" desc="Daftar voucher penerimaan, pengeluaran, dan replenish kas kecil." />
      <div className="mb-3 grid gap-3 md:grid-cols-3">
        <Kpi label="Total Masuk" value={fmt(sum.masuk)} />
        <Kpi label="Total Keluar" value={fmt(sum.keluar)} />
        <Kpi label="Saldo Berjalan" value={fmt(sum.saldo)} />
      </div>
      <div className="mb-3 flex justify-end">
        <Button asChild><Link to="/finance/kas-kecil">+ Voucher Kas Kecil</Link></Button>
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader><TableRow>
            <TableHead>No. Voucher</TableHead><TableHead>Tanggal</TableHead><TableHead>Tipe</TableHead>
            <TableHead>Penerima/Pembayar</TableHead><TableHead>Keterangan</TableHead>
            <TableHead className="text-right">Jumlah</TableHead><TableHead>Status</TableHead>
            <TableHead className="text-right">PDF</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {loading ? <TableRow><TableCell colSpan={8} className="py-12 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></TableCell></TableRow>
              : rows.length === 0 ? <TableRow><TableCell colSpan={8} className="py-12 text-center text-sm text-muted-foreground">Belum ada voucher kas kecil.</TableCell></TableRow>
              : rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">{r.no_voucher}</TableCell>
                  <TableCell>{r.tanggal}</TableCell>
                  <TableCell><Badge variant="secondary" className={r.tipe === "penerimaan" || r.tipe === "replenish" ? "bg-emerald-500/15 text-emerald-700" : "bg-rose-500/15 text-rose-700"}>{r.tipe}</Badge></TableCell>
                  <TableCell>{r.penerima ?? "-"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.keterangan ?? ""}</TableCell>
                  <TableCell className="text-right font-mono">{fmt(r.amount)}</TableCell>
                  <TableCell><Badge variant="outline">{r.status}</Badge></TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" className="h-7 gap-1" onClick={async () => {
                      const isIn = r.tipe === "penerimaan" || r.tipe === "replenish";
                      const doc = await generateVoucherPDF({
                        jenis: "KAS KECIL",
                        no_voucher: r.no_voucher,
                        tanggal: r.tanggal,
                        pihak_label: isIn ? "Diterima dari" : "Dibayarkan kepada",
                        pihak_nama: r.penerima ?? "-",
                        keterangan: r.keterangan ?? "",
                        items: [{ label: `${r.tipe.toUpperCase()} — ${r.keterangan ?? ""}`, nominal: Number(r.amount) || 0 }],
                        total: Number(r.amount) || 0,
                      });
                      downloadPDF(doc, `KK-${r.no_voucher}.pdf`);
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

function Kpi({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-border bg-card p-4"><div className="text-xs text-muted-foreground">{label}</div><div className="mt-1 text-lg font-semibold">{value}</div></div>;
}
