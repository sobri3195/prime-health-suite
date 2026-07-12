// i18n-lint-disable-file — internal/admin or operator UI; strings tracked separately.
import { useMemo, useRef, useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/app-shell";
import { PageContainer, SearchInput, Select, StatusBadge, EmptyState } from "./ui";
import { Upload, Download, Trash2, X, RotateCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useConfirm } from "@/components/apps/confirm-dialog";


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
  const confirm = useConfirm();
  const [q, setQ] = useState("");

  const [type, setType] = useState<string>("all");
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const abortRef = useRef<{ canceled: boolean; path: string | null; controller: AbortController | null }>({ canceled: false, path: null, controller: null });
  const [timedOut, setTimedOut] = useState(false);
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
      const controller = new AbortController();
      abortRef.current = { canceled: false, path, controller };
      setTimedOut(false);
      setProgress(10);
      // Timeout 60s: mark UI, tapi upload tetap berjalan hingga user retry/cancel.
      const timeoutId = window.setTimeout(() => setTimedOut(true), 60_000);
      try {
        // Bypass supabase-js so we can pass AbortSignal — cancel really aborts.
        const { data: sess } = await supabase.auth.getSession();
        const token = sess.session?.access_token;
        const url = `${(supabase as any).storageUrl ?? ""}/object/${BUCKET}/${encodeURI(path)}`;
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": mime,
            "x-upsert": "false",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: pendingFile,
          signal: controller.signal,
        }).catch((e) => {
          if (e?.name === "AbortError") throw new Error("Upload dibatalkan");
          throw e;
        });
        if (abortRef.current.canceled) {
          await supabase.storage.from(BUCKET).remove([path]).catch(() => {});
          throw new Error("Upload dibatalkan");
        }
        if (!res.ok) throw new Error((await res.text().catch(() => "")) || "Upload gagal");
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
          await supabase.storage.from(BUCKET).remove([path]).catch(() => {});
          throw error;
        }
        setProgress(100);
      } finally {
        window.clearTimeout(timeoutId);
      }
    },
    onSuccess: () => {
      toast.success("Dokumen terupload");
      setPendingFile(null);
      setProgress(0);
      setTimedOut(false);
      setMeta({ title: "", doc_type: "SOP Klinik", patient_code: "-", patient_name: "Internal" });
      if (fileRef.current) fileRef.current.value = "";
      qc.invalidateQueries({ queryKey: ["clinic_document"] });
    },
    onError: (e: any) => {
      setProgress(0);
      setTimedOut(false);
      toast.error(e?.message ?? "Gagal upload — coba lagi");
    },
  });

  const onCancelUpload = () => {
    abortRef.current.canceled = true;
    abortRef.current.controller?.abort();
    setProgress(0);
    setTimedOut(false);
    toast.message("Upload dibatalkan");
  };

  const onRetryUpload = () => {
    if (!pendingFile) return;
    upload.reset();
    upload.mutate();
  };

  useEffect(() => () => {
    abortRef.current.canceled = true;
    abortRef.current.controller?.abort();
  }, []);


  const onDownload = async (row: DocRow) => {
    if (!row.storage_path) return;
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(row.storage_path, 60);
    if (error || !data) return toast.error(error?.message ?? "Gagal membuat link");
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  const onDelete = async (row: DocRow) => {
    if (!(await confirm({ description: `Hapus "${row.title}"?`, destructive: true, confirmText: "Hapus" }))) return;
    try {
      if (row.storage_path) {
        const { error: rmErr } = await supabase.storage.from(BUCKET).remove([row.storage_path]);
        if (rmErr) {
          toast.error(`Gagal menghapus file di storage: ${rmErr.message}. Metadata tidak dihapus agar tidak orphan.`);
          return;
        }
      }
      const { error } = await supabase.from("clinic_document").delete().eq("id", row.id);
      if (error) { toast.error(`Gagal menghapus: ${error.message}`); return; }
      toast.success("Dokumen dihapus");
      qc.invalidateQueries({ queryKey: ["clinic_document"] });
    } catch (e) {
      toast.error(`Gagal menghapus dokumen: ${(e as Error).message}`);
    }
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
          accept={ALLOWED_MIME.join(",")}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null;
            if (f) {
              if (f.size === 0) { toast.error("File kosong (0 byte)"); e.target.value = ""; return; }
              if (f.size > MAX_BYTES) { toast.error(`Maks ${formatBytes(MAX_BYTES)}`); e.target.value = ""; return; }
              const mime = f.type || "application/octet-stream";
              if (!ALLOWED_MIME.includes(mime)) { toast.error(`Tipe tidak didukung: ${mime}`); e.target.value = ""; return; }
            }
            setPendingFile(f);
          }}
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
          <div className="flex flex-wrap items-center gap-2">
            {!upload.isPending && !upload.isError && (
              <button
                onClick={() => upload.mutate()}
                className="inline-flex items-center gap-1.5 rounded-md bg-navy px-3 py-1.5 text-sm font-medium text-navy-foreground"
              >
                <Upload className="h-4 w-4" /> Upload
              </button>
            )}
            {upload.isPending && (
              <>
                <span className="inline-flex items-center gap-1.5 rounded-md bg-navy/70 px-3 py-1.5 text-sm font-medium text-navy-foreground">
                  <Upload className="h-4 w-4 animate-pulse" /> Mengupload… {progress}%
                </span>
                <button
                  onClick={onCancelUpload}
                  className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-sm text-destructive hover:bg-muted"
                >
                  <X className="h-4 w-4" /> Batalkan
                </button>
                <div className="h-2 min-w-32 flex-1 overflow-hidden rounded bg-muted" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
                  <div className="h-full bg-navy transition-all" style={{ width: `${progress}%` }} />
                </div>
                {timedOut && <span className="text-xs text-amber-600">Lebih dari 60 detik — koneksi lambat. Anda bisa membatalkan lalu coba lagi.</span>}
              </>
            )}
            {upload.isError && (
              <>
                <button
                  onClick={onRetryUpload}
                  className="inline-flex items-center gap-1.5 rounded-md bg-navy px-3 py-1.5 text-sm font-medium text-navy-foreground"
                >
                  <RotateCw className="h-4 w-4" /> Coba lagi
                </button>
                <span className="text-xs text-destructive">Upload sebelumnya gagal. Silakan coba lagi atau batalkan.</span>
              </>
            )}
            <button
              disabled={upload.isPending}
              onClick={() => {
                setPendingFile(null);
                upload.reset();
                setProgress(0);
                setTimedOut(false);
                if (fileRef.current) fileRef.current.value = "";
              }}
              className="rounded-md border border-border px-3 py-1.5 text-sm disabled:opacity-50"
            >
              Bersihkan
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
