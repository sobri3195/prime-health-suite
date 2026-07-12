import { createFileRoute, Link } from "@tanstack/react-router";
import { pageHead } from "@/lib/page-head";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { PageHeader } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Printer, Receipt, Trash2, Info } from "lucide-react";
import { toast } from "sonner";
import { listVisits, getVisitDetail, listLayanan, generateInvoiceFromVisit, listInvoiceForBilling, addInvoicePayment } from "@/lib/klinik.functions";
import { getSettings } from "@/lib/clinic.functions";
import { terbilangRupiah } from "@/lib/terbilang";
import { useRealtimeSubscription } from "@/hooks/use-realtime-subscription";

export const Route = createFileRoute("/_authenticated/sim-klinik/billing")({
  head: () => pageHead({ title: 'Billing & Kasir — SIM Klinik', description: 'Kelola invoice pasien, pembayaran, dan cetak kwitansi.', path: '/sim-klinik/billing' }),
  component: BillingPage,
});

function BillingPage() {
  const qc = useQueryClient();
  const callVisits = useServerFn(listVisits);
  const callDetail = useServerFn(getVisitDetail);
  const callLayanan = useServerFn(listLayanan);
  const callGen = useServerFn(generateInvoiceFromVisit);
  const callInv = useServerFn(listInvoiceForBilling);

  const today = new Date().toISOString().slice(0, 10);
  const [billVisit, setBillVisit] = useState<string | null>(null);
  const [payInvoice, setPayInvoice] = useState<{ id: string; no: string; total: number; dibayar: number; name: string | null } | null>(null);

  // Visits ready for billing
  const visitsQ = useQuery({ queryKey: ["klinik","visits-billing"], queryFn: () => callVisits({ data: { status: "billing" } }) });
  const invoicesQ = useQuery({ queryKey: ["klinik","invoices",today], queryFn: () => callInv({ data: {} }) });
  useRealtimeSubscription(
    ["klinik_visit", "fin_invoice", "fin_pembayaran"],
    [["klinik", "visits-billing"], ["klinik", "invoices", today]],
  );

  type Visit = { id: string; visit_date: string; chief_complaint: string | null; apps_pasien?: { no_rm: string; nama: string; patient_type: string }; fin_dokter?: { name: string } };
  const visits = (visitsQ.data ?? []) as Visit[];

  return (
    <div>
      <PageHeader title="Kasir & Billing" desc="Generate invoice dari kunjungan dan catat pembayaran." />

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-3">
          <h3 className="mb-2 text-sm font-semibold">Pasien Siap Bayar ({visits.length})</h3>
          <div className="space-y-2">
            {visits.length === 0 ? <p className="text-xs text-muted-foreground">Belum ada pasien menunggu billing.</p>
              : visits.map((v) => (
                <div key={v.id} className="flex items-center gap-2 rounded border p-2">
                  <div className="flex-1">
                    <div className="text-sm font-medium">{v.apps_pasien?.nama}</div>
                    <div className="text-xs text-muted-foreground">{v.apps_pasien?.no_rm} • {v.fin_dokter?.name} • <Badge variant="outline" className="text-[10px]">{v.apps_pasien?.patient_type}</Badge></div>
                  </div>
                  <Button asChild size="sm" variant="ghost" title="Lihat detail kunjungan">
                    <Link to="/sim-klinik/$section" params={{ section: v.id }}>Detail</Link>
                  </Button>
                  <Button size="sm" onClick={() => setBillVisit(v.id)}><Receipt className="mr-1 h-3 w-3" />Buat Invoice</Button>
                </div>
              ))}
          </div>
        </Card>
        <Card className="p-3">
          <h3 className="mb-2 text-sm font-semibold">Invoice Terbaru</h3>
          <Table>
            <TableHeader><TableRow><TableHead>No</TableHead><TableHead>Pasien</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Total</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>
              {((invoicesQ.data ?? []) as Array<{ id: string; no_invoice: string; patient_name: string | null; status: string; total: number; dibayar: number | null }>).slice(0, 12).map((i) => (
                <TableRow key={i.id}>
                  <TableCell className="font-mono text-xs">{i.no_invoice}</TableCell>
                  <TableCell className="text-sm">{i.patient_name}</TableCell>
                  <TableCell><Badge variant={i.status === "paid" ? "default" : i.status === "partial" ? "secondary" : "destructive"}>{i.status}</Badge></TableCell>
                  <TableCell className="text-right">Rp {Number(i.total).toLocaleString("id-ID")}</TableCell>
                  <TableCell className="text-right">
                    {i.status !== "paid" && i.status !== "void" && Number(i.total) - Number(i.dibayar ?? 0) > 0 && (
                      <Button size="sm" variant="outline" onClick={() => setPayInvoice({ id: i.id, no: i.no_invoice, total: Number(i.total), dibayar: Number(i.dibayar ?? 0), name: i.patient_name })}>
                        Tambah Bayar
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>


      {billVisit && <BillingDialog visit_id={billVisit} onClose={() => setBillVisit(null)}
        callDetail={callDetail} callLayanan={callLayanan} callGen={callGen}
        onCreated={() => { qc.invalidateQueries({ queryKey: ["klinik"] }); setBillVisit(null); }} />}
      {payInvoice && <AddPaymentDialog invoice={payInvoice} onClose={() => setPayInvoice(null)}
        onSaved={() => { qc.invalidateQueries({ queryKey: ["klinik"] }); setPayInvoice(null); }} />}
    </div>
  );
}

function AddPaymentDialog({ invoice, onClose, onSaved }: {
  invoice: { id: string; no: string; total: number; dibayar: number; name: string | null };
  onClose: () => void; onSaved: () => void;
}) {
  const sisa = Math.max(0, invoice.total - invoice.dibayar);
  const [amount, setAmount] = useState<number>(sisa);
  const [method, setMethod] = useState<"cash"|"transfer"|"qris"|"debit"|"credit"|"insurance">("cash");
  const call = useServerFn(addInvoicePayment);
  const m = useMutation({
    mutationFn: () => call({ data: { invoice_id: invoice.id, amount, method } }),
    onSuccess: () => { toast.success("Pembayaran tercatat"); onSaved(); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Tambah Bayar — {invoice.no}</DialogTitle></DialogHeader>
        <div className="grid gap-3 py-2 text-sm">
          <div>Pasien: <b>{invoice.name ?? "—"}</b></div>
          <div className="grid grid-cols-3 gap-2 rounded border p-2 text-xs">
            <div>Total<br /><b>Rp {invoice.total.toLocaleString("id-ID")}</b></div>
            <div>Dibayar<br /><b>Rp {invoice.dibayar.toLocaleString("id-ID")}</b></div>
            <div>Sisa<br /><b>Rp {sisa.toLocaleString("id-ID")}</b></div>
          </div>
          <div className="grid gap-1.5"><Label htmlFor="pay-amt">Jumlah Bayar</Label>
            <Input id="pay-amt" type="number" inputMode="numeric" min={1} max={sisa} placeholder="0" value={amount === 0 ? "" : amount} onChange={(e) => setAmount(e.target.value === "" ? 0 : Number(e.target.value))} />
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex gap-1">
                <Button type="button" size="sm" variant="ghost" className="h-6 px-2 text-[11px]" disabled={sisa <= 0} onClick={() => setAmount(sisa)}>Lunas ({`Rp ${sisa.toLocaleString("id-ID")}`})</Button>
                <Button type="button" size="sm" variant="ghost" className="h-6 px-2 text-[11px]" disabled={sisa <= 0} onClick={() => setAmount(Math.round(sisa/2))}>50%</Button>
              </div>
              <span aria-live="polite" className={amount > sisa ? "text-destructive font-medium" : "text-muted-foreground"}>
                {amount > sisa
                  ? `Melebihi sisa Rp ${(amount - sisa).toLocaleString("id-ID")}`
                  : `Sisa setelah bayar: Rp ${Math.max(0, sisa - amount).toLocaleString("id-ID")}`}
              </span>
            </div>
          </div>
          <div className="grid gap-1.5"><Label>Metode</Label>
            <Select value={method} onValueChange={(v) => setMethod(v as typeof method)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Tunai</SelectItem><SelectItem value="transfer">Transfer</SelectItem>
                <SelectItem value="qris">QRIS</SelectItem><SelectItem value="debit">Debit</SelectItem>
                <SelectItem value="credit">Kredit</SelectItem><SelectItem value="insurance">Asuransi</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button disabled={m.isPending || amount <= 0 || amount > sisa} onClick={() => m.mutate()}>
            {m.isPending ? "Menyimpan…" : "Simpan Pembayaran"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


function BillingDialog({ visit_id, onClose, callDetail, callLayanan, callGen, onCreated }: {
  visit_id: string; onClose: () => void;
  callDetail: (a: { data: { id: string } }) => Promise<unknown>;
  callLayanan: () => Promise<unknown>;
  callGen: (a: { data: unknown }) => Promise<unknown>;
  onCreated: () => void;
}) {
  const detailQ = useQuery({ queryKey: ["klinik","visit-bill",visit_id], queryFn: () => callDetail({ data: { id: visit_id } }) });
  const layananQ = useQuery({ queryKey: ["klinik","layanan"], queryFn: () => callLayanan() });
  const callSettings = useServerFn(getSettings);
  const settingsQ = useQuery({ queryKey: ["clinic","settings"], queryFn: () => callSettings(), staleTime: 60_000 });

  type Item = { description: string; quantity: number; unit_price: number; layanan_id: string | null };
  const [items, setItems] = useState<Item[]>([]);
  const [discount, setDiscount] = useState(0);
  const [paid, setPaid] = useState(0);
  const [method, setMethod] = useState<"cash"|"transfer"|"qris"|"debit"|"credit"|"insurance">("cash");
  const [paper, setPaper] = useState<"58mm"|"80mm"|"a5">("80mm");

  type Detail = { visit: { id: string; apps_pasien?: { nama: string; no_rm: string; patient_type: string }; fin_dokter?: { name: string } }; prescriptions: Array<{ klinik_prescription_item: Array<{ obat_name: string; quantity: number; unit_price: number }> }> };
  const detail = detailQ.data as Detail | undefined;

  // Pre-fill prescription items as line items on first load
  useEffect(() => {
    if (!detail) return;
    const pres: Item[] = [];
    detail.prescriptions.forEach((p) => p.klinik_prescription_item.forEach((it) => pres.push({
      description: `Obat: ${it.obat_name}`, quantity: it.quantity, unit_price: it.unit_price, layanan_id: null,
    })));
    setItems(pres);
  }, [detail]);

  void layananQ; // layanan master reserved for future structured tindakan pull
  const subtotal = items.reduce((a, b) => a + b.quantity * b.unit_price, 0);
  const total = Math.max(0, subtotal - discount);

  const genM = useMutation({
    mutationFn: () => callGen({ data: { visit_id, items, payment_method: method, paid_amount: paid, discount } }),
    onSuccess: (i) => { toast.success("Invoice dibuat"); onCreated(); printInvoice(i as Inv); },
    onError: (e: Error) => toast.error(e.message),
  });

  type Inv = { no_invoice: string; patient_name: string | null; total: number; tanggal: string };
  function escapeHtml(s: string) { return s.replace(/[&<>"']/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;" }[c] as string)); }
  function printInvoice(inv: Inv) {
    const w = window.open("", "_blank", "width=400,height=600");
    if (!w) return;
    const profile = (settingsQ.data?.profile ?? {}) as Record<string, string | number | boolean>;
    const clinicName = String(profile.clinicName ?? "Klinik");
    const address = String(profile.address ?? "");
    const phone = String(profile.phone ?? "");
    const email = String(profile.email ?? "");
    const taxId = String(profile.taxId ?? "");
    // Preset kertas: thermal 58mm/80mm (font kecil, padding sempit) atau A5 (standar).
    const preset = paper === "58mm"
      ? { pageWidth: "58mm", body: "10px", head: "12px", muted: "9px", pad: "4mm", tableFont: "10px" }
      : paper === "80mm"
      ? { pageWidth: "80mm", body: "11px", head: "13px", muted: "10px", pad: "5mm", tableFont: "11px" }
      : { pageWidth: "148mm", body: "12px", head: "16px", muted: "11px", pad: "12mm", tableFont: "12px" };
    w.document.write(`<html><head><title>${escapeHtml(inv.no_invoice)}</title><style>
      @page{size:${preset.pageWidth} auto;margin:0}
      html,body{margin:0}
      body{font-family:'Courier New',monospace;padding:${preset.pad};font-size:${preset.body};color:#000;width:${preset.pageWidth};box-sizing:border-box}
      h2{margin:0;font-size:${preset.head}}
      table{width:100%;border-collapse:collapse;margin-top:6px;font-size:${preset.tableFont}}
      td{padding:2px 0;vertical-align:top}
      .r{text-align:right}
      .b{border-top:1px dashed #000;margin-top:6px;padding-top:6px}
      .muted{color:#444;font-size:${preset.muted}}
      @media print{ body{padding:${preset.pad}} }
    </style></head><body>
      <h2>${escapeHtml(clinicName)}</h2>
      ${address ? `<div class="muted">${escapeHtml(address)}</div>` : ""}
      ${(phone || email) ? `<div class="muted">${escapeHtml([phone, email].filter(Boolean).join(" • "))}</div>` : ""}
      ${taxId ? `<div class="muted">NPWP: ${escapeHtml(taxId)}</div>` : ""}
      <div class="b">Invoice: <b>${escapeHtml(inv.no_invoice)}</b><br>Tanggal: ${escapeHtml(inv.tanggal)}<br>Pasien: ${escapeHtml(inv.patient_name ?? "-")}</div>
      <table>${items.map((it) => `<tr><td>${escapeHtml(it.description)}</td><td class="r">${it.quantity} x ${it.unit_price.toLocaleString("id-ID")}</td><td class="r">${(it.quantity*it.unit_price).toLocaleString("id-ID")}</td></tr>`).join("")}</table>
      <div class="b"><table><tr><td>Subtotal</td><td class="r">${subtotal.toLocaleString("id-ID")}</td></tr>
      <tr><td>Diskon</td><td class="r">${discount.toLocaleString("id-ID")}</td></tr>
      <tr><td><b>TOTAL</b></td><td class="r"><b>${total.toLocaleString("id-ID")}</b></td></tr>
      <tr><td>Dibayar (${escapeHtml(method)})</td><td class="r">${paid.toLocaleString("id-ID")}</td></tr>
      ${paid > total ? `<tr><td><b>Kembalian</b></td><td class="r"><b>${(paid-total).toLocaleString("id-ID")}</b></td></tr>` : ""}</table></div>
      <div class="b"><i>Terbilang: ${escapeHtml(terbilangRupiah(total))}</i></div>
      <div class="b" style="text-align:center">Terima kasih</div>
      <script>window.print()</script></body></html>`);
  }

  

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader><DialogTitle>Generate Invoice — {detail?.visit?.apps_pasien?.nama}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-[1fr_280px] gap-4">
          <div>
            <div className="mb-3 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-[11px] text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>Tindakan/Layanan & Obat ditarik otomatis dari input Perawat/Dokter. Kasir hanya memverifikasi, mencatat diskon, dan menerima pembayaran.</span>
            </div>
            <Label className="text-xs">Rincian dari Kunjungan</Label>
            <Table>
              <TableHeader><TableRow><TableHead>Deskripsi</TableHead><TableHead className="w-16">Qty</TableHead><TableHead>Harga</TableHead><TableHead></TableHead></TableRow></TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="py-6 text-center text-xs text-muted-foreground">Belum ada tindakan/obat dari Perawat/Dokter.</TableCell></TableRow>
                ) : items.map((it, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="text-sm">{it.description}</TableCell>
                    <TableCell className="text-sm">{it.quantity}</TableCell>
                    <TableCell className="text-sm">Rp {Number(it.unit_price).toLocaleString("id-ID")}</TableCell>
                    <TableCell><Button size="icon" variant="ghost" title="Hapus baris (koreksi)" onClick={() => setItems(items.filter((_,i)=>i!==idx))}><Trash2 className="h-3 w-3"/></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="space-y-2">
            <div className="rounded border p-3 text-sm">
              <div className="flex justify-between"><span>Subtotal</span><span>Rp {subtotal.toLocaleString("id-ID")}</span></div>
              <div className="mt-2"><Label>Diskon</Label><Input type="number" inputMode="numeric" min={0} placeholder="0" value={discount === 0 ? "" : discount} onChange={(e) => setDiscount(e.target.value === "" ? 0 : Number(e.target.value))} /></div>
              <div className="mt-2 flex justify-between font-bold"><span>TOTAL</span><span>Rp {total.toLocaleString("id-ID")}</span></div>
              <div className="mt-2"><Label>Metode Bayar</Label>
                <Select value={method} onValueChange={(v) => setMethod(v as typeof method)}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Tunai</SelectItem><SelectItem value="transfer">Transfer</SelectItem>
                    <SelectItem value="qris">QRIS</SelectItem><SelectItem value="debit">Debit</SelectItem>
                    <SelectItem value="credit">Kredit</SelectItem><SelectItem value="insurance">Asuransi</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="mt-2"><Label>Dibayar</Label><Input type="number" inputMode="numeric" min={0} placeholder="0" value={paid === 0 ? "" : paid} onChange={(e) => setPaid(e.target.value === "" ? 0 : Number(e.target.value))} />
                <div className="mt-1 flex flex-wrap gap-1">
                  {[total, 50000, 100000, 200000].filter((v, i, a) => v > 0 && a.indexOf(v) === i).map((v) => (
                    <Button key={v} type="button" size="sm" variant="ghost" className="h-6 px-2 text-[11px]" onClick={() => setPaid(v)}>
                      {v === total ? "Pas" : `Rp ${v.toLocaleString("id-ID")}`}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="mt-2"><Label>Ukuran Kertas Cetak</Label>
                <Select value={paper} onValueChange={(v) => setPaper(v as typeof paper)}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="58mm">Thermal 58mm</SelectItem>
                    <SelectItem value="80mm">Thermal 80mm</SelectItem>
                    <SelectItem value="a5">A5 (148mm)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {paid > total ? (
                <div className="mt-2 flex justify-between rounded border border-emerald-300 bg-emerald-50 px-2 py-1 text-sm font-semibold text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300">
                  <span>Kembalian</span><span>Rp {(paid - total).toLocaleString("id-ID")}</span>
                </div>
              ) : (
                <div className="mt-1 text-xs text-muted-foreground">
                  {paid === total && total > 0 ? "Lunas — pas" : paid > 0 ? `Sisa Rp ${(total-paid).toLocaleString("id-ID")}` : "Belum bayar"}
                </div>
              )}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button disabled={items.length === 0 || genM.isPending} onClick={() => genM.mutate()}><Printer className="mr-1 h-4 w-4" />Buat & Cetak Invoice</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
