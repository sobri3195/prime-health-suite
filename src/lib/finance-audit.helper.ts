// Server-side helper used INSIDE other server function handlers.
// Not a server function itself.
export async function writeFinAudit(opts: {
  actor_id?: string | null;
  actor_email?: string | null;
  action: string;
  entity: string;
  entity_id?: string | null;
  entity_no?: string | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  reason?: string | null;
}) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const changed: string[] = [];
    if (opts.before && opts.after) {
      const keys = new Set([...Object.keys(opts.before), ...Object.keys(opts.after)]);
      for (const k of keys) {
        const a = (opts.before as any)[k];
        const b = (opts.after as any)[k];
        if (JSON.stringify(a) !== JSON.stringify(b)) changed.push(k);
      }
    }
    await (supabaseAdmin as any).from("fin_audit_log").insert({
      actor_id: opts.actor_id ?? null,
      actor_email: opts.actor_email ?? null,
      action: opts.action,
      entity: opts.entity,
      entity_id: opts.entity_id ?? null,
      entity_no: opts.entity_no ?? null,
      before: opts.before ?? null,
      after: opts.after ?? null,
      changed_fields: changed.length ? changed : null,
      reason: opts.reason ?? null,
    });
  } catch {/* swallow */}
}
