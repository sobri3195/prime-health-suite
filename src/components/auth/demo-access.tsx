import { DEMO_ACCOUNT, DEMO_LOGIN_ENABLED } from "@/lib/demo-account";
import { useI18n } from "@/lib/i18n";

export function DemoAccountDetails({ className = "" }: { className?: string }) {
  const { t } = useI18n();
  if (!DEMO_LOGIN_ENABLED) return null;

  return (
    <div className={`space-y-1 rounded-md border px-3 py-2 text-xs ${className}`}>
      <p>{t("auth.demo.description")}</p>
      <p>
        <span>{t("auth.demo.email")}: </span>
        <code>{DEMO_ACCOUNT.email}</code>
      </p>
      <p>
        <span>{t("auth.demo.password")}: </span>
        <code>{DEMO_ACCOUNT.password}</code>
      </p>
      <p className="opacity-70">{t("auth.demo.scope")}</p>
    </div>
  );
}

export function DemoAccess({ onSignIn, loading }: { onSignIn: () => void; loading: boolean }) {
  const { t } = useI18n();
  if (!DEMO_LOGIN_ENABLED) return null;

  return (
    <div className="mt-3 space-y-2">
      <button
        type="button"
        onClick={onSignIn}
        disabled={loading}
        aria-busy={loading}
        className="inline-flex w-full items-center justify-center rounded-md border border-dashed border-amber-500/60 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-60"
      >
        {t("auth.demo.button")}
      </button>
      <DemoAccountDetails />
    </div>
  );
}
