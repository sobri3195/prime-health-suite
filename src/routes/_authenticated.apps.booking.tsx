import { createFileRoute } from "@tanstack/react-router";
import { BookingFlow } from "@/components/apps/booking";
import { pageHead } from "@/lib/page-head";

export const Route = createFileRoute("/_authenticated/apps/booking")({
  head: () => pageHead({ title: "Booking Janji Temu — Apps", description: "Reservasi jadwal konsultasi dan pemeriksaan klinik.", path: "/apps/booking" }),
  component: BookingFlow,
});
