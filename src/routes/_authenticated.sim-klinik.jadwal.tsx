import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/sim-klinik/jadwal")({
  component: JadwalPage,
});

const DAYS = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];

type Jadwal = {
  id: string;
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
  const [day, setDay] = useState("all");
  const [doc, setDoc] = useState("all");

  const { data: schedules = [], isLoading, error } = useQuery<Jadwal[]>({
    queryKey: ["klinik_jadwal"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("klinik_jadwal")
        .select("id,dokter_name,poli,day,start_time,end_time,quota,booked,is_active")
        .order("dokter_name");
      if (error) throw error;
      return (data ?? []) as Jadwal[];
    },
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
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="py-12 text-center text-sm text-muted-foreground">Memuat jadwal…</TableCell></TableRow>
              ) : error ? (
                <TableRow><TableCell colSpan={7} className="py-12 text-center text-sm text-destructive">Gagal memuat jadwal.</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="py-12 text-center text-sm text-muted-foreground">Tidak ada jadwal.</TableCell></TableRow>
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
      </div>
    </div>
  );
}
