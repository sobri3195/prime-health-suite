import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/lib/page-head";
import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Upload, Search, Trash2, FileText, FileImage, FileArchive } from "lucide-react";
import { SkeletonList, EmptyState } from "@/components/apps/ui";
import { listDocuments, uploadDocument, deleteDocument } from "@/lib/clinic.functions";
import { toast } from "sonner";
import { friendlyError } from "@/lib/apps-error";

export const Route = createFileRoute("/_authenticated/sim-klinik/dokumen")({
  head: () => pageHead({ title: 'Dokumen & SOP — SIM Klinik', description: 'Pustaka SOP, kebijakan, dan dokumen operasional klinik.', path: '/sim-klinik/dokumen' }),
  component: DokumenPage,
});

const DOC_TYPES = ["Rekam Medis", "Hasil Lab", "Foto Mata", "Resep", "Informed Consent", "Surat Rujukan"];

function FileIcon({ mime }: { mime: string }) {
  if (mime === "image") return <FileImage className="h-4 w-4 text-blue-500" />;
  if (mime === "zip") return <FileArchive className="h-4 w-4 text-amber-500" />;
  return <FileText className="h-4 w-4 text-rose-500" />;
}

function DokumenPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [type, setType] = useState<string>("all");
  const [openUpload, setOpenUpload] = useState(false);

  const list = useServerFn(listDocuments);
  const { data, isLoading } = useQuery({
    queryKey: ["clinic-documents", q, type],
    queryFn: () => list({ data: { q: q || undefined, type: type === "all" ? undefined : type } }),
  });

  const del = useServerFn(deleteDocument);
  const delMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["clinic-documents"] }); toast.success("Dokumen dihapus"); },
    onError: (e: Error) => toast.error(friendlyError(e, "Gagal hapus")),
  });

  const rows = Array.isArray(data) ? data : (data?.rows ?? []);

  return (
    <div>
      <PageHeader title="Dokumen Pasien" desc="Repositori dokumen klinis: rekam medis, hasil lab, foto mata, resep, dan rujukan." />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative max-w-xs flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari judul atau pasien…" className="pl-9" />
        </div>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua jenis</SelectItem>
            {DOC_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="ml-auto">
          <Button onClick={() => setOpenUpload(true)} className="gap-1"><Upload className="h-4 w-4" /> Upload</Button>
        </div>
      </div>

      {isLoading ? (
        <SkeletonList rows={5} />
      ) : rows.length === 0 ? (
        <EmptyState title="Belum ada dokumen" hint="Klik Upload untuk menambah dokumen pertama." />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Dokumen</TableHead>
                <TableHead>Pasien</TableHead>
                <TableHead>Jenis</TableHead>
                <TableHead>Diunggah</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((d) => (
                <TableRow key={d.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <FileIcon mime={d.mime} />
                      <span className="text-sm">{d.title}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    <div>{d.patient_name}</div>
                    <div className="font-mono text-xs text-muted-foreground">{d.patient_code}</div>
                  </TableCell>
                  <TableCell><Badge variant="secondary">{d.doc_type}</Badge></TableCell>
                  <TableCell className="text-xs">
                    <div>{new Date(d.uploaded_at).toLocaleDateString("id-ID")}</div>
                    <div className="text-muted-foreground">oleh {d.uploaded_by_email ?? "—"}</div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" onClick={() => delMut.mutate(d.id)} aria-label="Hapus">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <UploadDialog open={openUpload} onOpenChange={setOpenUpload} onUploaded={() => qc.invalidateQueries({ queryKey: ["clinic-documents"] })} />
    </div>
  );
}

function UploadDialog({
  open, onOpenChange, onUploaded,
}: { open: boolean; onOpenChange: (v: boolean) => void; onUploaded: () => void }) {
  const [patientCode, setPatientCode] = useState("P000001");
  const [patientName, setPatientName] = useState("");
  const [docType, setDocType] = useState(DOC_TYPES[0]);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const upload = useServerFn(uploadDocument);
  const m = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Pilih file terlebih dahulu");
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id ?? "anon";
      const safe = file.name.replace(/[^\w.\-]/g, "_");
      const path = `${uid}/${Date.now()}-${safe}`;
      const up = await supabase.storage.from("clinic-documents").upload(path, file, {
        contentType: file.type || "application/octet-stream", upsert: false,
      });
      if (up.error) throw up.error;
      const mimeCat: "pdf" | "image" | "zip" =
        file.type.startsWith("image/") ? "image"
          : file.type.includes("zip") ? "zip" : "pdf";
      try {
        return await upload({ data: {
          patient_code: patientCode, patient_name: patientName,
          doc_type: docType, title: title || `${docType} — ${patientName}`,
          mime: mimeCat, size_bytes: file.size, storage_path: path,
        } });
      } catch (e) {
        await supabase.storage.from("clinic-documents").remove([path]);
        throw e;
      }
    },
    onSuccess: () => {
      toast.success("Dokumen terunggah"); onUploaded(); onOpenChange(false);
      setTitle(""); setFile(null);
      if (fileRef.current) fileRef.current.value = "";
    },
    onError: (e: Error) => toast.error(friendlyError(e, "Gagal upload")),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Upload Dokumen</DialogTitle></DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="grid gap-1.5"><Label htmlFor="dok-pc" className="text-xs">Kode Pasien</Label><Input id="dok-pc" value={patientCode} onChange={(e) => setPatientCode(e.target.value)} /></div>
            <div className="grid gap-1.5"><Label htmlFor="dok-pn" className="text-xs">Nama Pasien</Label><Input id="dok-pn" value={patientName} onChange={(e) => setPatientName(e.target.value)} /></div>
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs">Jenis Dokumen</Label>
            <Select value={docType} onValueChange={setDocType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{DOC_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="dok-title" className="text-xs">Judul</Label>
            <Input id="dok-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={`${docType} — ${patientName || "Pasien"}`} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="dok-file" className="text-xs">File (PDF / Gambar / ZIP, maks 25MB)</Label>
            <Input id="dok-file" ref={fileRef} type="file" accept=".pdf,image/*,.zip" onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              if (f && f.size > 25 * 1024 * 1024) { toast.error("Ukuran file > 25MB"); return; }
              setFile(f);
            }} />
            {file && <div className="text-xs text-muted-foreground">{file.name} • {(file.size/1024).toFixed(1)} KB</div>}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button
            disabled={m.isPending || !patientCode || !patientName || !file}
            onClick={() => m.mutate()}
          >
            {m.isPending ? "Mengunggah…" : "Upload"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

