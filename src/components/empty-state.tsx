import type { ReactNode } from "react";
import { Inbox } from "lucide-react";

export function EmptyState({
  icon,
  title = "Belum ada data",
  desc = "Data akan muncul di sini setelah tersedia.",
  action,
  compact,
}: {
  icon?: ReactNode;
  title?: string;
  desc?: string;
  action?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center ${
        compact ? "py-8" : "py-16"
      }`}
    >
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        {icon ?? <Inbox className="h-5 w-5" />}
      </div>
      <div className="text-sm font-medium text-foreground">{title}</div>
      <div className="mt-1 max-w-sm text-xs text-muted-foreground">{desc}</div>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
