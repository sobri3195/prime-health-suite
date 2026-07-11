import { createFileRoute, Link } from "@tanstack/react-router";
import { pageHead } from "@/lib/page-head";
import { PageHeader } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Upload, ArrowRight, FileUp, Loader2 } from "lucide-react";
import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { bulkImportFinMaster, exportFinMaster, type FinTable } from "@/lib/finance-master.functions";
import { toast } from "sonner";
import { exportCsv } from "@/lib/exporter";

export const Route = createFileRoute("/_authenticated/finance/import-export")({
  head: () => pageHead({ title: "Import / Export — Finance", description: "Import / Export pada modul keuangan klinik.", path: "/finance/import-export" }),
  component: Page,
});

// Tables allowed for CSV bulk import (master data only — no transactional).
const IMPORT_TABLES: { value: FinTable; label: string; headers: string[] }[] = [
  { value: "fin_coa", label: "COA", headers: ["code", "name", "type", "parent_code", "cash_flow_section", "is_active"] },
  { value: "fin_cost_center", label: "Cost Center", headers: ["code", "name", "pic", "is_active"] },
  { value: "fin_dokter", label: "Dokter", headers: ["code", "name", "spesialisasi", "default_fee_pct", "npwp", "phone", "sip_number", "is_active"] },
  { value: "fin_karyawan", label: "Karyawan", headers: ["code", "name", "jabatan", "gaji_pokok", "npwp", "is_active"] },
  { value: "fin_payer", label: "Payer", headers: ["code", "name", "tipe", "term_hari", "is_active"] },
  { value: "fin_vendor", label: "Vendor", headers: ["code", "name", "kategori", "npwp", "term_hari", "is_active"] },
  { value: "fin_layanan", label: "Layanan", headers: ["code", "name", "kategori_code", "tarif", "is_kena_pajak", "is_active"] },
  { value: "fin_kategori_layanan", label: "Kategori Layanan", headers: ["code", "name", "is_active"] },
  { value: "fin_tarif_pajak", label: "Tarif Pajak", headers: ["code", "name", "jenis", "tarif_pct", "is_active"] },
];

// Minimal CSV parser: handles quoted values with commas and escaped quotes.
function parseCSV(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = "";
  let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') { inQ = false; }
      else { field += c; }
    } else {
      if (c === '"') inQ = true;
      else if (c === ",") { cur.push(field); field = ""; }
      else if (c === "\n") { cur.push(field); rows.push(cur); cur = []; field = ""; }
      else if (c === "\r") { /* skip */ }
      else field += c;
    }
  }
  if (field.length > 0 || cur.length > 0) { cur.push(field); rows.push(cur); }
  const filtered = rows.filter((r) => r.some((v) => v.trim() !== ""));
  if (filtered.length < 2) return [];
  const [header, ...rest] = filtered;
  const keys = header.map((h) => h.trim());
  return rest.map((r) => Object.fromEntries(keys.map((k, i) => [k, (r[i] ?? "").trim()])));
}

function Page() {
  const items = [
    { to: "/finance/rekonsiliasi", title: "Import Mutasi Bank (CSV)", desc: "Upload mutasi bank untuk rekonsiliasi.", icon: Upload },
    { to: "/finance/laba-rugi", title: "Export Laba Rugi (CSV/PDF)", desc: "Download laporan laba rugi.", icon: Download },
    { to: "/finance/neraca", title: "Export Neraca (CSV/PDF)", desc: "Download neraca saldo.", icon: Download },
    { to: "/finance/arus-kas", title: "Export Arus Kas (CSV/PDF)", desc: "Download arus kas.", icon: Download },
    { to: "/finance/jurnal", title: "Export Jurnal (CSV)", desc: "Download jurnal & buku besar.", icon: Download },
    { to: "/finance/audit", title: "Export Audit Log (CSV)", desc: "Download log aktivitas finance.", icon: Download },
  ];
  return (
    <div>
      <PageHeader title="Import / Export Data" desc="Pintasan untuk import & export data finance." />
      <MasterCsvImporter />
      <div className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {items.map((i) => {
          const Icon = i.icon;
          return (
            <Link key={i.to} to={i.to}>
              <Card className="p-4 hover:bg-accent transition">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex gap-3">
                    <Icon className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <div className="font-semibold">{i.title}</div>
                      <div className="mt-1 text-sm text-muted-foreground">{i.desc}</div>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function MasterCsvImporter() {
  const [table, setTable] = useState<FinTable>("fin_coa");
  const [result, setResult] = useState<{ inserted: number; total: number; errors: { row: number; message: string }[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();
  const call = useServerFn(bulkImportFinMaster);
  const callExport = useServerFn(exportFinMaster);
  const m = useMutation({
    mutationFn: (rows: Record<string, string>[]) => call({ data: { table, rows } }),
    onSuccess: (r) => {
      setResult(r);
      qc.invalidateQueries({ queryKey: ["fin-master", table] });
      if (r.inserted > 0) toast.success(`${r.inserted} baris berhasil diimpor${r.errors.length ? `, ${r.errors.length} gagal` : ""}.`);
      else toast.error("Tidak ada baris yang berhasil diimpor.");
    },
    onError: (e: any) => toast.error(e?.message ?? "Gagal impor CSV"),
  });
  const [exporting, setExporting] = useState(false);
  const doExport = async () => {
    setExporting(true);
    try {
      const r = await callExport({ data: { table } });
      const cols = r.columns.map((k) => ({ key: k, header: k }));
      exportCsv(`export-${table}-${new Date().toISOString().slice(0, 10)}.csv`, cols, r.rows);
      toast.success(`Export ${r.rows.length} baris.`);
    } catch (e: any) {
      toast.error(e?.message ?? "Gagal export");
    } finally {
      setExporting(false);
    }
  };

  const current = IMPORT_TABLES.find((t) => t.value === table)!;

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 2 * 1024 * 1024) { toast.error("Ukuran file maks 2MB."); return; }
    const text = await f.text();
    const rows = parseCSV(text);
    if (rows.length === 0) { toast.error("CSV kosong atau format tidak valid."); return; }
    if (rows.length > 2000) { toast.error("Maks 2000 baris per import."); return; }
    setResult(null);
    m.mutate(rows);
    if (fileRef.current) fileRef.current.value = "";
  };

  const downloadTemplate = () => {
    const csv = current.headers.join(",") + "\n";
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `template-${current.value}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <FileUp className="h-5 w-5 text-primary" />
        <div className="font-semibold">Import CSV Master Data</div>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <div className="grid gap-1.5">
          <label className="text-xs text-muted-foreground">Tabel Tujuan</label>
          <select
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            value={table}
            onChange={(e) => { setTable(e.target.value as FinTable); setResult(null); }}
            disabled={m.isPending}
          >
            {IMPORT_TABLES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <Button type="button" variant="outline" onClick={downloadTemplate} disabled={m.isPending} aria-label={`Unduh template CSV ${current.label}`}>
          <Download className="h-4 w-4 mr-2" />Template
        </Button>
        <Button type="button" variant="outline" onClick={doExport} disabled={m.isPending || exporting} aria-label={`Export ${current.label} ke CSV`}>
          {exporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
          Export
        </Button>
        <div className="grid gap-1.5">
          <label className="text-xs text-muted-foreground">File CSV (maks 2MB / 2000 baris)</label>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            onChange={onFile}
            disabled={m.isPending}
            className="text-sm file:mr-3 file:rounded file:border file:border-input file:bg-background file:px-3 file:py-1.5 file:text-sm file:cursor-pointer"
          />
        </div>
        {m.isPending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>
      <div className="mt-2 text-xs text-muted-foreground">
        Header CSV: <code>{current.headers.join(", ")}</code>
      </div>
      {result && (
        <div className="mt-3 rounded-md border border-border bg-muted/40 p-3 text-sm">
          <div>
            Berhasil <strong className="text-emerald-600">{result.inserted}</strong> / {result.total} baris.
            {result.errors.length > 0 && <> Gagal <strong className="text-rose-600">{result.errors.length}</strong>.</>}
          </div>
          {result.errors.length > 0 && (
            <ul className="mt-2 max-h-40 overflow-y-auto text-xs space-y-0.5">
              {result.errors.slice(0, 20).map((e, i) => (
                <li key={i} className="text-rose-600">Baris {e.row}: {e.message}</li>
              ))}
              {result.errors.length > 20 && <li className="text-muted-foreground">…{result.errors.length - 20} lainnya</li>}
            </ul>
          )}
        </div>
      )}
    </Card>
  );
}
