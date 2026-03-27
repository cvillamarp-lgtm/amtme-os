import { ReactNode, memo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Pencil, Check, AlertTriangle, Lock, RefreshCw, X, History } from "lucide-react";
import { BlockStatus, BlockState, STATUS_VISUALS, FIELD_LABELS, VersionEntry } from "@/lib/block-states";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export interface BlockOption {
  value: string;
  rationale?: string;
}

interface BlockWrapperProps {
  fieldName: string;
  state: BlockState | undefined;
  children: ReactNode;
  onRegenerate?: () => void;
  onApprove?: () => void;
  onDismissStale?: () => void;
  onRestoreVersion?: (entry: VersionEntry) => void;
  isRegenerating?: boolean;
  versionHistory?: VersionEntry[];
  options?: BlockOption[];
  onGenerateOptions?: () => void;
  onApplyOption?: (value: string) => void;
  onDismissOptions?: () => void;
  isGeneratingOptions?: boolean;
}

const StatusIcon = ({ status }: { status: BlockStatus }) => {
  const iconClass = "h-3 w-3";
  switch (status) {
    case "generated": return <Sparkles className={iconClass} />;
    case "edited": return <Pencil className={iconClass} />;
    case "approved": return <Check className={iconClass} />;
    case "stale": return <AlertTriangle className={iconClass} />;
    case "blocked": return <Lock className={iconClass} />;
    default: return null;
  }
};

export function BlockWrapper({
  fieldName,
  state,
  children,
  onRegenerate,
  onApprove,
  onDismissStale,
  onRestoreVersion,
  isRegenerating,
  versionHistory = [],
  options,
  onGenerateOptions,
  onApplyOption,
  onDismissOptions,
  isGeneratingOptions,
}: BlockWrapperProps) {
  const status: BlockStatus = state?.status || "empty";
  const visual = STATUS_VISUALS[status];
  const label = FIELD_LABELS[fieldName] || fieldName;

  return (
    <div className="relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">{label}</span>
          <Badge
            variant="outline"
            className={`text-xs gap-1 ${visual.color} ${visual.bgColor} border-transparent ${visual.animate ? "animate-pulse" : ""}`}
          >
            <StatusIcon status={status} />
            {visual.label}
          </Badge>
        </div>

        <div className="flex items-center gap-1">
          {/* Version history dropdown */}
          {versionHistory.length > 0 && onRestoreVersion && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 px-1.5 text-xs text-muted-foreground">
                  <History className="h-3 w-3 mr-1" />
                  {versionHistory.length}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="max-w-xs">
                {versionHistory.slice().reverse().map((entry, i) => (
                  <DropdownMenuItem
                    key={i}
                    onClick={() => onRestoreVersion(entry)}
                    className="text-xs"
                  >
                    <span className="truncate max-w-[200px]">{entry.value?.slice(0, 60)}...</span>
                    <span className="text-muted-foreground ml-2 whitespace-nowrap">
                      {new Date(entry.timestamp).toLocaleDateString()}
                    </span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Approve button */}
          {status !== "approved" && status !== "empty" && onApprove && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-1.5 text-xs text-emerald-600 hover:text-emerald-700"
              onClick={onApprove}
            >
              <Check className="h-3 w-3 mr-1" />Aprobar
            </Button>
          )}

          {/* Regenerate button */}
          {(status === "stale" || status === "generated") && onRegenerate && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-1.5 text-xs text-primary hover:text-primary/80"
              onClick={onRegenerate}
              disabled={isRegenerating}
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${isRegenerating ? "animate-spin" : ""}`} />
              {isRegenerating ? "Regenerando..." : "Regenerar"}
            </Button>
          )}

          {/* Generate options button */}
          {onGenerateOptions && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-1.5 text-xs text-violet-500 hover:text-violet-600"
              onClick={onGenerateOptions}
              disabled={isGeneratingOptions || isRegenerating}
            >
              <Sparkles className={`h-3 w-3 mr-1 ${isGeneratingOptions ? "animate-spin" : ""}`} />
              {isGeneratingOptions ? "Generando..." : options?.length ? `Opciones (${options.length})` : "Opciones"}
            </Button>
          )}
        </div>
      </div>

      {/* Stale message */}
      {status === "stale" && state?.stale_reason && (
        <div className="flex items-center justify-between bg-orange-500/5 border border-orange-500/20 rounded-md px-3 py-1.5 mb-2">
          <p className="text-xs text-orange-600">
            Este contenido quedó desactualizado porque {state.stale_reason}.
          </p>
          <div className="flex gap-1 ml-2 shrink-0">
            {onRegenerate && (
              <Button variant="ghost" size="sm" className="h-8 px-1.5 text-xs" onClick={onRegenerate} disabled={isRegenerating}>
                Regenerar
              </Button>
            )}
            {onDismissStale && (
              <Button variant="ghost" size="sm" className="h-8 px-1 text-xs" onClick={onDismissStale}>
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Loading overlay during regeneration */}
      {isRegenerating && (
        <div className="absolute inset-0 bg-background/60 rounded-md flex items-center justify-center z-10">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <RefreshCw className="h-4 w-4 animate-spin" />
            Regenerando...
          </div>
        </div>
      )}

      {/* Field content */}
      {children}

      {/* AI options panel */}
      {options && options.length > 0 && (
        <div className="mt-2 border border-violet-500/20 rounded-md bg-violet-500/5 p-2.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-violet-600 flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              {options.length} opciones generadas — elige una
            </span>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground" onClick={onDismissOptions}>
              <X className="h-3 w-3" />
            </Button>
          </div>
          {options.map((opt, i) => (
            <div key={i} className="bg-background rounded border border-border p-2.5 space-y-1.5">
              <p className="text-sm leading-relaxed">{opt.value}</p>
              {opt.rationale && (
                <p className="text-xs text-muted-foreground italic">{opt.rationale}</p>
              )}
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs border-violet-500/30 text-violet-600 hover:bg-violet-500/10"
                onClick={() => onApplyOption?.(opt.value)}
              >
                <Check className="h-3 w-3 mr-1" />
                Aplicar
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
