import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Demo role auto-seeding has been REMOVED from the runtime auth path.
// Previously, first-time signers using hardcoded "demo-*@prime.id" emails
// were auto-granted super_admin/manajemen/kasir roles when NODE_ENV !== 'production'
// or LOVABLE_ENV === 'preview'. Public "preview" deployments meant anyone could
// register with a known email and escalate to super_admin. Demo data must now
// be seeded via a one-time migration/script, never through a runtime code path
// reachable in a publicly deployed environment.

type DbRole =
  | "super_admin" | "admin_klinik" | "dokter" | "perawat" | "perawat_optometri"
  | "pendaftaran" | "kasir" | "farmasi" | "manajemen" | "pasien";
void ({} as DbRole);

// Map DB roles → TS Role values used by useAuth(). Anything not in this map
// is dropped (e.g. 'pasien').
const DB_TO_TS: Record<string, string[]> = {
  super_admin: ["super_admin", "admin_klinik", "finance_manager", "accounting"],
  admin_klinik: ["admin_klinik"],
  dokter: ["dokter"],
  perawat: ["perawat"],
  perawat_optometri: ["perawat"],
  pendaftaran: ["front_office"],
  kasir: ["kasir"],
  farmasi: ["kasir"],
  manajemen: ["owner"],
};

export const getMyRoles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("current_user_roles");
    if (error) throw error;
    const dbRoles = ((data as string[] | null) ?? []).filter(Boolean);
    const email = (context.claims as { email?: string } | null)?.email ?? null;
    const roles = Array.from(
      new Set(dbRoles.flatMap((r) => DB_TO_TS[r] ?? [])),
    );
    return { roles, dbRoles, email };
  });

