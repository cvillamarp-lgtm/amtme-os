/**
 * VOSValidationPanel
 * ──────────────────
 * Shows the full brand compliance validation for a piece.
 * Blocks export/approval when critical checks fail.
 */
import { useState } from "react";
import { ShieldCheck, XCircle, AlertTriangle, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { VOSValidationResult, VOSCheck } from "@/lib/visual-os/validator";

interface VOSValidationPanelProps {
  result:    VOSValidationResult;
  className?: string;
}

function CheckRow({ check }: { check: VOSCheck }) {
  const isCritical = check.severity === "critico";
  return (
    <div
      className={cn(
        "flex items-start gap-2 px-3 py-1.5 rounded text-xs",
        check.pass
          ? "text-muted-foreground"
          : isCritical
          ? "bg-red-500/10 text-red-400"
          : "bg-amber-500/10 text-amber-400",
      )}
    >
      <span className="mt-px shrink-0">
        {check.pass
          ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
          : isCritical
          ? <XCircle className="h-3.5 w-3.5" />
          : <AlertTriangle className="h-3.5 w-3.5" />}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-mono text-[10px] opacity-50">{check.rule}</span>
          <span className={cn(check.pass ? "opacity-60 font-normal" : "font-medium")}>
            {check.label}
          </span>
        </div>
        {!check.pass && check.detail && (
          <p className="mt-0.5 opacity-75 leading-tight">{check.detail}</p>
        )}
      </div>
      {!check.pass && (
        <span className={cn(
          "shrink-0 text-[9px] font-bold uppercase tracking-widest",
          isCritical ? "text-red-400" : "text-amber-400",
        )}>
          {isCritical ? "crítico" : "aviso"}
        </span>
      )}
    </div>
  );
}

export function VOSValidationPanel({ result, className }: VOSValidationPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const { pass, score, criticalFails, warningFails, checks } = result;
  const failed = checks.filter(c => !c.pass);
  const passed = checks.filter(c => c.pass);

  const scoreColor = score >= 90 ? "text-emerald-400" : score >= 70 ? "text-amber-400" : "text-red-400";

  return (
    <div className={cn("rounded-md border border-border bg-card", className)}>
      <button
        className="w-full flex items-center gap-2 px-3 py-2.5 text-xs hover:bg-muted/40 transition-colors rounded-md"
        onClick={() => setExpanded(v => !v)}
      >
        {pass
          ? <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-500" />
          : <XCircle    className="h-4 w-4 shrink-0 text-red-500" />}

        <div className="flex-1 flex items-center gap-1.5 min-w-0 text-left">
          <span className={cn("font-semibold", pass ? "text-emerald-400" : "text-red-400")}>
            {pass ? "Listo para exportar" : `${criticalFails} error${criticalFails !== 1 ? "es" : ""} crítico${criticalFails !== 1 ? "s" : ""}`}
          </span>
          {warningFails > 0 && (
            <span className="text-amber-400">· {warningFails} aviso{warningFails !== 1 ? "s" : ""}</span>
          )}
        </div>

        <span className={cn("font-mono font-bold tabular-nums shrink-0", scoreColor)}>
          {score}%
        </span>
        {expanded
          ? <ChevronUp   className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          : <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="border-t border-border px-1 py-1.5 space-y-0.5">
          {failed.map(c => <CheckRow key={c.id} check={c} />)}
          {failed.length > 0 && passed.length > 0 && <div className="my-1 border-t border-border/40" />}
          {passed.map(c => <CheckRow key={c.id} check={c} />)}
        </div>
      )}
    </div>
  );
}
