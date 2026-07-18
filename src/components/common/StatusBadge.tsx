import { cn } from "@/lib/utils";
import { STATUS_COLORS, STATUS_DOT_COLORS } from "@/lib/constants";
import { statusLabel } from "@/lib/status";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const colorClass = STATUS_COLORS[status] ?? "bg-gray-100 text-gray-700 border-gray-200";
  const dotClass = STATUS_DOT_COLORS[status] ?? "bg-gray-400";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-0.5 text-xs font-semibold",
        colorClass,
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", dotClass)} />
      {statusLabel(status)}
    </span>
  );
}
