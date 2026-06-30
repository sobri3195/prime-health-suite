import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
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
import { Card } from "@/components/ui/card";
import { Search, UserPlus, CheckCircle2, X } from "lucide-react";
import { toast } from "sonner";
import { listPasien, listDokter, createBooking, checkinBooking, listBookingByDate, updateBookingStatus, upsertPasien } from "@/lib/klinik.functions";

export const Route = createFileRoute("/_authenticated/sim-klinik/registrasi")({ component: RegistrasiPage });

const SLOTS = ["08:00","08:30","09:00","09:30","10:00","10:30","11:00","11:30","13:00","13:30","14:00","14:30","15:00","15:30"];

function RegistrasiPage() {
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0,10);
  const callPasien = useServerFn(listPasien);
  const callDokter = useServerFn(listDokter);
  const callBookings = useServerFn(listBookingByDate);
  const callCreate = useServerFn(createBooking);
  const callCheckin = useServerFn(checkinBooking);
  const callUpdate = useServerFn(updateBookingStatus);
  const callUpsertP = useServerFn(upsertPasien);

  const [date, setDate] = useState(today);
  const [searchP, setSearchP] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [selectedP, setSelectedP] = useState<{ id: string; nama: string; no_rm: string } | null>(null);
  const [newP, setNewP] = useState({ nama: "", telp: "", jenis_kelamin: "L" as "L"|"P", patient_type: "Umum" as "Umum"|"BPJS"|"Asuransi"|"Corporate" });
  const [form, setForm] = useState({ dokter_id: "", jam_slot: "08:00", keluhan: "", source: "walk_in" as "walk_in"|"phone"|"whatsapp"|"online" });

  const pasienQ = useQuery({ queryKey: ["klinik","pasien-search",searchP], queryFn: () => callPasien({ data: { q: searchP } }), enabled: showSearch && searchP.length >= 2 });
  const dokterQ = useQuery({ queryKey: ["klinik","dokter"], retry: 1, queryFn: async () => { const r = await callDokter(); if (!Array.isArray(r)) throw new Error("Akses ditolak ke daftar dokter"); return r; } });
  const bookQ = useQuery({ queryKey: ["klinik","bookings",date], queryFn: () => callBookings({ data: { date } }) });

  // Test hook: expose queryClient untuk simulasi realtime invalidation pada E2E.
  useEffect(() => { (window as unknown as { __qc?: unknown }).__qc = qc; }, [qc]);

  const createM = useMutation({
    mutationFn: () => callCreate({ data: { pasien_id: selectedP!.id, dokter_id: form.dokter_id, tanggal: date, jam_slot: form.jam_slot, keluhan: form.keluhan, source: form.source } }),
    onSuccess: () => { toast.success("Booking dibuat"); qc.invalidateQueries({ queryKey: ["klinik","bookings"] }); setSelectedP(null); setForm({ dokter_id: "", jam_slot: "08:00", keluhan: "", source: "walk_in" }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const checkinM = useMutation({
    mutationFn: (id: string) => callCheckin({ data: { booking_id: id } }),
    onSuccess: (d) => { toast.success(`Check-in OK. Antrian: ${(d as { queue: { queue_no: string } }).queue.queue_no}`); qc.invalidateQueries({ queryKey: ["klinik"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateM = useMutation({
    mutationFn: (v: { id: string; status: "pending"|"confirmed"|"checked_in"|"done"|"cancelled" }) => callUpdate({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["klinik"] }),
  });

  const newPatientM = useMutation({
    mutationFn: () => callUpsertP({ data: { ...newP } as never }),
    onSuccess: (p) => { const row = p as { id: string; nama: string; no_rm: string }; setSelectedP({ id: row.id, nama: row.nama, no_rm: row.no_rm }); setShowNew(false); toast.success(`Pasien baru: ${row.no_rm}`); },
    onError: (e: Error) => toast.error(e.message),
  });

  const dokterList = useMemo(() => (dokterQ.data ?? []) as Array<{ id: string; name: string; spesialisasi: string | null }>, [dokterQ.data]);
  const bookings = useMemo(() => (bookQ.data ?? []) as Array<{ id: string; jam_slot: string; status: string; keluhan: string | null; apps_pasien?: { no_rm: string; nama: string; telp: string }; fin_dokter?: { name: string }; klinik_visit?: Array<{ klinik_queue?: Array<{ queue_no: string; status: string }> }> }>, [bookQ.data]);

  // Real-time: jika dokter yang dipilih hilang dari daftar (mis. dinonaktifkan via realtime/refetch),
  // reset pilihan & beri tahu user — tombol Buat Booking otomatis kembali disabled.
  const selectedDokterMissing = !!form.dokter_id && dokterList.length > 0 && !dokterList.some((d) => d.id === form.dokter_id);
  useEffect(() => {
    if (selectedDokterMissing) {
      setForm((f) => ({ ...f, dokter_id: "" }));
      toast.warning("Dokter yang dipilih sudah tidak tersedia. Silakan pilih ulang.");
    }
  }, [selectedDokterMissing]);

  return (
    <div>
      <PageHeader title="Registrasi & Kunjungan" desc="Cari pasien, buat appointment, dan check-in untuk dapat nomor antrian." />

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-4">
          <h3 className="mb-3 text-sm font-semibold">Buat Booking Baru</h3>
          {!selectedP ? (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Button onClick={() => setShowSearch(true)} className="flex-1"><Search className="mr-1 h-4 w-4" />Cari Pasien</Button>
                <Button variant="outline" onClick={() => setShowNew(true)} className="flex-1"><UserPlus className="mr-1 h-4 w-4" />Pasien Baru</Button>
              </div>
              <p className="text-xs text-muted-foreground">Pilih atau daftarkan pasien terlebih dahulu.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-md bg-muted/40 p-2">
                <div>
                  <div className="font-medium">{selectedP.nama}</div>
                  <div className="text-xs text-muted-foreground">No RM: {selectedP.no_rm}</div>
                </div>
                <Button size="icon" aria-label="Tutup" variant="ghost" onClick={() => setSelectedP(null)}><X className="h-4 w-4" /></Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Tanggal</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
                <div><Label>Jam</Label>
                  <Select value={form.jam_slot} onValueChange={(v) => setForm({ ...form, jam_slot: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{SLOTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Dokter</Label>
                <Select value={form.dokter_id} onValueChange={(v) => setForm({ ...form, dokter_id: v })} disabled={dokterQ.isLoading || dokterQ.isError || dokterList.length === 0}>
                  <SelectTrigger aria-label="Pilih dokter"><SelectValue placeholder={dokterQ.isLoading ? "Memuat dokter…" : dokterQ.isError ? "Akses dokter ditolak" : dokterList.length === 0 ? "Tidak ada dokter tersedia" : "Pilih dokter"} /></SelectTrigger>
                  <SelectContent>{dokterList.map((d) => <SelectItem key={d.id} value={d.id}>{d.name} {d.spesialisasi ? `(${d.spesialisasi})` : ""}</SelectItem>)}</SelectContent>
                </Select>
                {!dokterQ.isLoading && dokterQ.isError && (
                  <p role="alert" data-testid="dokter-error" className="mt-1.5 rounded-md border border-destructive/40 bg-destructive/10 px-2 py-1.5 text-xs text-destructive">
                    Akses ditolak: Anda tidak memiliki izin untuk melihat daftar dokter. Pendaftaran dihentikan. Hubungi admin untuk meminta role staf klinik (pendaftaran/admin_klinik/super_admin).
                  </p>
                )}
                {!dokterQ.isLoading && !dokterQ.isError && dokterList.length === 0 && (
                  <p role="alert" className="mt-1.5 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1.5 text-xs text-amber-700 dark:text-amber-400">
                    Daftar dokter kosong. Periksa koneksi internet atau izin akses (role staf klinik). Hubungi admin bila masalah berlanjut, lalu muat ulang halaman.
                  </p>
                )}
              </div>
              <div><Label>Sumber</Label>
                <Select value={form.source} onValueChange={(v) => setForm({ ...form, source: v as typeof form.source })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="walk_in">Walk-in</SelectItem><SelectItem value="phone">Telepon</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem><SelectItem value="online">Online</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Keluhan</Label><Input value={form.keluhan} onChange={(e) => setForm({ ...form, keluhan: e.target.value })} placeholder="Keluhan utama" /></div>
              {(!form.dokter_id || !date) && (
                <p role="alert" data-testid="form-validation" className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1.5 text-xs text-amber-700 dark:text-amber-400">
                  {!date ? "Tanggal wajib diisi." : "Pilih dokter terlebih dahulu."}
                </p>
              )}
              <Button disabled={!form.dokter_id || !date || dokterQ.isError || createM.isPending} onClick={() => createM.mutate()} className="w-full">Buat Booking</Button>
            </div>
          )}
        </Card>

        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Booking Hari Ini</h3>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-auto" />
          </div>
          <div className="space-y-2">
            {bookings.length === 0 ? <p className="text-sm text-muted-foreground">Belum ada booking.</p>
              : bookings.map((b) => (
                <div key={b.id} data-testid="booking-row" data-booking-id={b.id} className="flex items-center gap-2 rounded-md border p-2">
                  <div className="w-14 text-center font-mono text-sm font-bold">{b.jam_slot}</div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">{b.apps_pasien?.nama ?? "-"}</div>
                    <div className="text-xs text-muted-foreground">{b.apps_pasien?.no_rm} • {b.fin_dokter?.name}</div>
                  </div>
                  {(() => { const qno = b.klinik_visit?.[0]?.klinik_queue?.[0]?.queue_no; return qno ? (
                    <Badge data-testid="queue-no" variant="outline" className="font-mono">#{qno}</Badge>
                  ) : null; })()}
                  <Badge variant={b.status === "checked_in" ? "default" : b.status === "cancelled" ? "destructive" : "secondary"}>{b.status}</Badge>
                  {b.status !== "checked_in" && b.status !== "cancelled" && (
                    <Button size="sm" onClick={() => checkinM.mutate(b.id)}><CheckCircle2 className="mr-1 h-3 w-3" />Check-in</Button>
                  )}
                  {b.status !== "cancelled" && (
                    <Button size="icon" aria-label="Tutup" variant="ghost" onClick={() => updateM.mutate({ id: b.id, status: "cancelled" })}><X className="h-4 w-4" /></Button>
                  )}
                </div>
              ))}
          </div>
        </Card>
      </div>

      <Dialog open={showSearch} onOpenChange={setShowSearch}>
        <DialogContent>
          <DialogHeader><DialogTitle>Cari Pasien</DialogTitle></DialogHeader>
          <Input placeholder="Nama / No RM / NIK / HP" value={searchP} onChange={(e) => setSearchP(e.target.value)} autoFocus />
          <div className="max-h-80 overflow-y-auto">
            <Table>
              <TableHeader><TableRow><TableHead>No RM</TableHead><TableHead>Nama</TableHead><TableHead>HP</TableHead><TableHead></TableHead></TableRow></TableHeader>
              <TableBody>
                {((pasienQ.data ?? []) as Array<{ id: string; no_rm: string; nama: string; telp: string }>).map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs">{p.no_rm}</TableCell>
                    <TableCell>{p.nama}</TableCell>
                    <TableCell className="text-xs">{p.telp}</TableCell>
                    <TableCell><Button size="sm" onClick={() => { setSelectedP({ id: p.id, nama: p.nama, no_rm: p.no_rm }); setShowSearch(false); }}>Pilih</Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent>
          <DialogHeader><DialogTitle>Daftarkan Pasien Baru</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label>Nama *</Label><Input value={newP.nama} onChange={(e) => setNewP({ ...newP, nama: e.target.value })} /></div>
            <div><Label>No HP *</Label><Input value={newP.telp} onChange={(e) => setNewP({ ...newP, telp: e.target.value })} /></div>
            <div><Label>JK</Label>
              <Select value={newP.jenis_kelamin} onValueChange={(v) => setNewP({ ...newP, jenis_kelamin: v as "L"|"P" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="L">Laki-laki</SelectItem><SelectItem value="P">Perempuan</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="col-span-2"><Label>Tipe</Label>
              <Select value={newP.patient_type} onValueChange={(v) => setNewP({ ...newP, patient_type: v as typeof newP.patient_type })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Umum">Umum</SelectItem><SelectItem value="BPJS">BPJS</SelectItem>
                  <SelectItem value="Asuransi">Asuransi</SelectItem><SelectItem value="Corporate">Corporate</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowNew(false)}>Batal</Button><Button disabled={!newP.nama || !newP.telp || newPatientM.isPending} onClick={() => newPatientM.mutate()}>Daftar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
