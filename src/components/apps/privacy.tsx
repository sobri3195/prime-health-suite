import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Download, ShieldCheck, Trash2, History, AlertTriangle, ExternalLink } from "lucide-react";
import { Link } from "@tanstack/react-router";
import {
  listMyAuditLog, exportMyData, requestAccountDeletion, acceptConsent,
} from "@/lib/apps-privacy.functions";
import { getMyProfile } from "@/lib/apps-patient.functions";
import { useI18n } from "@/lib/i18n";

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-[#e9dfb8] bg-white p-5 shadow-sm ${className}`}>{children}</div>;
}

export function PatientPrivasi() {
  const { t, lang } = useI18n();
  const locale = lang === "id" ? "id-ID" : "en-US";
  const callAudit = useServerFn(listMyAuditLog);
  const callExport = useServerFn(exportMyData);
  const callDelete = useServerFn(requestAccountDeletion);
  const callConsent = useServerFn(acceptConsent);
  const callProfile = useServerFn(getMyProfile);

  const profileQ = useQuery({ queryKey: ["apps", "profile"], queryFn: () => callProfile() });
  const auditQ = useQuery({ queryKey: ["apps", "audit", "me"], queryFn: () => callAudit() });

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [marketing, setMarketing] = useState(false);

  const p = profileQ.data?.profile;
  const consentAt = p?.consent_privacy_at as string | null | undefined;

  const actionLabel = (a: string) => {
    const k = `priv.action.${a}`;
    const v = t(k);
    return v === k ? a : v;
  };

  const exportM = useMutation({
    mutationFn: () => callExport(),
    onSuccess: ({ data }) => {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `data-saya-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(t("priv.export.ok"));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteM = useMutation({
    mutationFn: () => callDelete(),
    onSuccess: () => {
      toast.success(t("priv.del.ok"));
      setConfirmDelete(false);
      profileQ.refetch();
      auditQ.refetch();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const consentM = useMutation({
    mutationFn: () => callConsent({ data: { marketing } }),
    onSuccess: () => {
      toast.success(t("priv.consent.saved"));
      profileQ.refetch();
      auditQ.refetch();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold">{t("priv.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("priv.subtitle")}</p>
      </div>

      <Card>
        <div className="flex items-start gap-3">
          <ShieldCheck className="h-5 w-5 shrink-0 text-[#6b5a16]" aria-hidden />
          <div className="flex-1">
            <div className="text-base font-bold text-[#3a2a05]">{t("priv.consent.title")}</div>
            {consentAt ? (
              <p className="mt-1 text-sm text-[#5a4a14]">
                {t("priv.consent.accepted_at", { at: new Date(consentAt).toLocaleString(locale) })}{" "}
                <Link to="/privacy" className="underline">{t("priv.consent.read")}</Link>
              </p>
            ) : (
              <>
                <p className="mt-1 text-sm text-[#5a4a14]">
                  {t("priv.consent.none")}{" "}
                  <Link to="/privacy" className="underline inline-flex items-center gap-1">
                    {t("priv.consent.read")} <ExternalLink className="h-3 w-3" />
                  </Link>
                </p>
                <label className="mt-3 flex items-start gap-2 text-sm text-[#3a2a05]">
                  <input type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} className="mt-0.5" />
                  {t("priv.consent.marketing")}
                </label>
                <button
                  onClick={() => consentM.mutate()}
                  disabled={consentM.isPending}
                  className="mt-3 rounded-xl bg-[#a08a2a] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {t("priv.consent.agree")}
                </button>
              </>
            )}
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex items-start gap-3">
          <Download className="h-5 w-5 shrink-0 text-[#6b5a16]" aria-hidden />
          <div className="flex-1">
            <div className="text-base font-bold text-[#3a2a05]">{t("priv.export.title")}</div>
            <p className="mt-1 text-sm text-[#5a4a14]">{t("priv.export.desc")}</p>
            <button
              onClick={() => exportM.mutate()}
              disabled={exportM.isPending}
              className="mt-3 rounded-xl bg-[#a08a2a] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {exportM.isPending ? t("priv.export.preparing") : t("priv.export.btn")}
            </button>
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-[#6b5a16]" aria-hidden />
          <div className="text-base font-bold text-[#3a2a05]">{t("priv.audit.title")}</div>
        </div>
        <p className="mt-1 text-sm text-[#5a4a14]">{t("priv.audit.desc")}</p>
        <div className="mt-3 divide-y divide-[#f0e8c4]">
          {auditQ.isLoading && <div className="py-6 text-center text-sm text-[#5a4a14]">{t("common.loading")}</div>}
          {auditQ.data && auditQ.data.items.length === 0 && (
            <div className="py-6 text-center text-sm text-[#5a4a14]">{t("priv.audit.empty")}</div>
          )}
          {auditQ.data?.items.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
              <div className="min-w-0">
                <div className="font-medium text-[#3a2a05]">{actionLabel(r.action)}</div>
                <div className="truncate text-xs text-[#6b5a16]">
                  {r.resource} · {t("priv.audit.by")} {r.actor_label || "—"}
                </div>
              </div>
              <div className="shrink-0 text-xs text-[#6b5a16]">
                {new Date(r.created_at).toLocaleString(locale)}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="border-rose-200">
        <div className="flex items-start gap-3">
          <Trash2 className="h-5 w-5 shrink-0 text-rose-600" aria-hidden />
          <div className="flex-1">
            <div className="text-base font-bold text-rose-700">{t("priv.del.title")}</div>
            <p className="mt-1 text-sm text-[#5a4a14]">{t("priv.del.desc")}</p>
            {p?.deletion_requested_at ? (
              <div className="mt-3 inline-flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                <AlertTriangle className="h-4 w-4" aria-hidden />
                {t("priv.del.requested_at", { at: new Date(p.deletion_requested_at).toLocaleString(locale) })}
              </div>
            ) : !confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                className="mt-3 rounded-xl border border-rose-300 bg-white px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50"
              >
                {t("priv.del.btn")}
              </button>
            ) : (
              <div className="mt-3 space-y-2">
                <div className="text-sm font-medium text-rose-700">{t("priv.del.confirm")}</div>
                <div className="flex gap-2">
                  <button
                    onClick={() => deleteM.mutate()}
                    disabled={deleteM.isPending}
                    className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {t("priv.del.yes")}
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="rounded-xl border border-[#e9dfb8] bg-white px-4 py-2 text-sm font-medium text-[#3a2a05]"
                  >
                    {t("common.cancel")}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
