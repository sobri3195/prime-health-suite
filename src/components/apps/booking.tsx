import { friendlyError } from "@/lib/apps-error";
import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowLeft, Calendar, Check, Loader2, Stethoscope } from "lucide-react";
import {
  listDoctorsForBooking, listAvailableSlots, createBooking,
} from "@/lib/apps-patient.functions";
import { useI18n } from "@/lib/i18n";

type Doctor = { id: string; code: string | null; name: string; spesialisasi: string | null };

function dateLabel(d: Date, lang: string) {
  // Format in UTC because next7 dates carry WIB-shifted UTC values.
  return d.toLocaleDateString(lang === "id" ? "id-ID" : "en-US", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
}
function dateISO(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function BookingFlow() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { t, lang } = useI18n();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [dokter, setDokter] = useState<Doctor | null>(null);
  const [tanggal, setTanggal] = useState<string>("");
  const [jam, setJam] = useState<string>("");
  const [keluhan, setKeluhan] = useState("");

  const listDoctors = useServerFn(listDoctorsForBooking);
  const listSlots = useServerFn(listAvailableSlots);
  const submitBooking = useServerFn(createBooking);

  const doctorsQ = useQuery({
    queryKey: ["apps", "doctors"],
    queryFn: () => listDoctors(),
  });

  const slotsQ = useQuery({
    queryKey: ["apps", "slots", dokter?.id, tanggal],
    queryFn: () => listSlots({ data: { dokter_id: dokter!.id, tanggal } }),
    enabled: !!dokter && !!tanggal,
  });

  const mutation = useMutation({
    mutationFn: () =>
      submitBooking({
        data: {
          dokter_id: dokter!.id,
          dokter_nama: dokter!.name,
          tanggal,
          jam_slot: jam,
          keluhan: keluhan.trim() || undefined,
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["apps", "bookings"] });
      qc.invalidateQueries({ queryKey: ["apps", "queue"] });
      toast.success(t("booking.success"));
      navigate({ to: "/apps", replace: true });
    },
    onError: (e: Error) => toast.error(friendlyError(e)),
  });

  // Anchor to WIB (UTC+7) so users outside WIB see the same day-list as the
  // server cutoff (see createBooking). Prevents off-by-one when browser tz != Asia/Jakarta.
  const next7 = Array.from({ length: 7 }, (_, i) => {
    const wibNow = new Date(Date.now() + 7 * 3600 * 1000);
    wibNow.setUTCDate(wibNow.getUTCDate() + i);
    return wibNow;
  });

  const stepTitle = step === 1 ? t("booking.step1") : step === 2 ? t("booking.step2") : step === 3 ? t("booking.step3") : t("booking.step4");

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center gap-2">
        <button
          onClick={() => (step === 1 ? navigate({ to: "/apps" }) : setStep((s) => (s - 1) as 1 | 2 | 3 | 4))}
          className="rounded-full border border-[#e9dfb8] bg-white p-2 text-[#5a4a14]"
          aria-label={t("booking.back")}
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <div className="text-[11px] font-bold tracking-widest text-[#6b5a16]">{t("booking.step", { n: step })}</div>
          <h1 className="text-xl font-bold">{stepTitle}</h1>
        </div>
      </div>

      {step === 1 && (
        <div className="space-y-3">
          {doctorsQ.isLoading && <div className="rounded-2xl border border-[#e9dfb8] bg-white p-6 text-center text-sm opacity-70"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></div>}
          {doctorsQ.data?.doctors.length === 0 && (
            <div className="rounded-2xl border border-[#e9dfb8] bg-white p-6 text-center text-sm opacity-70">
              {t("booking.no_doctors")}
            </div>
          )}
          {doctorsQ.data?.doctors.map((d) => (
            <button
              key={d.id}
              onClick={() => { setDokter(d); setStep(2); }}
              className="flex w-full items-center gap-3 rounded-2xl border border-[#e9dfb8] bg-white p-4 text-left transition hover:bg-[#fdf8e8]"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#fdf2c4]">
                <Stethoscope className="h-5 w-5 text-[#6b5a16]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold">{d.name}</div>
                <div className="text-xs opacity-70 truncate">{d.spesialisasi || t("booking.doctor_default")}</div>
              </div>
              <div className="text-xs text-[#6b5a16]">{t("booking.pick")}</div>
            </button>
          ))}
        </div>
      )}

      {step === 2 && dokter && (
        <div>
          <div className="rounded-xl bg-[#fdf2c4] p-3 text-sm">
            <span className="opacity-70">{t("booking.doctor")}: </span><b>{dokter.name}</b>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {next7.map((d) => {
              const iso = dateISO(d);
              const active = iso === tanggal;
              return (
                <button
                  key={iso}
                  onClick={() => { setTanggal(iso); setStep(3); }}
                  className={`rounded-2xl border p-3 text-left ${active ? "border-[#a08a2a] bg-[#a08a2a] text-white" : "border-[#e9dfb8] bg-white"}`}
                >
                  <Calendar className={`mb-1 h-4 w-4 ${active ? "text-white" : "text-[#6b5a16]"}`} />
                  <div className="text-sm font-semibold">{dateLabel(d, lang)}</div>
                  <div className={`text-[11px] ${active ? "opacity-90" : "opacity-60"}`}>{iso}</div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {step === 3 && dokter && tanggal && (
        <div>
          <div className="rounded-xl bg-[#fdf2c4] p-3 text-sm">
            <span className="opacity-70">{t("booking.doctor")}: </span><b>{dokter.name}</b> · <span className="opacity-70">{t("booking.date")}: </span><b>{tanggal}</b>
          </div>
          {slotsQ.isLoading && <div className="mt-4 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin opacity-50" /></div>}
          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {slotsQ.data?.slots.map((s) => (
              <button
                key={s.jam}
                disabled={!s.available}
                onClick={() => { setJam(s.jam); setStep(4); }}
                className={`rounded-xl border p-3 text-sm font-semibold ${
                  !s.available
                    ? "cursor-not-allowed border-[#e9dfb8] bg-[#f5ead0] text-[#b8a05a] line-through opacity-60"
                    : "border-[#e9dfb8] bg-white text-[#5a4a14] hover:bg-[#fdf8e8]"
                }`}
              >
                {s.jam}
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs opacity-60">{t("booking.slot_note")}</p>
        </div>
      )}

      {step === 4 && dokter && tanggal && jam && (
        <div className="space-y-3">
          <div className="rounded-2xl border border-[#e9dfb8] bg-white p-4">
            <div className="text-sm font-semibold">{t("booking.summary")}</div>
            <ul className="mt-2 space-y-1 text-sm">
              <li><span className="opacity-60">{t("booking.doctor")}: </span><b>{dokter.name}</b></li>
              <li><span className="opacity-60">{t("booking.date")}: </span><b>{tanggal}</b></li>
              <li><span className="opacity-60">{t("booking.time")}: </span><b>{jam}</b></li>
            </ul>
          </div>
          <div className="rounded-2xl border border-[#e9dfb8] bg-white p-4">
            <label className="text-sm font-semibold">{t("booking.complaint")}</label>
            <textarea
              value={keluhan}
              maxLength={500}
              onChange={(e) => setKeluhan(e.target.value)}
              rows={3}
              placeholder={t("booking.complaint_ph")}
              className="mt-2 w-full rounded-xl border border-[#e9dfb8] bg-[#fdf8e8] p-3 text-sm outline-none"
            />
          </div>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#a08a2a] py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <>{t("booking.confirm")} <Check className="h-4 w-4" /></>}
          </button>
        </div>
      )}
    </div>
  );
}

