/**
 * VersionHistory
 * ──────────────
 * Shows all saved versions for a piece with restore capability.
 */
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { RotateCcw, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { PieceVersion } from "@/lib/visual-os/types";

interface VersionHistoryProps {
  versions:         PieceVersion[];
  currentVersionId: string | null;
  onRestore:        (version: PieceVersion) => void;
  restoring?:       boolean;
  className?:       string;
}

export function VersionHistory({
  versions,
  currentVersionId,
  onRestore,
  restoring = false,
  className,
}: VersionHistoryProps) {
  if (!versions.length) {
    return (
      <p className="text-xs text-muted-foreground py-4 text-center">
        Sin versiones guardadas aún
      </p>
    );
  }

  return (
    <ScrollArea className={cn("max-h-64", className)}>
      <div className="space-y-1 pr-2">
        {versions.map(v => {
          const isCurrent = v.id === currentVersionId;
          return (
            <div
              key={v.id}
              className={cn(
                "flex items-center gap-2 p-2 rounded-md border text-xs transition-colors",
                isCurrent
                  ? "border-emerald-500/30 bg-emerald-500/5"
                  : "border-border hover:bg-muted/40",
              )}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-bold text-[11px]">
                    v{v.version_number}
                  </span>
                  {isCurrent && (
                    <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                  )}
                  <span className={cn(
                    "ml-auto tabular-nums font-mono",
                    v.validation_score >= 90
                      ? "text-emerald-500"
                      : v.validation_score >= 70
                      ? "text-amber-500"
                      : "text-red-400",
                  )}>
                    {v.validation_score}%
                  </span>
                </div>

                {v.change_reason && (
                  <p className="text-muted-foreground truncate">{v.change_reason}</p>
                )}

                <p className="text-muted-foreground/60 text-[10px]">
                  {formatDistanceToNow(new Date(v.created_at), { addSuffix: true, locale: es })}
                </p>
              </div>

              {!isCurrent && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 shrink-0"
                  disabled={restoring}
                  onClick={() => onRestore(v)}
                  title={`Restaurar versión ${v.version_number}`}
                >
                  <RotateCcw className="h-3 w-3" />
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
