import { cn } from "@/lib/utils";
import type { PieceStatus, VisualStatus } from "@/lib/visual-os/types";
import { STATUS_LABELS, VISUAL_STATUS_LABELS } from "@/lib/visual-os/types";
import { STATUS_COLORS, VISUAL_STATUS_COLORS } from "@/lib/visual-os/palette";

interface PieceStatusBadgeProps {
  status: PieceStatus;
  className?: string;
}

export function PieceStatusBadge({ status, className }: PieceStatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium tracking-wide uppercase",
        STATUS_COLORS[status] ?? "bg-zinc-500/20 text-zinc-400",
        className,
      )}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

interface VisualStatusBadgeProps {
  status: VisualStatus | null | undefined;
  className?: string;
}

export function VisualStatusBadge({ status, className }: VisualStatusBadgeProps) {
  const s = status ?? "sin_iniciar";
  return (
    <span className={cn("text-xs font-medium", VISUAL_STATUS_COLORS[s], className)}>
      {VISUAL_STATUS_LABELS[s]}
    </span>
  );
}
