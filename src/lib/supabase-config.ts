type RuntimeEnvironment = Readonly<Record<string, string | undefined>>;
type PublicBuildConfig = { url?: string; publishableKey?: string };

// Only public project configuration may fall back to Vite build-time values.
// Service-role credentials must always come from the server runtime.
export function resolveSupabaseUrl(runtime: RuntimeEnvironment, buildUrl?: string) {
  return runtime.SUPABASE_URL || runtime.VITE_SUPABASE_URL || buildUrl;
}

export function resolveSupabasePublicConfig(
  runtime: RuntimeEnvironment,
  build: PublicBuildConfig = {},
) {
  const url = resolveSupabaseUrl(runtime, build.url);
  const publishableKey =
    runtime.SUPABASE_PUBLISHABLE_KEY ||
    runtime.VITE_SUPABASE_PUBLISHABLE_KEY ||
    build.publishableKey;

  if (!url || !publishableKey) {
    const missing = [
      ...(!url ? ["SUPABASE_URL (or VITE_SUPABASE_URL)"] : []),
      ...(!publishableKey ? ["SUPABASE_PUBLISHABLE_KEY (or VITE_SUPABASE_PUBLISHABLE_KEY)"] : []),
    ];
    throw new Error(
      `Missing Supabase environment variable(s): ${missing.join(", ")}. Configure the deployment environment.`,
    );
  }
  return { url, publishableKey };
}
