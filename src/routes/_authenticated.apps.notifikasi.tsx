import { createFileRoute } from "@tanstack/react-router";
import { NotificationsPagePatient } from "@/components/apps/notif-panel";

export const Route = createFileRoute("/_authenticated/apps/notifikasi")({
  component: NotificationsPagePatient,
  head: () => ({ meta: [{ title: "Notifikasi — Prime Apps" }] }),
});
