import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Upload, Search, Eye, Download, Trash2, FileText, FileImage, FileArchive,
} from "lucide-react";
import { patients } from "@/data/clinicData";
import { addAudit } from "@/lib/audit-log";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/sim-klinik/dokumen")({
  component: DokumenPage,
});

type DocType = "Rekam Medis" | "Hasil Lab" | "Foto Mata" | "Resep" | "Informed Consent" | "Surat Rujukan";

interface DocRow {
  id: string;
  patientId: string;
  patientName: string;
  type: DocType;
  title: string;
  size: string;
  mime: "pdf" | "image" | "zip";
  uploadedBy: string;
  uploadedAt: string;
}

const DOC_TYPES: DocType[] = ["Rekam Medis", "Hasil Lab", "Foto Mata", "Resep", "Informed Consent", "Surat Rujukan"];

function seed(): DocRow[] {
  return patients.slice(0, 14).map((p, i) => {
    const t = DOC_TYPES[i % DOC_TYPES.length];
    const mime: DocRow["mime"] = t === "Foto Mata" ? "image" : t === "Hasil Lab" ? "zip" : "pdf";
    return {
      id: `DOC-${String(2001 + i).padStart(5, "0")}`,
      patientId: p.id,
      patientName: p.name,
      type: t,
      title: `${t} — ${p.name}`,
      size: ["320 KB", "1.2 MB", "740 KB", "2.4 MB", "180 KB"][i % 5],
      mime,
      uploadedBy: ["dr. Rini", "dr. Bagas", "admin", "perawat.ari"][i % 4],
      uploadedAt: new Date(Date.now() - i * 36e5 * 6).toISOString(),
    };
  });
}

function FileIcon({ mime }: { mime: DocRow["mime"] }) {
  if (mime === "image") return <FileImage className="h-4 w-4 text-blue-500" />;
  if (mime === "zip") return <FileArchive className="h-4 w-4 text-amber-500" />;
  return <FileText className="h-4 w-4 text-rose-500" />;
}

function DokumenPage() {
  const { user } = useAuth();
  const [list, setList] = useState<DocRow[]>(seed());
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | DocType>("all");
  const [upload, setUpload] = useState(false);
  const [preview, setPreview] = useState<DocRow | null>(null);

  const filtered = useMemo(
    () => list.filter((d) =>
      (filter === "all" || d.type === filter) &&
      (q === "" || d.title.toLowerCase().includes(q.toLowerCase()) || d.patientId.toLowerCase().includes(q.toLowerCase())),
    ),
    [list, q, filter],
  );

  const remove = (id: string) => {
    setList((arr) => arr.filter((d) => d.id !== id));
    toast.message(`${id} dihapus`);
  };

  const download = (d: DocRow) => {
    addAudit({ actor: user?.email ?? "system", action: "export", target: `dokumen/${d.id}` });
    toast.success(`Mengunduh ${d.title}`);
  };

  return (
    <div>
      <PageHeader
        title="Dokumen Pasien"
        desc="Repositori dokumen klinis: rekam medis, hasil lab, foto mata, resep, informed consent, dan surat rujukan."
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative max-w-xs flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Cari judul atau kode pasien…"
            className="pl-9"
          />
        </div>
        <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua jenis</SelectItem>
            {DOC_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="ml-auto">
          <Button onClick={() => setUpload(true)} className="gap-1"><Upload className="h-4 w-4" /> Upload</Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Dokumen</TableHead>
              <TableHead>Pasien</TableHead>
              <TableHead>Jenis</TableHead>
              <TableHead>Ukuran</TableHead>
              <TableHead>Diunggah</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">Tidak ada dokumen.</TableCell></TableRow>
            )}
            {filtered.map((d) => (
              <TableRow key={d.id}>
                <TableCell className="font-mono text-xs">{d.id}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <FileIcon mime={d.mime} />
                    <span className="text-sm">{d.title}</span>
                  </div>
                </TableCell>
                <TableCell className="text-sm">
                  <div>{d.patientName}</div>
                  <div className="font-mono text-xs text-muted-foreground">{d.patientId}</div>
                </TableCell>
                <TableCell><Badge variant="secondary">{d.type}</Badge></TableCell>
                <TableCell className="text-xs text-muted-foreground">{d.size}</TableCell>
                <TableCell className="text-xs">
                  <div>{new Date(d.uploadedAt).toLocaleDateString("id-ID")}</div>
                  <div className="text-muted-foreground">oleh {d.uploadedBy}</div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="inline-flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => setPreview(d)} aria-label="Preview"><Eye className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => download(d)} aria-label="Download"><Download className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(d.id)} aria-label="Hapus"><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <UploadDialog
        open={upload}
        onOpenChange={setUpload}
        onCreate={(d) => {
          setList((arr) => [d, ...arr]);
          addAudit({ actor: user?.email ?? "system", action: "page_access", target: `dokumen/upload/${d.id}` });
        }}
      />

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{preview?.title}</DialogTitle></DialogHeader>
          {preview && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-muted-foreground">ID:</span> <span className="font-mono">{preview.id}</span></div>
                <div><span className="text-muted-foreground">Pasien:</span> {preview.patientName}</div>
                <div><span className="text-muted-foreground">Jenis:</span> {preview.type}</div>
                <div><span className="text-muted-foreground">Ukuran:</span> {preview.size}</div>
              </div>
              <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-border bg-muted/40 text-sm text-muted-foreground">
                Preview dokumen (mock)
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreview(null)}>Tutup</Button>
            {preview && <Button onClick={() => download(preview)} className="gap-1"><Download className="h-4 w-4" /> Download</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function UploadDialog({
  open, onOpenChange, onCreate,
}: { open: boolean; onOpenChange: (v: boolean) => void; onCreate: (d: DocRow) => void }) {
  const [patientId, setPatientId] = useState(patients[0].id);
  const [type, setType] = useState<DocType>("Rekam Medis");
  const [title, setTitle] = useState("");

  const submit = () => {
    const p = patients.find((x) => x.id === patientId)!;
    const d: DocRow = {
      id: `DOC-${Date.now().toString().slice(-6)}`,
      patientId: p.id, patientName: p.name,
      type, title: title || `${type} — ${p.name}`,
      size: "—", mime: type === "Foto Mata" ? "image" : "pdf",
      uploadedBy: "current.user", uploadedAt: new Date().toISOString(),
    };
    onCreate(d);
    onOpenChange(false);
    setTitle("");
    toast.success(`Dokumen ${d.id} terunggah`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Upload Dokumen</DialogTitle></DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid gap-1.5">
            <label className="text-xs">Pasien</label>
            <Select value={patientId} onValueChange={setPatientId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {patients.slice(0, 20).map((p) => <SelectItem key={p.id} value={p.id}>{p.id} — {p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <label className="text-xs">Jenis Dokumen</label>
            <Select value={type} onValueChange={(v) => setType(v as DocType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DOC_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <label className="text-xs">Judul (opsional)</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Otomatis dari jenis + nama pasien" />
          </div>
          <div className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
            Drop file di sini atau klik untuk pilih (mock)
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button onClick={submit}>Upload</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
