import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Send, MessageCircle } from "lucide-react";
import { getOrCreateRoom, listChatMessages, sendChatMessage } from "@/lib/apps-chat.functions";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { SkeletonList, EmptyState } from "@/components/apps/ui";

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
  const bottomRef = useRef<HTMLDivElement>(null);

  const sendM = useMutation({
    mutationFn: () => callSend({ data: { room_id: room!.id, body } }),
    onSuccess: () => { setBody(""); qc.invalidateQueries({ queryKey: ["apps", "chat-msgs", room!.id] }); },
    onError: (e: Error) => toast.error(e.message),
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
                  <div className="whitespace-pre-wrap">{m.body}</div>
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
      <form onSubmit={(e) => { e.preventDefault(); if (body.trim()) sendM.mutate(); }}
        className="flex gap-2 rounded-b-2xl border border-t-0 border-[#e9dfb8] bg-white p-3">
        <input value={body} onChange={(e) => setBody(e.target.value)} placeholder={t("chat.placeholder")}
          aria-label={t("chat.placeholder")}
          className="flex-1 rounded-xl border border-[#e9dfb8] bg-[#fdf8e8] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#a08a2a]" />
        <button disabled={!body.trim() || sendM.isPending} type="submit"
          aria-label="send"
          className="rounded-xl bg-[#a08a2a] px-4 text-white disabled:opacity-50"><Send className="h-4 w-4" /></button>
      </form>
    </div>
  );
}
