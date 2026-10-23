import { supabase } from "@/integrations/supabase/client";
import type { System } from "./auth";
import { getOAuthCallbackUrl, usesLovableOAuth } from "./oauth-redirect";

export async function signInWithGoogle(system: System, redirect?: string) {
  const redirectTo = getOAuthCallbackUrl(window.location.origin, system, redirect);

  // The /~oauth broker belongs to Lovable hosting; Vercel does not serve it.
  if (usesLovableOAuth(window.location.hostname)) {
    const { lovable } = await import("@/integrations/lovable");
    return lovable.auth.signInWithOAuth("google", { redirect_uri: redirectTo });
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo },
  });
  if (error) return { error };
  if (!data.url) return { error: new Error("Google sign-in URL is unavailable") };
  return { error: null, redirected: true };
}
