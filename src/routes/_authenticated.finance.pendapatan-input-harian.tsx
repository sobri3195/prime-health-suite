import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/lib/page-head";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/app-shell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatIDR } from "@/lib/finance";
import { listFinMaster } from "@/lib/finance-master.functions";
import { createInvoice } from "@/lib/finance-pendapatan.functions";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/finance/pendapatan-input-harian")({
  
  head: () => pageHead({ title: "Input Pendapatan Harian — Finance", description: "Input Pendapatan Harian pada modul keuangan klinik.", path: "/finance/pendapatan-input-harian" }),
  component: Page,
});

type Item = { layanan_id: string | null; layanan_nama: string; tarif: number; qty: number };
type Pay = { metode: "cash" | "transfer" | "edc" | "qris" | "piutang"; bank: string; jumlah: number; mdr: number };

function Page() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);
  const [tanggal, setTanggal] = useState(today);
  const [kasir, setKasir] = useState(user?.email ?? "Kasir");
  const [patientCode, setPatientCode] = useState("");
  const [patientName, setPatientName] = useState("");
  const [dokterId, setDokterId] = useState<string>("");
  const [payerId, setPayerId] = useState<string>("");
  const [pajakPersen, setPajakPersen] = useState(11);

  const list = useServerFn(listFinMaster);
  const dokter = useQuery({ queryKey: ["fin", "fin_dokter"], queryFn: () => list({ data: { table: "fin_dokter" } }) });
  const payer = useQuery({ queryKey: ["fin", "fin_payer"], queryFn: () => list({ data: { table: "fin_payer" } }) });
  const layanan = useQuery({ queryKey: ["fin", "fin_layanan"], queryFn: () => list({ data: { table: "fin_layanan" } }) });

  const layananRows = (layanan.data?.rows ?? []) as unknown as Array<{ id: string; name: string; tarif: number }>;
  const dokterRows = (dokter.data?.rows ?? []) as unknown as Array<{ id: string; name: string }>;
  const payerRows = (payer.data?.rows ?? []) as unknown as Array<{ id: string; name: string }>;

  const [items, setItems] = useState<Item[]>([]);
  useEffect(() => {
    if (items.length === 0 && layananRows.length > 0) {
      const f = layananRows[0];
      setItems([{ layanan_id: f.id, layanan_nama: f.name, tarif: Number(f.tarif), qty: 1 }]);
    }
  }, [layananRows.length]);

  const subtotal = useMemo(() => items.reduce((a, i) => a + i.tarif * i.qty, 0), [items]);
  const pajak = Math.round((subtotal * pajakPersen) / 100);
  const total = subtotal + pajak;

  const [pays, setPays] = useState<Pay[]>([{ metode: "cash", bank: "", jumlah: 0, mdr: 0 }]);
  useEffect(() => {
    if (pays.length === 1) setPays([{ ...pays[0], jumlah: total }]);
  }, [total]);

  const updateItem = (idx: number, patch: Partial<Item>) =>
    setItems((arr) => arr.map((r, i) => (i === idx ? { ...r, ...patch } : r)));

  const create = useMutation({
    mutationFn: (vars: Parameters<typeof createInvoice>[0]["data"]) => createInvoice({ data: vars }),
    onSuccess: (res: { id: string; no_invoice: string; total: number }) => {
      toast.success(`Tersimpan ${res.no_invoice} · ${formatIDR(res.total)}`);
      setPatientCode(""); setPatientName("");
      const f = layananRows[0];
      setItems(f ? [{ layanan_id: f.id, layanan_nama: f.name, tarif: Number(f.tarif), qty: 1 }] : []);
      setPays([{ metode: "cash", bank: "", jumlah: 0, mdr: 0 }]);
      qc.invalidateQueries({ queryKey: ["fin-invoices"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const submit = () => {
    if (!patientCode) { toast.error("Patient code wajib"); return; }
    if (items.length === 0) { toast.error("Minimal 1 item"); return; }
    const sumPay = pays.reduce((a, p) => a + p.jumlah, 0);
    if (Math.abs(sumPay - total) > 1) { toast.error(`Pembayaran ${formatIDR(sumPay)} ≠ total ${formatIDR(total)}`); return; }
    create.mutate({
      tanggal, patient_code: patientCode, patient_name: patientName || null,
      dokter_id: dokterId || null, payer_id: payerId || null, kasir,
      pajak_persen: pajakPersen,
      items: items.map((i) => ({ layanan_id: i.layanan_id, layanan_nama: i.layanan_nama, tarif: i.tarif, qty: i.qty })),
      pembayaran: pays.map((p) => ({ metode: p.metode, bank: p.bank || null, jumlah: p.jumlah, mdr: p.mdr })),
    });
  };

  return (
    <div>
      <PageHeader title="Input Pendapatan Harian" desc="Input transaksi harian dari kasir → tersimpan ke database & dapat dipakai untuk laporan." />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5 lg:col-span-2">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5"><Label className="text-xs">Tanggal</Label><Input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} /></div>
            <div className="grid gap-1.5"><Label className="text-xs">Kasir</Label><Input value={kasir} onChange={(e) => setKasir(e.target.value)} /></div>
            <div className="grid gap-1.5"><Label className="text-xs">Patient Code</Label><Input value={patientCode} onChange={(e) => setPatientCode(e.target.value.toUpperCase())} placeholder="PT-001" /></div>
            <div className="grid gap-1.5"><Label className="text-xs">Patient Name</Label><Input value={patientName} onChange={(e) => setPatientName(e.target.value)} placeholder="opsional" /></div>
            <div className="grid gap-1.5"><Label className="text-xs">Dokter</Label>
              <select className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={dokterId} onChange={(e) => setDokterId(e.target.value)}>
                <option value="">— pilih dokter —</option>
                {dokterRows.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div className="grid gap-1.5"><Label className="text-xs">Payer</Label>
              <select className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={payerId} onChange={(e) => setPayerId(e.target.value)}>
                <option value="">— pilih payer —</option>
                {payerRows.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>

          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-medium">Item Layanan</h3>
              <Button size="sm" variant="outline" className="gap-1" disabled={layananRows.length === 0} onClick={() => {
                const f = layananRows[0]; if (!f) return;
                setItems((a) => [...a, { layanan_id: f.id, layanan_nama: f.name, tarif: Number(f.tarif), qty: 1 }]);
              }}>
                <Plus className="h-4 w-4" /> Tambah
              </Button>
            </div>
            {layananRows.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                Belum ada master layanan. Buka <strong>Master &gt; Layanan</strong> dulu.
              </div>
            ) : (
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Layanan</TableHead><TableHead className="text-right">Tarif</TableHead>
                  <TableHead className="w-20 text-right">Qty</TableHead><TableHead className="text-right">Subtotal</TableHead><TableHead></TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {items.map((it, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <select className="h-8 w-full rounded border border-input bg-background px-2 text-sm" value={it.layanan_id ?? ""}
                          onChange={(e) => {
                            const svc = layananRows.find((s) => s.id === e.target.value);
                            if (svc) updateItem(i, { layanan_id: svc.id, layanan_nama: svc.name, tarif: Number(svc.tarif) });
                          }}>
                          {layananRows.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                      </TableCell>
                      <TableCell className="text-right"><Input type="number" placeholder="0" className="h-8 text-right" value={it.tarif === 0 ? "" : it.tarif} onChange={(e) => updateItem(i, { tarif: e.target.value === "" ? 0 : Number(e.target.value) || 0 })} /></TableCell>
                      <TableCell className="text-right"><Input type="number" placeholder="1" className="h-8 text-right" value={it.qty === 0 ? "" : it.qty} onChange={(e) => updateItem(i, { qty: e.target.value === "" ? 1 : Math.max(1, Number(e.target.value) || 1) })} /></TableCell>
                      <TableCell className="text-right font-mono text-sm">{formatIDR(it.tarif * it.qty)}</TableCell>
                      <TableCell><Button size="icon" variant="ghost" onClick={() => setItems((a) => a.filter((_, x) => x !== i))}><Trash2 className="h-4 w-4 text-rose-500" /></Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-medium">Pembayaran</h3>
              <Button size="sm" variant="outline" className="gap-1" onClick={() => setPays((a) => [...a, { metode: "cash", bank: "", jumlah: 0, mdr: 0 }])}>
                <Plus className="h-4 w-4" /> Split
              </Button>
            </div>
            <div className="space-y-2">
              {pays.map((p, i) => (
                <div key={i} className="grid grid-cols-12 gap-2">
                  <select className="col-span-3 h-9 rounded-md border border-input bg-background px-2 text-sm" value={p.metode}
                    onChange={(e) => setPays((a) => a.map((x, k) => k === i ? { ...x, metode: e.target.value as Pay["metode"] } : x))}>
                    {(["cash","transfer","edc","qris","piutang"] as const).map((m) => <option key={m} value={m}>{m.toUpperCase()}</option>)}
                  </select>
                  <Input className="col-span-3" placeholder="Bank / catatan" value={p.bank}
                    onChange={(e) => setPays((a) => a.map((x, k) => k === i ? { ...x, bank: e.target.value } : x))} />
                  <Input className="col-span-3 text-right" type="number" placeholder="Jumlah" value={p.jumlah === 0 ? "" : p.jumlah}
                    onChange={(e) => setPays((a) => a.map((x, k) => k === i ? { ...x, jumlah: e.target.value === "" ? 0 : Number(e.target.value) || 0 } : x))} />
                  <Input className="col-span-2 text-right" type="number" placeholder="MDR" value={p.mdr === 0 ? "" : p.mdr}
                    onChange={(e) => setPays((a) => a.map((x, k) => k === i ? { ...x, mdr: e.target.value === "" ? 0 : Number(e.target.value) || 0 } : x))} />
                  <Button size="icon" variant="ghost" className="col-span-1" onClick={() => setPays((a) => a.filter((_, k) => k !== i))}><Trash2 className="h-4 w-4 text-rose-500" /></Button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="mb-3 text-sm font-medium">Ringkasan</h3>
            <Row k="Subtotal" v={formatIDR(subtotal)} />
            <div className="flex items-center justify-between py-1 text-sm">
              <span className="text-muted-foreground">Pajak (%)</span>
              <Input className="h-7 w-20 text-right" type="number" placeholder="0" value={pajakPersen === 0 ? "" : pajakPersen} onChange={(e) => setPajakPersen(e.target.value === "" ? 0 : Number(e.target.value) || 0)} />
            </div>
            <Row k="Nilai Pajak" v={formatIDR(pajak)} />
            <div className="my-2 border-t border-border" />
            <Row k="Total" v={formatIDR(total)} strong />
            <Row k="Tertagih" v={formatIDR(pays.reduce((a, p) => a + p.jumlah, 0))} />
          </div>
          <Button className="w-full" onClick={submit} disabled={create.isPending}>
            {create.isPending ? "Menyimpan…" : "Simpan & Posting"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Row({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div className={`flex items-center justify-between py-1 text-sm ${strong ? "font-semibold" : ""}`}>
      <span className="text-muted-foreground">{k}</span>
      <span className="font-mono">{v}</span>
    </div>
  );
}
