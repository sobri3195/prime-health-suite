import { createMiddleware } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Middleware wrappers that enforce role-based access on finance endpoints.
// Both chain after requireSupabaseAuth and then check via the authenticated
// (RLS-scoped) Supabase client, so the check itself cannot be bypassed by
// forging the userId. Handlers that then use supabaseAdmin still respect
// these role gates.

export const requireFinView = createMiddleware({ type: "function" })
  .middleware([requireSupabaseAuth])
  .server(async ({ next, context }) => {
    const { data, error } = await context.supabase.rpc("fin_can_view", {
      _uid: context.userId,
    });
    if (error) throw new Error(`Forbidden: ${error.message}`);
    if (!data) throw new Error("Forbidden: finance view access required");
    return next();
  });

export const requireFinEdit = createMiddleware({ type: "function" })
  .middleware([requireSupabaseAuth])
  .server(async ({ next, context }) => {
    const { data, error } = await context.supabase.rpc("fin_can_edit", {
      _uid: context.userId,
    });
    if (error) throw new Error(`Forbidden: ${error.message}`);
    if (!data) throw new Error("Forbidden: finance edit access required");
    return next();
  });
