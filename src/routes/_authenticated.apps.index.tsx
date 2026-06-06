import { createFileRoute } from "@tanstack/react-router";
import { PatientBeranda } from "@/components/apps/patient";

export const Route = createFileRoute("/_authenticated/apps/")({
  component: PatientBeranda,
});
