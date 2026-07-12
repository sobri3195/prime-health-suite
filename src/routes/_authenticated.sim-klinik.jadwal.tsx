import { pageHead } from "@/lib/page-head";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { PageHeader } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, Pencil, Trash2, LayoutGrid, List as ListIcon } from "lucide-react";
import { toast } from "sonner";
import { upsertJadwal, deleteJadwal, listJadwal } from "@/lib/klinik.functions";
import { friendlyError } from "@/lib/apps-error";

export const Route = createFileRoute("/_authenticated/sim-klinik/jadwal")({
  head: () => pageHead({ title: 'Jadwal Dokter — SIM Klinik', description: 'Jadwal praktik dokter, slot, dan kepadatan kunjungan harian.', path: '/sim-klinik/jadwal' }),
  component: JadwalPage,
});

const DAYS = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"] as const;
type Day = typeof DAYS[number];

type Jadwal = {
  id: string;
  dokter_id: string | null;
  dokter_name: string;
  poli: string;
  day: string;
  start_time: string;
  end_time: string;
  quota: number;
  booked: number;
  is_active: boolean;
};

function JadwalPage() {
  const qc = useQueryClient();
  const [day, setDay] = useState("all");
  const [doc, setDoc] = useState("all");
  const [editing, setEditing] = useState<Jadwal | null>(null);
  const [openForm, setOpenForm] = useState(false);

  const callList = useServerFn(listJadwal);
  const { data: schedules = [], isLoading, error } = useQuery<Jadwal[]>({
    queryKey: ["klinik_jadwal"],
    queryFn: async () => (await callList()) as unknown as Jadwal[],
  });

  const callDel = useServerFn(deleteJadwal);
  const delM = useMutation({
    mutationFn: (id: string) => callDel({ data: { id } }),
    onSuccess: () => { toast.success("Jadwal dihapus"); qc.invalidateQueries({ queryKey: ["klinik_jadwal"] }); },
    onError: (e: Error) => toast.error(friendlyError(e)),
  });

  const doctors = useMemo(
    () => Array.from(new Set(schedules.map((s) => s.dokter_name))),
    [schedules],
  );

  const filtered = useMemo(
    () => schedules.filter((s) => {
      if (day !== "all" && s.day !== day) return false;
      if (doc !== "all" && s.dokter_name !== doc) return false;
      return true;
    }),
    [schedules, day, doc],
  );

  const density = DAYS.map((d) => ({
    day: d.slice(0, 3),
    kuota: schedules.filter((s) => s.day === d).reduce((a, s) => a + s.quota, 0),
    booked: schedules.filter((s) => s.day === d).reduce((a, s) => a + s.booked, 0),
  }));

  return (
    <div>
      <PageHeader title="Jadwal Dokter" desc="Pengaturan dan kepadatan jadwal poli klinik mata." />

      <div className="mb-4 flex flex-wrap gap-2">
        <Select value={day} onValueChange={setDay}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Hari" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Hari</SelectItem>
            {DAYS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={doc} onValueChange={setDoc}>
          <SelectTrigger className="w-[220px]"><SelectValue placeholder="Dokter" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Dokter</SelectItem>
            {doctors.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button className="ml-auto gap-1" onClick={() => { setEditing(null); setOpenForm(true); }}>
          <Plus className="h-4 w-4" /> Tambah Jadwal
        </Button>
      </div>

      <Tabs defaultValue="list" className="w-full">
        <TabsList className="mb-3">
          <TabsTrigger value="list"><ListIcon className="mr-1 h-3 w-3" />List</TabsTrigger>
          <TabsTrigger value="cal"><LayoutGrid className="mr-1 h-3 w-3" />Kalender</TabsTrigger>
        </TabsList>
        <TabsContent value="list" className="grid gap-4 lg:grid-cols-3">
        <div className="overflow-hidden rounded-xl border border-border bg-card lg:col-span-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Dokter</TableHead>
                <TableHead>Poli</TableHead>
                <TableHead>Hari</TableHead>
                <TableHead>Jam</TableHead>
                <TableHead>Kuota</TableHead>
                <TableHead>Booked</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} className="py-12 text-center text-sm text-muted-foreground">Memuat jadwal…</TableCell></TableRow>
              ) : error ? (
                <TableRow><TableCell colSpan={8} className="py-12 text-center text-sm text-destructive">Gagal memuat jadwal.</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="py-12 text-center text-sm text-muted-foreground">Tidak ada jadwal.</TableCell></TableRow>
              ) : filtered.map((s) => {
                const pct = s.quota > 0 ? Math.round((s.booked / s.quota) * 100) : 0;
                return (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.dokter_name}</TableCell>
                    <TableCell>{s.poli}</TableCell>
                    <TableCell>{s.day}</TableCell>
                    <TableCell className="font-mono text-xs">{s.start_time}–{s.end_time}</TableCell>
                    <TableCell>{s.quota}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="w-8 text-xs">{s.booked}</span>
                        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                          <div className={`h-full ${pct > 90 ? "bg-rose-500" : pct > 70 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {s.is_active
                        ? <Badge className="bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/20">Aktif</Badge>
                        : <Badge variant="secondary">Nonaktif</Badge>}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost" aria-label="Edit" onClick={() => { setEditing(s); setOpenForm(true); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" aria-label="Hapus" onClick={() => {
                        if (confirm(`Hapus jadwal ${s.dokter_name} ${s.day}?`)) delM.mutate(s.id);
                      }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="mb-3 font-medium">Kepadatan Jadwal Mingguan</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={density}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="day" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Bar dataKey="kuota" fill="hsl(var(--muted-foreground))" opacity={0.3} radius={4} />
                <Bar dataKey="booked" fill="hsl(var(--primary))" radius={4} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        </TabsContent>

        <TabsContent value="cal">
          <div className="overflow-x-auto rounded-xl border border-border bg-card p-3">
            <div className="grid min-w-[860px]" style={{ gridTemplateColumns: `80px repeat(${DAYS.length}, minmax(0, 1fr))` }}>
              <div className="border-b border-border p-2 text-xs font-medium text-muted-foreground">Jam</div>
              {DAYS.map((d) => <div key={d} className="border-b border-l border-border p-2 text-center text-xs font-semibold">{d}</div>)}
              {Array.from({ length: 12 }, (_, i) => 8 + i).map((h) => (
                <div key={`row-${h}`} className="contents">
                  <div key={`h-${h}`} className="border-b border-border p-2 text-right text-[11px] text-muted-foreground">{String(h).padStart(2,"0")}:00</div>
                  {DAYS.map((d) => {
                    const hits = filtered.filter((s) => s.day === d && Number(s.start_time.slice(0,2)) <= h && Number(s.end_time.slice(0,2)) > h);
                    return (
                      <div key={`${d}-${h}`} className="relative min-h-14 border-b border-l border-border p-1">
                        {hits.map((s) => {
                          const pct = s.quota > 0 ? Math.round((s.booked/s.quota)*100) : 0;
                          const overlap = hits.length > 1;
                          return (
                            <button key={s.id} onClick={() => { setEditing(s); setOpenForm(true); }}
                              title={`${s.dokter_name} · ${s.start_time}–${s.end_time} · ${s.booked}/${s.quota} (${pct}%)${overlap ? " · OVERLAP" : ""}`}
                              className={`mb-1 block w-full truncate rounded px-1 py-0.5 text-left text-[10px] leading-tight ${overlap ? "ring-1 ring-destructive" : ""} ${!s.is_active ? "bg-muted text-muted-foreground line-through" : pct > 90 ? "bg-rose-500/20 text-rose-700 dark:text-rose-300" : pct > 70 ? "bg-amber-500/20 text-amber-700 dark:text-amber-300" : "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"}`}>
                              {s.dokter_name.replace(/^dr\.?\s*/i,"")} · {s.booked}/{s.quota}
                            </button>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
            <p className="mt-3 text-[11px] text-muted-foreground">Blok merah bergaris = overlap. Warna: hijau &lt;70%, kuning 70–90%, merah &gt;90% kuota terpakai. Klik untuk edit.</p>
          </div>
        </TabsContent>
      </Tabs>

      {openForm && (
        <JadwalForm initial={editing} onClose={() => setOpenForm(false)} onSaved={() => {
          qc.invalidateQueries({ queryKey: ["klinik_jadwal"] }); setOpenForm(false);
        }} />
      )}
    </div>
  );
}

function JadwalForm({ initial, onClose, onSaved }: { initial: Jadwal | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    id: initial?.id,
    dokter_id: initial?.dokter_id ?? null,
    dokter_name: initial?.dokter_name ?? "",
    poli: initial?.poli ?? "Poli Umum Mata",
    day: (initial?.day ?? "Senin") as Day,
    start_time: initial?.start_time ?? "08:00",
    end_time: initial?.end_time ?? "12:00",
    quota: initial?.quota ?? 20,
    is_active: initial?.is_active ?? true,
  });

  const callUpsert = useServerFn(upsertJadwal);
  const m = useMutation({
    mutationFn: () => callUpsert({ data: form }),
    onSuccess: () => { toast.success("Jadwal tersimpan"); onSaved(); },
    onError: (e: Error) => toast.error(friendlyError(e)),
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>{initial ? "Edit Jadwal" : "Tambah Jadwal"}</DialogTitle></DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid gap-1.5"><Label htmlFor="jd-doc">Nama Dokter</Label>
            <Input id="jd-doc" value={form.dokter_name} onChange={(e) => setForm({ ...form, dokter_name: e.target.value })} /></div>
          <div className="grid gap-1.5"><Label htmlFor="jd-poli">Poli</Label>
            <Input id="jd-poli" value={form.poli} onChange={(e) => setForm({ ...form, poli: e.target.value })} /></div>
          <div className="grid grid-cols-3 gap-2">
            <div className="grid gap-1.5"><Label>Hari</Label>
              <Select value={form.day} onValueChange={(v) => setForm({ ...form, day: v as Day })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{DAYS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
              </Select></div>
            <div className="grid gap-1.5"><Label htmlFor="jd-start">Mulai</Label>
              <Input id="jd-start" type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} /></div>
            <div className="grid gap-1.5"><Label htmlFor="jd-end">Selesai</Label>
              <Input id="jd-end" type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="grid gap-1.5"><Label htmlFor="jd-q">Kuota</Label>
              <Input id="jd-q" type="number" min={0} value={form.quota} onChange={(e) => setForm({ ...form, quota: Number(e.target.value) })} /></div>
            <div className="flex items-end gap-2"><Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /><Label>Aktif</Label></div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button disabled={m.isPending || !form.dokter_name || !form.poli} onClick={() => m.mutate()}>
            {m.isPending ? "Menyimpan…" : "Simpan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
