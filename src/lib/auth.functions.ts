import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Demo bootstrap: when the shared demo user signs in for the first time and
// has no roles yet, grant baseline operational roles so SIM / Finance work
// without manual seeding. Non-demo users get only their real roles.
const DEMO_EMAIL = "demo@prime.id";
const DEMO_ROLES = ["front_office", "kasir", "accounting"] as const;

export const getMyRoles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("current_user_roles");
    if (error) throw error;
    let roles = ((data as string[] | null) ?? []).filter(Boolean);

    const email = (context.claims as { email?: string } | null)?.email ?? null;
    if (roles.length === 0 && email === DEMO_EMAIL) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin
        .from("user_roles")
        .upsert(
          DEMO_ROLES.map((role) => ({ user_id: context.userId, role })),
          { onConflict: "user_id,role" },
        );
      roles = [...DEMO_ROLES];
    }
    return { roles, email };
  });
