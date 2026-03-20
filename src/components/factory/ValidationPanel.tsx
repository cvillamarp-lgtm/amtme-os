/**
 * AMTME ValidationPanel
 * ─────────────────────
 * Displays piece validation results from piece-validator.ts.
 * Crítico failures are shown in red and block export.
 * Advertencia failures are shown in amber as warnings.
 */

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
} from "lucide-react";
import type { ValidationResult, ValidationCheck } from "@/lib/piece-validator";
import { cn } from "@/lib/utils";

interface ValidationPanelProps {
  result: ValidationResult;
  className?: string;
}

function CheckRow({ check }: { check: ValidationCheck }) {
  const isCritical = check.severity === "critico";

  return (
    <div
      className={cn(
        "flex items-start gap-2 px-3 py-1.5 rounded text-xs",
        check.pass
          ? "text-muted-foreground"
          : isCritical
          ? "bg-destructive/10 text-destructive"
          : "bg-amber-500/10 text-amber-600 dark:text-amber-400",
      )}
    >
      <span className="mt-px shrink-0">
        {check.pass ? (
          <CheckCircle2 className="h-3.5 w-3.5 text-chart-1" />
        ) : isCritical ? (
          <XCircle className="h-3.5 w-3.5" />
        ) : (
          <AlertTriangle className="h-3.5 w-3.5" />
        )}
      </span>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-mono text-[10px] opacity-60">{check.rule}</span>
          <span className={cn("font-medium", check.pass && "font-normal opacity-70")}>
            {check.label}
          </span>
        </div>
        {!check.pass && check.detail && (
          <p className="mt-0.5 opacity-80 leading-tight">{check.detail}</p>
        )}
      </div>

      {!check.pass && (
        <Badge
          variant="outline"
          className={cn(
            "shrink-0 text-[9px] h-4 px-1 uppercase tracking-wide",
            isCritical
              ? "border-destructive/50 text-destructive"
              : "border-amber-500/50 text-amber-600 dark:text-amber-400",
          )}
        >
          {isCritical ? "crítico" : "aviso"}
        </Badge>
      )}
    </div>
  );
}

export function ValidationPanel({ result, className }: ValidationPanelProps) {
  const [expanded, setExpanded] = useState(false);

  const { pass, score, criticalFails, warningFails, checks } = result;
  const failedChecks = checks.filter((c) => !c.pass);
  const passedChecks = checks.filter((c) => c.pass);

  // Score color
  const scoreColor =
    score >= 90
      ? "text-chart-1"
      : score >= 70
      ? "text-amber-500"
      : "text-destructive";

  return (
    <div className={cn("rounded-md border border-border bg-card text-card-foreground", className)}>
      {/* Summary row */}
      <button
        className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-muted/50 transition-colors rounded-md"
        onClick={() => setExpanded((v) => !v)}
      >
        {/* Status icon */}
        {pass ? (
          <ShieldCheck className="h-4 w-4 shrink-0 text-chart-1" />
        ) : (
          <XCircle className="h-4 w-4 shrink-0 text-destructive" />
        )}

        {/* Labels */}
        <div className="flex-1 flex items-center gap-1.5 min-w-0">
          <span className={cn("font-semibold", pass ? "text-chart-1" : "text-destructive")}>
            {pass ? "Válido" : `${criticalFails} error${criticalFails !== 1 ? "es" : ""} crítico${criticalFails !== 1 ? "s" : ""}`}
          </span>
          {warningFails > 0 && (
            <span className="text-amber-500">
              · {warningFails} aviso{warningFails !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Score */}
        <span className={cn("font-mono font-bold tabular-nums shrink-0", scoreColor)}>
          {score}%
        </span>

        {/* Expand toggle */}
        {expanded ? (
          <ChevronUp className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        )}
      </button>

      {/* Expanded checks */}
      {expanded && (
        <div className="border-t border-border px-1 py-1.5 space-y-0.5">
          {/* Failed first */}
          {failedChecks.map((c) => (
            <CheckRow key={c.id} check={c} />
          ))}
          {/* Passed below, always dimmed */}
          {failedChecks.length > 0 && passedChecks.length > 0 && (
            <div className="my-1 border-t border-border/50" />
          )}
          {passedChecks.map((c) => (
            <CheckRow key={c.id} check={c} />
          ))}
        </div>
      )}
    </div>
  );
}
