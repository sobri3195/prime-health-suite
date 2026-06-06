import type { Role } from "@/lib/auth";

export type SystemStatus = "online" | "offline" | "degraded";

export type AppLauncherItem = {
  id: string;
  name: string;
  description: string;
  to: string;
  icon: "stethoscope" | "wallet" | "file-text" | "life-buoy" | "plug" | "users" | "scroll-text";
  category: "Klinis" | "Finance" | "Internal" | "Knowledge";
};

export type NotificationCategory =
  | "system"
  | "approval"
  | "sync"
  | "claim"
  | "schedule"
  | "patient";

export type NotificationStatus = "unread" | "read" | "archived";

export type AppNotification = {
  id: string;
  ts: string;
  title: string;
  body: string;
  category: NotificationCategory;
  status: NotificationStatus;
  severity: "info" | "warning" | "critical";
};

export type TicketStatus = "open" | "in_progress" | "resolved" | "closed";
export type TicketPriority = "low" | "medium" | "high" | "critical";
export type TicketCategory =
  | "login"
  | "data"
  | "finance"
  | "klinik"
  | "laporan"
  | "bug"
  | "request";

export type TicketActivity = { ts: string; actor: string; message: string };

export type HelpdeskTicket = {
  id: string;
  subject: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: TicketCategory;
  reporter: string;
  pic: string;
  createdAt: string;
  updatedAt: string;
  timeline: TicketActivity[];
};

export type DocumentCategory =
  | "SOP Klinik"
  | "SOP Finance"
  | "Panduan Aplikasi"
  | "Formulir"
  | "Kebijakan";

export type DocumentStatus = "draft" | "active" | "archived";

export type AppDocument = {
  id: string;
  title: string;
  category: DocumentCategory;
  version: string;
  status: DocumentStatus;
  owner: string;
  updatedAt: string;
};

export type UserStatus = "active" | "inactive";

export type AppUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: UserStatus;
  lastLogin: string;
  systems: ("apps" | "sim-klinik" | "finance")[];
};

export type SystemHealth = {
  id: "apps" | "sim-klinik" | "finance" | "integration";
  name: string;
  status: SystemStatus;
  latencyMs: number;
};
