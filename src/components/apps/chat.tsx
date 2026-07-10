import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Send, MessageCircle, Paperclip, X, FileText, ImageIcon } from "lucide-react";
import { getOrCreateRoom, listChatMessages, sendChatMessage, signChatAttachment } from "@/lib/apps-chat.functions";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { SkeletonList, EmptyState } from "@/components/apps/ui";

const MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024; // 8 MB
const ALLOWED_MIMES = /^(image\/(png|jpe?g|webp|gif)|application\/pdf)$/i;

function AttachmentPreview({ path, name, mime }: { path: string; name: string; mime?: string | null }) {
  const callSign = useServerFn(signChatAttachment);
  const q = useQuery({
    queryKey: ["apps", "chat-attach", path],
    queryFn: () => callSign({ data: { path } }),
    staleTime: 60_000 * 5,
  });
  const isImg = (mime || "").startsWith("image/");
  if (q.isLoading) return <div className="mt-1 text-xs opacity-70">…</div>;
  if (!q.data?.url) return <div className="mt-1 text-xs opacity-70">{name}</div>;
  if (isImg) {
    return (
      <a href={q.data.url} target="_blank" rel="noreferrer" className="mt-1 block">
        <img src={q.data.url} alt={name} className="max-h-48 rounded-lg border" />
      </a>
    );
  }
  return (
    <a href={q.data.url} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs underline">
      <FileText className="h-3.5 w-3.5" /> {name}
    </a>
  );
}

export function PatientChat() {
  const { t, lang } = useI18n();
  const qc = useQueryClient();
  const callRoom = useServerFn(getOrCreateRoom);
  const callMsgs = useServerFn(listChatMessages);
  const callSend = useServerFn(sendChatMessage);
  const roomQ = useQuery({ queryKey: ["apps", "chat-room"], queryFn: () => callRoom() });
  const room = roomQ.data?.room;
  const msgsQ = useQuery({
    queryKey: ["apps", "chat-msgs", room?.id],
    queryFn: () => callMsgs({ data: { room_id: room!.id } }),
    enabled: !!room?.id,
  });
  const [body, setBody] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const sendM = useMutation({
    mutationFn: async () => {
      let attach: { attachment_path?: string; attachment_name?: string; attachment_mime?: string } = {};
      if (file) {
        if (file.size > MAX_ATTACHMENT_BYTES) throw new Error("Ukuran file maksimal 8 MB");
        if (!ALLOWED_MIMES.test(file.type)) throw new Error("Format tidak didukung (gambar/PDF saja)");
        setUploading(true);
        const { data: sess } = await supabase.auth.getUser();
        const uid = sess.user?.id;
        if (!uid) throw new Error("Not authenticated");
        const path = `${uid}/chat/${Date.now()}-${file.name.replace(/[^\w.\-]/g, "_")}`;
        const { error: upErr } = await supabase.storage.from("apps-mata").upload(path, file, { contentType: file.type });
        setUploading(false);
        if (upErr) throw new Error(upErr.message);
        attach = { attachment_path: path, attachment_name: file.name, attachment_mime: file.type };
      }
      return callSend({ data: { room_id: room!.id, body: body.trim(), ...attach } });
    },
    onSuccess: () => {
      setBody(""); setFile(null); if (fileRef.current) fileRef.current.value = "";
      qc.invalidateQueries({ queryKey: ["apps", "chat-msgs", room!.id] });
    },
    onError: (e: Error) => { setUploading(false); toast.error(e.message); },
  });

  useEffect(() => {
    if (!room?.id) return;
    const ch = supabase.channel(`chat-${room.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "apps_chat_msg", filter: `room_id=eq.${room.id}` },
        () => qc.invalidateQueries({ queryKey: ["apps", "chat-msgs", room.id] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [room?.id, qc]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgsQ.data?.messages.length]);

  const messages = msgsQ.data?.messages ?? [];
  const canSend = (!!body.trim() || !!file) && !sendM.isPending && !uploading;

  return (
    <div className="mx-auto flex h-[calc(100vh-160px)] max-w-2xl flex-col">
      <div className="rounded-t-2xl border border-b-0 border-[#e9dfb8] bg-white p-4">
        <div className="flex items-center gap-2">
          <div className="rounded-full bg-[#fdf2c4] p-2"><MessageCircle className="h-4 w-4 text-[#6b5a16]" /></div>
          <div>
            <div className="text-sm font-bold">{t("chat.title")}</div>
            <div className="text-[11px] text-emerald-600">{t("chat.online")}</div>
          </div>
        </div>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto border border-[#e9dfb8] bg-[#fdf8e8] p-4">
        {msgsQ.isLoading ? (
          <SkeletonList rows={3} />
        ) : messages.length === 0 ? (
          <EmptyState title={t("chat.empty.title")} hint={t("chat.empty.hint")} />
        ) : (
          messages.map((m: any) => {
            const isMe = m.sender === "patient";
            const isSys = m.sender === "system";
            return (
              <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                  isSys ? "bg-[#fdf2c4] text-[#5a4a14] italic" :
                  isMe ? "bg-[#a08a2a] text-white" : "bg-white border border-[#e9dfb8]"
                }`}>
                  {!isMe && !isSys && <div className="mb-0.5 text-[10px] font-bold text-[#6b5a16]">{t("chat.from")}</div>}
                  {m.body && <div className="whitespace-pre-wrap">{m.body}</div>}
                  {m.attachment_path && (
                    <AttachmentPreview path={m.attachment_path} name={m.attachment_name || "lampiran"} mime={m.attachment_mime} />
                  )}
                  <div className={`mt-1 text-[10px] ${isMe ? "text-white/70" : "text-muted-foreground"}`}>
                    {new Date(m.created_at).toLocaleTimeString(lang === "en" ? "en-US" : "id-ID", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={(e) => { e.preventDefault(); if (canSend) sendM.mutate(); }}
        className="rounded-b-2xl border border-t-0 border-[#e9dfb8] bg-white p-3">
        {file && (
          <div className="mb-2 flex items-center gap-2 rounded-lg bg-[#fdf8e8] px-2 py-1.5 text-xs text-[#5a4a14]">
            {file.type.startsWith("image/") ? <ImageIcon className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />}
            <span className="truncate">{file.name}</span>
            <span className="opacity-60">({Math.ceil(file.size/1024)} KB)</span>
            <button type="button" onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = ""; }}
              aria-label="hapus lampiran" className="ml-auto rounded p-0.5 hover:bg-black/5"><X className="h-3.5 w-3.5" /></button>
          </div>
        )}
        <div className="flex gap-2">
          <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          <button type="button" onClick={() => fileRef.current?.click()}
            aria-label="lampirkan file"
            className="rounded-xl border border-[#e9dfb8] bg-white px-3 text-[#6b5a16] hover:bg-[#fdf8e8]">
            <Paperclip className="h-4 w-4" />
          </button>
          <input value={body} onChange={(e) => setBody(e.target.value)} placeholder={t("chat.placeholder")}
            aria-label={t("chat.placeholder")}
            className="flex-1 rounded-xl border border-[#e9dfb8] bg-[#fdf8e8] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#a08a2a]" />
          <button disabled={!canSend} type="submit" aria-label="send"
            className="rounded-xl bg-[#a08a2a] px-4 text-white disabled:opacity-50"><Send className="h-4 w-4" /></button>
        </div>
      </form>
    </div>
  );
}
