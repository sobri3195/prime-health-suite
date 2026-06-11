// Fire-and-forget clinic audit helper. Safe to call from any client component.
import { appendAudit } from "./clinic.functions";
import { supabase } from "@/integrations/supabase/client";

export function clinicAudit(module: string, action: string, target?: string, meta?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  void (async () => {
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session) return;
      await appendAudit({ data: { module, action, target, meta } });
    } catch {/* ignore */}
  })();
}
