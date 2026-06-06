// Fire-and-forget clinic audit helper. Safe to call from any client component.
import { appendAudit } from "./clinic.functions";

export function clinicAudit(module: string, action: string, target?: string, meta?: Record<string, unknown>) {
  void (async () => {
    try {
      await appendAudit({ data: { module, action, target, meta } });
    } catch {/* ignore (not signed in / offline) */}
  })();
}
