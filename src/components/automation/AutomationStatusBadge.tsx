/**
 * AutomationStatusBadge
 *
 * Displays the latest run status for a given automation event_type
 * within an episode. Used inline next to section headers in the workspace.
 */
import { CheckCircle2, XCircle, SkipForward, Loader2 } from "lucide-react";
import { useLatestAutomationLog } from "@/hooks/useAutomationLogs";
import type { AutomationEventType } from "@/services/automation/logAutomation";
import { cn } from "@/lib/utils";

interface Props {
  episodeId: string | undefined;
  eventType: AutomationEventType;
  className?: string;
}

const STATUS_CONFIG = {
  success: {
    icon: CheckCircle2,
    label: "OK",
    className: "text-emerald-500",
  },
  error: {
    icon: XCircle,
    label: "Error",
    className: "text-destructive",
  },
  skipped: {
    icon: SkipForward,
    label: "Skip",
    className: "text-muted-foreground",
  },
  started: {
    icon: Loader2,
    label: "...",
    className: "text-primary animate-spin",
  },
} as const;

export function AutomationStatusBadge({ episodeId, eventType, className }: Props) {
  const { data: log, isLoading } = useLatestAutomationLog(episodeId, eventType);

  if (isLoading || !log) return null;

  const status = (log.status ?? "error") as keyof typeof STATUS_CONFIG;
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.error;
  const Icon = config.icon;

  const title = log.result_summary
    ? `${config.label}: ${log.result_summary}`
    : log.error_message
    ? `Error: ${log.error_message}`
    : log.skip_reason
    ? `Saltado: ${log.skip_reason}`
    : config.label;

  return (
    <span
      title={title}
      className={cn("inline-flex items-center gap-0.5 text-xs font-medium", config.className, className)}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
}
