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

// Privileged operations (revert audit, master data destructive ops).
// Restricted to super_admin / admin_klinik / manajemen — never kasir/dokter/perawat.
export const requireFinAdmin = createMiddleware({ type: "function" })
  .middleware([requireSupabaseAuth])
  .server(async ({ next, context }) => {
    const roles: Array<"super_admin" | "admin_klinik" | "manajemen"> = [
      "super_admin", "admin_klinik", "manajemen",
    ];
    for (const r of roles) {
      const { data, error } = await context.supabase.rpc("has_role", {
        _user_id: context.userId, _role: r,
      });
      if (error) throw new Error(`Forbidden: ${error.message}`);
      if (data) return next();
    }
    throw new Error("Forbidden: finance admin access required");
  });
