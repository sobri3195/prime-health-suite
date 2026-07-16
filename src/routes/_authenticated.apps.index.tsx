import { createFileRoute } from "@tanstack/react-router";
import { PatientBeranda } from "@/components/apps/patient";
import { pageHead } from "@/lib/page-head";

export const Route = createFileRoute("/_authenticated/apps/")({
  head: () => pageHead({ title: "Beranda Pasien — Apps", description: "Dasbor pasien: booking, resep, notifikasi, dan edukasi.", path: "/apps" }),
  component: PatientBeranda,
});
