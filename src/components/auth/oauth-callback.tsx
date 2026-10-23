import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Loader2, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { System } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { getOAuthCallbackUrl, getOAuthError, getSafeSignInRedirect } from "@/lib/oauth-redirect";

export function OAuthCallback({ system, redirect }: { system: System; redirect?: string }) {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const destination = getSafeSignInRedirect(system, redirect);

  useEffect(() => {
    let active = true;

    function fail(key: string) {
      if (!active) return;
      // Remove provider details or unusable credentials from the address bar.
      window.history.replaceState(
        window.history.state,
        "",
        getOAuthCallbackUrl(window.location.origin, system, destination),
      );
      setErrorKey(key);
    }

    async function completeSignIn() {
      const providerError = getOAuthError(new URL(window.location.href));
      if (providerError) {
        fail(providerError);
        return;
      }

      try {
        // The SDK consumes callback tokens before getUser completes. Verify the
        // resulting user; application role checks still run in the normal gate.
        const { data, error } = await supabase.auth.getUser();
        if (error) throw error;
        if (!data.user) {
          fail("auth.oauth.noSession");
          return;
        }
        if (active) await navigate({ to: destination, replace: true });
      } catch {
        fail("auth.oauth.failed");
      }
    }

    void completeSignIn();
    return () => {
      active = false;
    };
  }, [system, destination, navigate]);

  return (
    <main className="grid min-h-dvh place-items-center bg-background px-6 text-foreground">
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        {errorKey ? (
          <>
            <ShieldAlert className="h-8 w-8 text-destructive" aria-hidden />
            <p role="alert">{t(errorKey)}</p>
            <Link
              to={`/${system}/login`}
              search={{ redirect: destination }}
              className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
            >
              {t("auth.oauth.retry")}
            </Link>
          </>
        ) : (
          <div role="status" className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
            <p>{t("auth.oauth.loading")}</p>
          </div>
        )}
      </div>
    </main>
  );
}
