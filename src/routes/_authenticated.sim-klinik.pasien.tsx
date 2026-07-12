import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/lib/page-head";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { PageHeader } from "@/components/app-shell";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Plus, Pencil, Eye, Download, Power } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { listPasien, upsertPasien, deactivatePasien, getPasien } from "@/lib/klinik.functions";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { friendlyError } from "@/lib/apps-error";

export const Route = createFileRoute("/_authenticated/sim-klinik/pasien")({
  head: () => pageHead({ title: 'Data Pasien — SIM Klinik', description: 'Direktori rekam medis pasien dan riwayat kunjungan.', path: '/sim-klinik/pasien' }),
  component: PasienPage,
});

type Pasien = {
  id: string; no_rm: string | null; nama: string; nik: string | null; tgl_lahir: string | null;
  jenis_kelamin: string | null; telp: string | null; alamat: string | null; patient_type: string;
  alergi: string | null; kontak_darurat: string | null; is_active: boolean;
};

function calcAge(dob: string | null) { if (!dob) return "-"; const d = new Date(dob); return String(Math.floor((Date.now() - d.getTime()) / (365.25*864e5))); }

const PasienSchema = z.object({
  nama: z.string().trim().min(2, "Nama minimal 2 karakter").max(100, "Nama maksimal 100 karakter"),
  nik: z.string().trim().regex(/^\d{16}$/u, "NIK harus 16 digit angka").optional().or(z.literal("")),
  jenis_kelamin: z.enum(["L", "P"], { message: "Pilih jenis kelamin" }),
  telp: z.string().trim().regex(/^[0-9+\-\s]{8,20}$/u, "Nomor HP tidak valid"),
  patient_type: z.enum(["Umum", "BPJS", "Asuransi", "Corporate"]),
  tgl_lahir: z.string().optional().or(z.literal("")),
  alamat: z.string().max(255).optional().or(z.literal("")),
  alergi: z.string().max(255).optional().or(z.literal("")),
  kontak_darurat: z.string().max(100).optional().or(z.literal("")),
});

function PasienPage() {
  const qc = useQueryClient();
  const callList = useServerFn(listPasien);
  const callUpsert = useServerFn(upsertPasien);
  const callDeact = useServerFn(deactivatePasien);

  const [q, setQ] = useState("");
  const [pt, setPt] = useState<string>("all");
  const [edit, setEdit] = useState<Partial<Pasien> | null>(null);
  const [detail, setDetail] = useState<Pasien | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmDeact, setConfirmDeact] = useState<Pasien | null>(null);

  const listQ = useQuery({
    queryKey: ["klinik", "pasien", { q, pt }],
    queryFn: () => callList({ data: { q: q || undefined, patient_type: pt === "all" ? undefined : pt } }),
  });

  const upsertM = useMutation({
    mutationFn: (d: Partial<Pasien>) => callUpsert({ data: d as never }),
    onSuccess: () => { toast.success("Data pasien tersimpan"); qc.invalidateQueries({ queryKey: ["klinik","pasien"] }); setEdit(null); },
    onError: (e: Error) => toast.error(friendlyError(e)),
  });

  const deactM = useMutation({
    mutationFn: (p: Pasien) => callDeact({ data: { id: p.id, is_active: !p.is_active } }),
    onSuccess: () => { toast.success("Status pasien diperbarui"); qc.invalidateQueries({ queryKey: ["klinik","pasien"] }); },
  });

  const data = useMemo(() => (listQ.data ?? []) as Pasien[], [listQ.data]);

  function exportCSV() {
    const headers = ["No RM","Nama","NIK","JK","HP","Tipe","Alamat","Aktif"];
    const rows = data.map((p) => [p.no_rm, p.nama, p.nik, p.jenis_kelamin, p.telp, p.patient_type, p.alamat, p.is_active ? "Ya" : "Tidak"]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${(c ?? "").toString().replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a");
    a.href = url; a.download = `pasien-${new Date().toISOString().slice(0,10)}.csv`; a.click(); URL.revokeObjectURL(url);
  }

  return (
    <div>
      <PageHeader title="Master Pasien" desc="Manajemen data pasien klinik mata dengan nomor rekam medis." />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama / No RM / NIK / HP…" className="pl-9" />
        </div>
        <Select value={pt} onValueChange={setPt}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Tipe</SelectItem>
            <SelectItem value="Umum">Umum</SelectItem>
            <SelectItem value="BPJS">BPJS</SelectItem>
            <SelectItem value="Asuransi">Asuransi</SelectItem>
            <SelectItem value="Corporate">Corporate</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={exportCSV}><Download className="mr-1 h-4 w-4" />Export CSV</Button>
        <Button size="sm" onClick={() => setEdit({ patient_type: "Umum", jenis_kelamin: "L", is_active: true })}><Plus className="mr-1 h-4 w-4" />Pasien Baru</Button>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <Table>
          <TableHeader><TableRow>
            <TableHead>No RM</TableHead><TableHead>Nama</TableHead><TableHead>Usia/JK</TableHead>
            <TableHead>HP</TableHead><TableHead>Tipe</TableHead><TableHead>Status</TableHead>
            <TableHead className="text-right">Aksi</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {listQ.isLoading ? <TableRow><TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">Memuat…</TableCell></TableRow>
              : data.length === 0 ? <TableRow><TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">Belum ada pasien.</TableCell></TableRow>
              : data.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-xs">{p.no_rm}</TableCell>
                  <TableCell className="font-medium">{p.nama}</TableCell>
                  <TableCell>{calcAge(p.tgl_lahir)} / {p.jenis_kelamin ?? "-"}</TableCell>
                  <TableCell className="font-mono text-xs">{p.telp ?? "-"}</TableCell>
                  <TableCell><Badge variant="secondary">{p.patient_type}</Badge></TableCell>
                  <TableCell>{p.is_active ? <Badge className="bg-emerald-500/15 text-emerald-600">Aktif</Badge> : <Badge variant="destructive">Nonaktif</Badge>}</TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" aria-label="Lihat detail" variant="ghost" onClick={() => setDetail(p)}><Eye className="h-4 w-4" /></Button>
                    <Button size="icon" aria-label="Edit pasien" variant="ghost" onClick={() => { setErrors({}); setEdit(p); }}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" aria-label={p.is_active ? "Nonaktifkan pasien" : "Aktifkan pasien"} variant="ghost" onClick={() => setConfirmDeact(p)}><Power className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>
      <div className="mt-2 text-xs text-muted-foreground">Total {data.length} pasien</div>

      <Dialog open={!!edit} onOpenChange={(o) => { if (!o) { setEdit(null); setErrors({}); } }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{edit?.id ? "Edit Pasien" : "Pasien Baru"}</DialogTitle></DialogHeader>
          {edit && <PasienForm value={edit} onChange={setEdit} errors={errors} />}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEdit(null); setErrors({}); }}>Batal</Button>
            <Button
              disabled={upsertM.isPending}
              onClick={() => {
                if (!edit) return;
                const parsed = PasienSchema.safeParse(edit);
                if (!parsed.success) {
                  const flat: Record<string, string> = {};
                  for (const issue of parsed.error.issues) {
                    const key = issue.path[0];
                    if (typeof key === "string" && !flat[key]) flat[key] = issue.message;
                  }
                  setErrors(flat);
                  toast.error("Periksa kembali isian form");
                  return;
                }
                setErrors({});
                upsertM.mutate(edit);
              }}
            >
              {upsertM.isPending ? "Menyimpan…" : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!confirmDeact}
        onOpenChange={(o) => !o && setConfirmDeact(null)}
        title={confirmDeact?.is_active ? "Nonaktifkan Pasien" : "Aktifkan Pasien"}
        description={confirmDeact ? `${confirmDeact.is_active ? "Nonaktifkan" : "Aktifkan"} pasien ${confirmDeact.nama}?` : undefined}
        confirmLabel={confirmDeact?.is_active ? "Nonaktifkan" : "Aktifkan"}
        destructive={!!confirmDeact?.is_active}
        onConfirm={() => { if (confirmDeact) deactM.mutate(confirmDeact); setConfirmDeact(null); }}
      />

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Detail Pasien</DialogTitle></DialogHeader>
          {detail && (
            <div className="space-y-2 text-sm">
              <Row k="No RM" v={detail.no_rm ?? "-"} />
              <Row k="Nama" v={detail.nama} />
              <Row k="NIK" v={detail.nik ?? "-"} />
              <Row k="Tgl Lahir" v={detail.tgl_lahir ?? "-"} />
              <Row k="JK" v={detail.jenis_kelamin ?? "-"} />
              <Row k="HP" v={detail.telp ?? "-"} />
              <Row k="Alamat" v={detail.alamat ?? "-"} />
              <Row k="Tipe" v={detail.patient_type} />
              <Row k="Alergi" v={detail.alergi ?? "Tidak ada"} />
              <Row k="Kontak Darurat" v={detail.kontak_darurat ?? "-"} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return <div className="grid grid-cols-3 gap-2 border-b pb-1"><span className="text-muted-foreground">{k}</span><span className="col-span-2">{v}</span></div>;
}

function PasienForm({ value, onChange, errors }: { value: Partial<Pasien>; onChange: (v: Partial<Pasien>) => void; errors: Record<string, string> }) {
  const set = (k: keyof Pasien, v: unknown) => onChange({ ...value, [k]: v });
  const err = (k: string) => errors[k] ? <p className="mt-1 text-xs text-destructive" role="alert">{errors[k]}</p> : null;
  const cn = (k: string) => errors[k] ? "border-destructive" : "";
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      <div><Label htmlFor="p-nama">Nama Lengkap *</Label><Input id="p-nama" aria-invalid={!!errors.nama} className={cn("nama")} value={value.nama ?? ""} onChange={(e) => set("nama", e.target.value)} />{err("nama")}</div>
      <div><Label htmlFor="p-nik">NIK (16 digit)</Label><Input id="p-nik" inputMode="numeric" maxLength={16} aria-invalid={!!errors.nik} className={cn("nik")} value={value.nik ?? ""} onChange={(e) => set("nik", e.target.value)} />{err("nik")}</div>
      <div><Label htmlFor="p-dob">Tgl Lahir</Label><Input id="p-dob" type="date" value={value.tgl_lahir ?? ""} onChange={(e) => set("tgl_lahir", e.target.value)} /></div>
      <div><Label>Jenis Kelamin *</Label>
        <Select value={value.jenis_kelamin ?? "L"} onValueChange={(v) => set("jenis_kelamin", v)}>
          <SelectTrigger aria-invalid={!!errors.jenis_kelamin} className={cn("jenis_kelamin")}><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="L">Laki-laki</SelectItem><SelectItem value="P">Perempuan</SelectItem></SelectContent>
        </Select>
        {err("jenis_kelamin")}
      </div>
      <div><Label htmlFor="p-telp">No HP *</Label><Input id="p-telp" inputMode="tel" aria-invalid={!!errors.telp} className={cn("telp")} value={value.telp ?? ""} onChange={(e) => set("telp", e.target.value)} />{err("telp")}</div>
      <div><Label>Tipe Pasien *</Label>
        <Select value={value.patient_type ?? "Umum"} onValueChange={(v) => set("patient_type", v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Umum">Umum</SelectItem><SelectItem value="BPJS">BPJS</SelectItem>
            <SelectItem value="Asuransi">Asuransi</SelectItem><SelectItem value="Corporate">Corporate</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="md:col-span-2"><Label htmlFor="p-alamat">Alamat</Label><Input id="p-alamat" maxLength={255} value={value.alamat ?? ""} onChange={(e) => set("alamat", e.target.value)} /></div>
      <div><Label htmlFor="p-alergi">Alergi</Label><Input id="p-alergi" maxLength={255} value={value.alergi ?? ""} onChange={(e) => set("alergi", e.target.value)} /></div>
      <div><Label htmlFor="p-kd">Kontak Darurat</Label><Input id="p-kd" maxLength={100} value={value.kontak_darurat ?? ""} onChange={(e) => set("kontak_darurat", e.target.value)} /></div>
    </div>
  );
}
void getPasien;
