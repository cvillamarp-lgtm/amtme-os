/**
 * AutomationLogPanel
 *
 * Shows recent automation runs for an episode with:
 *   - Status badges per run
 *   - Retry button for error/skipped runs
 *   - Expandable rows with metadata and error details
 *   - Duration indicator
 */
import { useState } from "react";
import {
  CheckCircle2,
  XCircle,
  SkipForward,
  Loader2,
  ChevronDown,
  ChevronRight,
  RotateCcw,
  Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { useAutomationLogs, type AutomationLogRow } from "@/hooks/useAutomationLogs";
import { retryAutomation } from "@/services/automation/retryAutomation";
import { useQueryClient } from "@tanstack/react-query";
import type { Tables } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";

interface Props {
  episodeId: string;
}

const EVENT_LABELS: Record<string, string> = {
  script_saved: "Guión",
  asset_approved: "Asset aprobado",
  publication_state_changed: "Publicación",
  episode_completion: "Completitud",
};

const STATUS_ICON: Record<string, React.ElementType> = {
  success: CheckCircle2,
  error: XCircle,
  skipped: SkipForward,
  started: Loader2,
};

const STATUS_COLOR: Record<string, string> = {
  success: "text-emerald-500",
  error: "text-destructive",
  skipped: "text-muted-foreground",
  started: "text-primary",
};

function formatDuration(ms: number | null): string {
  if (ms == null) return "";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatTime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function LogRow({ log, episodeId }: { log: AutomationLogRow; episodeId: string }) {
  const [expanded, setExpanded] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const qc = useQueryClient();

  const status = log.status ?? "error";
  const Icon = STATUS_ICON[status] ?? XCircle;
  const colorClass = STATUS_COLOR[status] ?? "text-muted-foreground";
  const canRetry = status === "error" || status === "skipped";

  const handleRetry = async () => {
    setRetrying(true);
    try {
      const result = await retryAutomation(log as unknown as Tables<"automation_logs">);
      if (result.ok) {
        toast.success("Retry iniciado");
        qc.invalidateQueries({ queryKey: ["automation-logs", episodeId] });
        qc.invalidateQueries({ queryKey: ["automation-log-latest", episodeId] });
      } else {
        toast.error(`Retry fallido: ${result.error}`);
      }
    } finally {
      setRetrying(false);
    }
  };

  return (
    <div className="border-b border-border/50 last:border-0">
      <div
        className="flex items-center gap-2 px-3 py-2 hover:bg-secondary/30 cursor-pointer transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        {/* Status icon */}
        <Icon
          className={cn(
            "h-3.5 w-3.5 shrink-0",
            colorClass,
            status === "started" && "animate-spin"
          )}
        />

        {/* Event type */}
        <span className="text-xs font-medium text-foreground/80 w-28 shrink-0">
          {EVENT_LABELS[log.event_type ?? ""] ?? log.event_type}
        </span>

        {/* Summary */}
        <span className="text-xs text-muted-foreground flex-1 truncate">
          {log.result_summary ?? log.error_message ?? log.skip_reason ?? "—"}
        </span>

        {/* Duration */}
        {log.duration_ms != null && (
          <span className="text-xs text-muted-foreground shrink-0">
            {formatDuration(log.duration_ms)}
          </span>
        )}

        {/* Time */}
        <span className="text-xs text-muted-foreground shrink-0 w-16 text-right">
          {formatTime(log.created_at)}
        </span>

        {/* Retry button */}
        {canRetry && (
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 shrink-0 ml-1"
            onClick={(e) => {
              e.stopPropagation();
              handleRetry();
            }}
            disabled={retrying}
            title="Reintentar"
          >
            {retrying ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <RotateCcw className="h-3 w-3" />
            )}
          </Button>
        )}

        {/* Expand toggle */}
        {expanded ? (
          <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
        )}
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="px-3 pb-3 pt-0 space-y-1.5 bg-secondary/20">
          {log.run_id && (
            <p className="text-xs font-mono text-muted-foreground">
              run: {log.run_id}
            </p>
          )}
          {log.error_message && (
            <p className="text-xs text-destructive bg-destructive/10 rounded p-2 font-mono">
              {log.error_message}
            </p>
          )}
          {log.skip_reason && (
            <p className="text-xs text-muted-foreground italic">{log.skip_reason}</p>
          )}
          {log.metadata && Object.keys(log.metadata).length > 0 && (
            <pre className="text-xs font-mono text-muted-foreground bg-secondary/50 rounded p-2 overflow-x-auto">
              {JSON.stringify(log.metadata, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

export function AutomationLogPanel({ episodeId }: Props) {
  const { data: logs, isLoading } = useAutomationLogs(episodeId);

  return (
    <div className="surface rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border/60 bg-secondary/20">
        <Activity className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Automatizaciones recientes
        </span>
        {logs && logs.length > 0 && (
          <span className="ml-auto text-xs text-muted-foreground">
            {logs.length} registros
          </span>
        )}
      </div>

      {/* Log list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : !logs || logs.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-6">
          Sin registros de automatización aún
        </p>
      ) : (
        <ScrollArea className="max-h-64">
          {logs.map((log) => (
            <LogRow key={log.id} log={log} episodeId={episodeId} />
          ))}
        </ScrollArea>
      )}
    </div>
  );
}
