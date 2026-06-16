import { toast } from "sonner";

/** Extract a friendly Indonesian message from any thrown value. */
export function getErrorMessage(e: unknown, fallback = "Terjadi kesalahan tak terduga."): string {
  if (!e) return fallback;
  if (typeof e === "string") return e;
  if (e instanceof Error) {
    const msg = e.message?.trim();
    if (!msg) return fallback;
    // map common low-level messages → Indonesian
    if (/network|fetch|failed to fetch/i.test(msg)) return "Koneksi terputus. Coba lagi.";
    if (/unauthor/i.test(msg)) return "Sesi berakhir. Silakan login ulang.";
    if (/forbidden|permission|read-only/i.test(msg)) return msg.startsWith("Read-only") ? msg : "Akses ditolak.";
    if (/not found/i.test(msg)) return "Data tidak ditemukan.";
    if (/duplicate|unique/i.test(msg)) return "Data sudah ada (duplikat).";
    if (/timeout/i.test(msg)) return "Permintaan timeout. Coba lagi.";
    return msg;
  }
  try { return JSON.stringify(e); } catch { return fallback; }
}

/** Standard error toast with console log for debugging. */
export function handleError(e: unknown, fallback?: string) {
  // eslint-disable-next-line no-console
  console.error("[error]", e);
  toast.error(getErrorMessage(e, fallback));
}

/** Wrap an async action with consistent toasts. */
export async function withToast<T>(
  fn: () => Promise<T>,
  msgs: { loading?: string; success?: string; error?: string } = {},
): Promise<T | undefined> {
  const id = msgs.loading ? toast.loading(msgs.loading) : undefined;
  try {
    const res = await fn();
    if (id !== undefined) toast.dismiss(id);
    if (msgs.success) toast.success(msgs.success);
    return res;
  } catch (e) {
    if (id !== undefined) toast.dismiss(id);
    handleError(e, msgs.error);
    return undefined;
  }
}
