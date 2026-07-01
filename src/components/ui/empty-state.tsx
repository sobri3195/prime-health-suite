import { Inbox, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = {
  icon?: LucideIcon;
  title?: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  /** When rendered inside a <table>, set the colSpan so it fills the row. */
  inTableColSpan?: number;
};

export function EmptyState({
  icon: Icon = Inbox,
  title = "Belum ada data",
  description,
  action,
  className,
  inTableColSpan,
}: Props) {
  const body = (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 py-10 text-center",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <div className="text-sm font-medium text-foreground">{title}</div>
      {description && (
        <p className="max-w-sm text-xs text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );

  if (inTableColSpan) {
    return (
      <tr>
        <td colSpan={inTableColSpan} className="p-0">
          {body}
        </td>
      </tr>
    );
  }
  return body;
}
