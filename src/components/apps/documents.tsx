// i18n-lint-disable-file — internal/admin or operator UI; strings tracked separately.
import { useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/app-shell";
import { PageContainer, SearchInput, Select, StatusBadge, EmptyState } from "./ui";
import { Upload, Download, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const BUCKET = "clinic-documents";

type DocRow = {
  id: string;
  patient_code: string;
  patient_name: string;
  doc_type: string;
  title: string;
  mime: string;
  size_bytes: number;
  storage_path: string | null;
  uploaded_by_email: string | null;
  uploaded_at: string;
};

const DOC_TYPES = [
  { value: "all", label: "Semua tipe" },
  { value: "SOP Klinik", label: "SOP Klinik" },
  { value: "SOP Finance", label: "SOP Finance" },
  { value: "Panduan Aplikasi", label: "Panduan Aplikasi" },
  { value: "Formulir", label: "Formulir" },
  { value: "Kebijakan", label: "Kebijakan" },
  { value: "Rekam Medis", label: "Rekam Medis" },
  { value: "Lainnya", label: "Lainnya" },
];

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

const MAX_BYTES = 20 * 1024 * 1024; // 20 MB
const ALLOWED_MIME = [
  "application/pdf",
  "image/jpeg", "image/png", "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain", "text/csv",
];

export function DocumentsPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [type, setType] = useState<string>("all");
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [meta, setMeta] = useState({ title: "", doc_type: "SOP Klinik", patient_code: "-", patient_name: "Internal" });


  const { data = [], isLoading } = useQuery({
    queryKey: ["clinic_document"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clinic_document")
        .select("id,patient_code,patient_name,doc_type,title,mime,size_bytes,storage_path,uploaded_by_email,uploaded_at")
        .order("uploaded_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as DocRow[];
    },
  });

  const items = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return data.filter(
      (d) =>
        (type === "all" || d.doc_type === type) &&
        (!qq || d.title.toLowerCase().includes(qq) || d.patient_name.toLowerCase().includes(qq)),
    );
  }, [data, q, type]);

  const upload = useMutation({
    mutationFn: async () => {
      if (!pendingFile) throw new Error("Pilih file dulu");
      if (!meta.title.trim()) throw new Error("Judul wajib diisi");
      if (pendingFile.size === 0) throw new Error("File kosong (0 byte) — pilih file lain");
      if (pendingFile.size > MAX_BYTES) throw new Error(`Ukuran melebihi batas ${formatBytes(MAX_BYTES)}`);
      const mime = pendingFile.type || "application/octet-stream";
      if (!ALLOWED_MIME.includes(mime)) throw new Error(`Tipe file tidak didukung: ${mime}`);
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) throw new Error("Tidak ada sesi");
      const path = `${uid}/${Date.now()}-${pendingFile.name.replace(/[^\w.\-]/g, "_")}`;
      setProgress(10);
      const up = await supabase.storage.from(BUCKET).upload(path, pendingFile, {
        contentType: mime,
        upsert: false,
      });
      if (up.error) throw up.error;
      setProgress(75);
      const { error } = await supabase.from("clinic_document").insert({
        patient_code: meta.patient_code || "-",
        patient_name: meta.patient_name || "Internal",
        doc_type: meta.doc_type,
        title: meta.title.trim(),
        mime,
        size_bytes: pendingFile.size,
        storage_path: path,
        uploaded_by: uid,
        uploaded_by_email: auth.user?.email ?? null,
      });
      if (error) {
        await supabase.storage.from(BUCKET).remove([path]);
        throw error;
      }
      setProgress(100);
    },
    onSuccess: () => {
      toast.success("Dokumen terupload");
      setPendingFile(null);
      setProgress(0);
      setMeta({ title: "", doc_type: "SOP Klinik", patient_code: "-", patient_name: "Internal" });
      if (fileRef.current) fileRef.current.value = "";
      qc.invalidateQueries({ queryKey: ["clinic_document"] });
    },
    onError: (e: any) => { setProgress(0); toast.error(e?.message ?? "Gagal upload"); },
  });


  const onDownload = async (row: DocRow) => {
    if (!row.storage_path) return;
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(row.storage_path, 60);
    if (error || !data) return toast.error(error?.message ?? "Gagal membuat link");
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  const onDelete = async (row: DocRow) => {
    if (!confirm(`Hapus "${row.title}"?`)) return;
    if (row.storage_path) await supabase.storage.from(BUCKET).remove([row.storage_path]);
    const { error } = await supabase.from("clinic_document").delete().eq("id", row.id);
    if (error) return toast.error(error.message);
    toast.success("Dokumen dihapus");
    qc.invalidateQueries({ queryKey: ["clinic_document"] });
  };

  return (
    <PageContainer>
      <PageHeader title="SOP & Documents" desc="Pustaka dokumen internal Klinik Utama Mata." />

      <div className="flex flex-wrap items-center gap-3">
        <SearchInput value={q} onChange={setQ} placeholder="Cari dokumen…" />
        <Select value={type} onChange={setType} options={DOC_TYPES} />
        <button
          onClick={() => fileRef.current?.click()}
          className="ml-auto inline-flex items-center gap-1.5 rounded-md bg-navy px-3 py-1.5 text-sm font-medium text-navy-foreground hover:opacity-95"
        >
          <Upload className="h-4 w-4" /> Pilih file
        </button>
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          onChange={(e) => setPendingFile(e.target.files?.[0] ?? null)}
        />
      </div>

      {pendingFile && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="text-sm">
            <strong>{pendingFile.name}</strong>{" "}
            <span className="text-muted-foreground">({formatBytes(pendingFile.size)})</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              className="rounded-md border border-border bg-background px-3 py-1.5 text-sm"
              placeholder="Judul dokumen"
              value={meta.title}
              onChange={(e) => setMeta({ ...meta, title: e.target.value })}
            />
            <Select
              value={meta.doc_type}
              onChange={(v) => setMeta({ ...meta, doc_type: v })}
              options={DOC_TYPES.filter((d) => d.value !== "all")}
            />
            <input
              className="rounded-md border border-border bg-background px-3 py-1.5 text-sm"
              placeholder="Kode pasien (opsional)"
              value={meta.patient_code}
              onChange={(e) => setMeta({ ...meta, patient_code: e.target.value })}
            />
            <input
              className="rounded-md border border-border bg-background px-3 py-1.5 text-sm"
              placeholder="Nama / pemilik"
              value={meta.patient_name}
              onChange={(e) => setMeta({ ...meta, patient_name: e.target.value })}
            />
          </div>
          <div className="flex gap-2">
            <button
              disabled={upload.isPending}
              onClick={() => upload.mutate()}
              className="inline-flex items-center gap-1.5 rounded-md bg-navy px-3 py-1.5 text-sm font-medium text-navy-foreground disabled:opacity-60"
            >
              <Upload className="h-4 w-4" /> {upload.isPending ? "Mengupload…" : "Upload"}
            </button>
            <button
              onClick={() => {
                setPendingFile(null);
                if (fileRef.current) fileRef.current.value = "";
              }}
              className="rounded-md border border-border px-3 py-1.5 text-sm"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <EmptyState title="Memuat dokumen…" />
      ) : items.length === 0 ? (
        <EmptyState title="Belum ada dokumen" />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-surface-muted/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Judul</th>
                <th className="px-4 py-3">Tipe</th>
                <th className="px-4 py-3">Pemilik</th>
                <th className="px-4 py-3">Ukuran</th>
                <th className="px-4 py-3">Diupload</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {items.map((d) => (
                <tr key={d.id} className="border-t border-border hover:bg-muted/50">
                  <td className="px-4 py-2 font-medium">{d.title}</td>
                  <td className="px-4 py-2"><StatusBadge tone="muted">{d.doc_type}</StatusBadge></td>
                  <td className="px-4 py-2">{d.patient_name}</td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">{formatBytes(d.size_bytes)}</td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">
                    {new Date(d.uploaded_at).toLocaleDateString("id-ID", { dateStyle: "medium" })}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <div className="inline-flex gap-1">
                      <button
                        onClick={() => onDownload(d)}
                        disabled={!d.storage_path}
                        aria-label="Download"
                        className="rounded-md border border-border p-1.5 hover:bg-muted disabled:opacity-40"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => onDelete(d)}
                        aria-label="Hapus"
                        className="rounded-md border border-border p-1.5 hover:bg-muted text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PageContainer>
  );
}
