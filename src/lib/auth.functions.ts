import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Demo bootstrap: when the shared demo user signs in for the first time and
// has no roles yet, grant baseline operational roles so SIM / Finance work
// without manual seeding. Non-demo users get only their real roles.
const DEMO_EMAIL = "demo@prime.id";
const DEMO_DB_ROLES = ["super_admin", "kasir", "pendaftaran"] as const;

// Role-scoped demo accounts (one-click login per persona).
// Each maps to DB roles that, after DB_TO_TS mapping below, give the right
// access on SIM Klinik / Finance.
const DEMO_ROLE_MAP: Record<string, readonly string[]> = {
  "demo-kasir@prime.id": ["kasir"],
  "demo-dokter@prime.id": ["dokter"],
  "demo-manajemen@prime.id": ["manajemen", "super_admin"],
};

type DbRole =
  | "super_admin" | "admin_klinik" | "dokter" | "perawat" | "perawat_optometri"
  | "pendaftaran" | "kasir" | "farmasi" | "manajemen" | "pasien";

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
    let dbRoles = ((data as string[] | null) ?? []).filter(Boolean);

    const email = (context.claims as { email?: string } | null)?.email ?? null;
    if (dbRoles.length === 0 && email === DEMO_EMAIL) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin
        .from("user_roles")
        .upsert(
          DEMO_DB_ROLES.map((role) => ({ user_id: context.userId, role: role as DbRole })),
          { onConflict: "user_id,role" },
        );
      dbRoles = [...DEMO_DB_ROLES];
    }

    const roles = Array.from(
      new Set(dbRoles.flatMap((r) => DB_TO_TS[r] ?? [])),
    );
    return { roles, dbRoles, email };
  });
