// Public demo identity, already provisioned with the kasir role. Never use a
// privileged/admin identity here or create users/roles from a login handler.
export const DEMO_ACCOUNT = {
  email: "demo-kasir@prime.id",
  password: "demo1234",
} as const;

export function isDemoLoginEnabled(development: boolean, setting?: string): boolean {
  if (setting !== undefined) return setting === "true";
  return development;
}

// Production demo controls are an explicit opt-in for demonstration deployments.
// This is a UI setting; database authorization remains enforced by Supabase.
export const DEMO_LOGIN_ENABLED = isDemoLoginEnabled(
  import.meta.env.DEV,
  import.meta.env.VITE_ENABLE_DEMO_LOGIN,
);
