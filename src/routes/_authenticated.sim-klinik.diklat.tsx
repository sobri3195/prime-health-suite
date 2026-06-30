import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Trash2, Pencil, ExternalLink, Eye } from "lucide-react";
import { toast } from "sonner";
import { listAllDiklat, upsertDiklat, deleteDiklat, listDokterOptions } from "@/lib/diklat.functions";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export const Route = createFileRoute("/_authenticated/sim-klinik/diklat")({
  component: DiklatAdminPage,
});

type Row = {
  id: string;
  slug: string;
  judul: string;
  tanggal: string;
  dokter_id: string | null;
  is_published: boolean;
  views_count: number;
  youtube_url: string | null;
  cover_image_url: string | null;
  tags: string[];
};

const today = () => new Date().toISOString().slice(0, 10);

function DiklatAdminPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listAllDiklat);
  const dokterFn = useServerFn(listDokterOptions);

  const { data: rows = [], isLoading } = useQuery({ queryKey: ["diklat-admin"], queryFn: () => listFn() });
  const { data: dokters = [] } = useQuery({ queryKey: ["dokter-opts"], queryFn: () => dokterFn() });

  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Partial<Row & { ringkasan: string; deskripsi: string; pdf_url: string; galeri: string[] }>>({});
  const [delId, setDelId] = useState<string | null>(null);

  const upsert = useServerFn(upsertDiklat);
  type UpsertPayload = {
    id?: string;
    judul: string;
    ringkasan?: string | null;
    deskripsi?: string | null;
    tanggal: string;
    dokter_id?: string | null;
    youtube_url?: string | null;
    cover_image_url?: string | null;
    pdf_url?: string | null;
    galeri: string[];
    tags: string[];
    is_published: boolean;
  };
  const upsertMut = useMutation({
    mutationFn: (payload: UpsertPayload) => upsert({ data: payload }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["diklat-admin"] });
      qc.invalidateQueries({ queryKey: ["diklat", "public"] });
      toast.success("Diklat tersimpan");
      setOpen(false);
      setEdit({});
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useServerFn(deleteDiklat);
  const delMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["diklat-admin"] });
      qc.invalidateQueries({ queryKey: ["diklat", "public"] });
      toast.success("Diklat dihapus");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function openNew() {
    setEdit({ tanggal: today(), is_published: false, tags: [], galeri: [] });
    setOpen(true);
  }
  function openEdit(r: Row) {
    setEdit({ ...r, ringkasan: "", deskripsi: "", pdf_url: "", galeri: [] });
    setOpen(true);
  }

  function submit() {
    if (!edit.judul || edit.judul.trim().length < 3) {
      toast.error("Judul minimal 3 karakter");
      return;
    }
    upsertMut.mutate({
      id: edit.id,
      judul: edit.judul,
      ringkasan: edit.ringkasan || null,
      deskripsi: edit.deskripsi || null,
      tanggal: edit.tanggal || today(),
      dokter_id: edit.dokter_id || null,
      youtube_url: edit.youtube_url || null,
      cover_image_url: edit.cover_image_url || null,
      pdf_url: edit.pdf_url || null,
      galeri: edit.galeri || [],
      tags: edit.tags || [],
      is_published: edit.is_published ?? false,
    });
  }

  return (
    <div>
      <PageHeader
        title="Diklat & Dokumentasi"
        desc="Kelola dokumentasi pelatihan internal. Yang dipublish tampil di halaman publik /diklat untuk SEO & promosi dokter."
      />
      <div className="mb-4 flex justify-end">
        <Button onClick={openNew}>
          <Plus className="mr-2 h-4 w-4" /> Tambah Diklat
        </Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tanggal</TableHead>
              <TableHead>Judul</TableHead>
              <TableHead>Dokter</TableHead>
              <TableHead>Tags</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Memuat…</TableCell></TableRow>
            ) : rows.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Belum ada diklat.</TableCell></TableRow>
            ) : (
              rows.map((r) => {
                const dk = dokters.find((d) => d.id === r.dokter_id);
                return (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap text-sm">{r.tanggal}</TableCell>
                    <TableCell className="font-medium">{r.judul}</TableCell>
                    <TableCell className="text-sm">{dk ? `dr. ${dk.name}` : "—"}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(r.tags ?? []).slice(0, 3).map((t) => (
                          <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      {r.is_published ? (
                        <Badge className="bg-emerald-600">Publik</Badge>
                      ) : (
                        <Badge variant="outline">Draft</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {r.is_published && (
                        <Button asChild size="sm" variant="ghost">
                          <a href={`/diklat/${r.slug}`} target="_blank" rel="noopener noreferrer">
                            <Eye className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => openEdit(r)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        aria-label="Hapus diklat"
                        onClick={() => setDelId(r.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{edit.id ? "Edit Diklat" : "Tambah Diklat"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Judul *</Label>
              <Input value={edit.judul ?? ""} onChange={(e) => setEdit({ ...edit, judul: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tanggal</Label>
                <Input type="date" value={edit.tanggal ?? today()} onChange={(e) => setEdit({ ...edit, tanggal: e.target.value })} />
              </div>
              <div>
                <Label>Dokter Pemateri</Label>
                <Select
                  value={edit.dokter_id ?? "_none"}
                  onValueChange={(v) => setEdit({ ...edit, dokter_id: v === "_none" ? null : v })}
                >
                  <SelectTrigger><SelectValue placeholder="Pilih dokter" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">— Tidak ada —</SelectItem>
                    {dokters.map((d) => (
                      <SelectItem key={d.id} value={d.id}>dr. {d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Ringkasan (untuk SEO meta description, maks 160 karakter)</Label>
              <Textarea
                rows={2}
                maxLength={500}
                value={edit.ringkasan ?? ""}
                onChange={(e) => setEdit({ ...edit, ringkasan: e.target.value })}
              />
            </div>
            <div>
              <Label>Deskripsi lengkap</Label>
              <Textarea
                rows={6}
                value={edit.deskripsi ?? ""}
                onChange={(e) => setEdit({ ...edit, deskripsi: e.target.value })}
              />
            </div>
            <div>
              <Label>URL YouTube</Label>
              <Input
                placeholder="https://youtube.com/watch?v=..."
                value={edit.youtube_url ?? ""}
                onChange={(e) => setEdit({ ...edit, youtube_url: e.target.value })}
              />
            </div>
            <div>
              <Label>URL Cover Image (jpg/png/webp)</Label>
              <Input
                placeholder="https://..."
                value={edit.cover_image_url ?? ""}
                onChange={(e) => setEdit({ ...edit, cover_image_url: e.target.value })}
              />
            </div>
            <div>
              <Label>URL Materi PDF</Label>
              <Input
                placeholder="https://..."
                value={edit.pdf_url ?? ""}
                onChange={(e) => setEdit({ ...edit, pdf_url: e.target.value })}
              />
            </div>
            <div>
              <Label>Galeri (URL gambar, satu per baris, maks 20)</Label>
              <Textarea
                rows={3}
                placeholder="https://...&#10;https://..."
                value={(edit.galeri ?? []).join("\n")}
                onChange={(e) =>
                  setEdit({
                    ...edit,
                    galeri: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean).slice(0, 20),
                  })
                }
              />
            </div>
            <div>
              <Label>Tags penyakit/topik (pisahkan dengan koma)</Label>
              <Input
                placeholder="katarak, glaukoma, lasik"
                value={(edit.tags ?? []).join(", ")}
                onChange={(e) =>
                  setEdit({
                    ...edit,
                    tags: e.target.value.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 15),
                  })
                }
              />
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <Label className="text-sm font-medium">Publikasikan</Label>
                <p className="text-xs text-muted-foreground">Tampilkan di halaman publik /diklat & sitemap</p>
              </div>
              <Switch
                checked={edit.is_published ?? false}
                onCheckedChange={(v) => setEdit({ ...edit, is_published: v })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
            <Button onClick={submit} disabled={upsertMut.isPending}>
              {upsertMut.isPending ? "Menyimpan…" : "Simpan"}
            </Button>
          </DialogFooter>
          {edit.id && edit.is_published && (
            <a
              href={`/diklat/${edit.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              Lihat halaman publik <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
