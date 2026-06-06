import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatIDR } from "@/lib/finance";
import { addAudit } from "@/lib/audit-log";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/finance/pendapatan-input-harian")({
  component: Page,
});

type Item = { layanan: string; tarif: number; qty: number };
const SERVICES = [
  ["Konsultasi Sp.M", 175000],
  ["Refraksi", 85000],
  ["Tonometri", 75000],
  ["OCT", 450000],
  ["Laser YAG", 1800000],
  ["Phacoemulsifikasi", 12500000],
  ["Injeksi Intravitreal", 5500000],
  ["Biometri", 250000],
] as const;

function Page() {
  const { user } = useAuth();
  const today = new Date().toISOString().slice(0, 10);
  const [tanggal, setTanggal] = useState(today);
  const [kasir, setKasir] = useState("Sari Wulandari");
  const [payer, setPayer] = useState("Umum");
  const [patient, setPatient] = useState("");
  const [items, setItems] = useState<Item[]>([{ layanan: SERVICES[0][0], tarif: SERVICES[0][1], qty: 1 }]);

  const subtotal = useMemo(() => items.reduce((a, i) => a + i.tarif * i.qty, 0), [items]);
  const pajak = Math.round(subtotal * 0.11);
  const total = subtotal + pajak;

  const updateItem = (idx: number, patch: Partial<Item>) =>
    setItems((arr) => arr.map((r, i) => (i === idx ? { ...r, ...patch } : r)));

  const submit = () => {
    if (!patient) { toast.error("Patient code wajib diisi"); return; }
    addAudit({ actor: user?.email ?? "system", action: "role_change", target: "finance/pendapatan/input-harian", meta: { patient, total } });
    toast.success(`Pendapatan ${formatIDR(total)} tercatat untuk ${patient}`);
    setPatient("");
    setItems([{ layanan: SERVICES[0][0], tarif: SERVICES[0][1], qty: 1 }]);
  };

  return (
    <div>
      <PageHeader title="Input Pendapatan Harian" desc="Input transaksi harian dari kasir → masuk ke daftar invoice & jurnal." />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5 lg:col-span-2">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5"><Label className="text-xs">Tanggal</Label><Input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} /></div>
            <div className="grid gap-1.5"><Label className="text-xs">Kasir</Label><Input value={kasir} onChange={(e) => setKasir(e.target.value)} /></div>
            <div className="grid gap-1.5"><Label className="text-xs">Patient Code</Label><Input value={patient} onChange={(e) => setPatient(e.target.value.toUpperCase())} placeholder="PT-001" /></div>
            <div className="grid gap-1.5"><Label className="text-xs">Payer</Label>
              <select className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={payer} onChange={(e) => setPayer(e.target.value)}>
                {["Umum", "BPJS", "Asuransi", "Perusahaan"].map((o) => <option key={o}>{o}</option>)}
              </select>
            </div>
          </div>

          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-medium">Item Layanan</h3>
              <Button size="sm" variant="outline" className="gap-1" onClick={() => setItems((a) => [...a, { layanan: SERVICES[0][0], tarif: SERVICES[0][1], qty: 1 }])}>
                <Plus className="h-4 w-4" /> Tambah
              </Button>
            </div>
            <Table>
              <TableHeader><TableRow>
                <TableHead>Layanan</TableHead><TableHead className="text-right">Tarif</TableHead>
                <TableHead className="w-20 text-right">Qty</TableHead><TableHead className="text-right">Subtotal</TableHead><TableHead></TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {items.map((it, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <select className="h-8 w-full rounded border border-input bg-background px-2 text-sm" value={it.layanan}
                        onChange={(e) => {
                          const svc = SERVICES.find((s) => s[0] === e.target.value)!;
                          updateItem(i, { layanan: svc[0], tarif: svc[1] });
                        }}>
                        {SERVICES.map(([n]) => <option key={n}>{n}</option>)}
                      </select>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">{formatIDR(it.tarif)}</TableCell>
                    <TableCell className="text-right"><Input type="number" className="h-8 text-right" value={it.qty} onChange={(e) => updateItem(i, { qty: Math.max(1, Number(e.target.value) || 1) })} /></TableCell>
                    <TableCell className="text-right font-mono text-sm">{formatIDR(it.tarif * it.qty)}</TableCell>
                    <TableCell><Button size="icon" variant="ghost" onClick={() => setItems((a) => a.filter((_, x) => x !== i))}><Trash2 className="h-4 w-4 text-rose-500" /></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="mb-3 text-sm font-medium">Ringkasan</h3>
            <Row k="Subtotal" v={formatIDR(subtotal)} />
            <Row k="PPN 11%" v={formatIDR(pajak)} />
            <div className="my-2 border-t border-border" />
            <Row k="Total" v={formatIDR(total)} strong />
          </div>
          <Button className="w-full" onClick={submit}>Simpan & Posting</Button>
          <Button className="w-full" variant="outline" onClick={() => toast.message("Cetak struk (mock)")}>Cetak Struk</Button>
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
