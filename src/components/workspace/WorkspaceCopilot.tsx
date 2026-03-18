import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Zap, Check, ChevronRight, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { invokeEdgeFunction } from "@/services/functions/invokeEdgeFunction";
import { showEdgeFunctionError } from "@/services/functions/edgeFunctionErrors";
import type { Tables } from "@/integrations/supabase/types";

type Episode = Tables<"episodes">;

interface CopilotResult {
  plan: {
    intent: string;
    description: string;
    fields_to_update?: string[];
  };
  diff: Record<string, { before: unknown; after: unknown }>;
  extra?: Record<string, unknown>;
  audit_id: string | null;
}

interface Props {
  episode: Episode;
}

const INTENT_LABELS: Record<string, string> = {
  FILL_EPISODE_FIELDS: "Completar campos base",
  GENERATE_OPTIONS: "Generar opciones por campo",
  CLEAN_SCRIPT: "Limpiar guión",
  DISTRIBUTION_PACK: "Pack de distribución",
  QA_AUDIT_SAVE: "Auditoría de episodio",
};

const INTENT_COLORS: Record<string, string> = {
  FILL_EPISODE_FIELDS: "bg-violet-500/10 text-violet-600 border-violet-500/20",
  GENERATE_OPTIONS: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  CLEAN_SCRIPT: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  DISTRIBUTION_PACK: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  QA_AUDIT_SAVE: "bg-orange-500/10 text-orange-600 border-orange-500/20",
};

const QUICK_COMMANDS = [
  { label: "Completar todos los campos", cmd: "Genera tema, tesis central, resumen, hook, CTA y quote basado en la idea principal" },
  { label: "3 opciones de hook", cmd: "Genera 3 opciones distintas para el hook" },
  { label: "Limpiar guión", cmd: "Limpia el guión y elimina timestamps y marcadores técnicos" },
  { label: "Pack distribución", cmd: "Genera la descripción Spotify y copy de Instagram" },
  { label: "Auditoría", cmd: "Verifica el estado del episodio y dime qué falta" },
];

export function WorkspaceCopilot({ episode }: Props) {
  const [command, setCommand] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CopilotResult | null>(null);
  const queryClient = useQueryClient();

  const execute = async (cmd?: string) => {
    const text = (cmd ?? command).trim();
    if (!text) return;
    if (cmd) setCommand(cmd);
    setLoading(true);
    setResult(null);
    try {
      const data = await invokeEdgeFunction<CopilotResult>("copilot-dispatch", {
        episode_id: episode.id,
        command: text,
      });
      setResult(data);
      queryClient.invalidateQueries({ queryKey: ["episode", episode.id] });
      toast.success("Copiloto ejecutó los cambios");
    } catch (e: unknown) {
      showEdgeFunctionError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setLoading(false);
    }
  };

  const diffEntries = result ? Object.entries(result.diff).filter(([, v]) => v.after) : [];
  const qaChecks = result?.extra?.checks as { field: string; ok: boolean }[] | undefined;

  return (
    <div className="space-y-5">
      {/* Command input */}
      <div className="surface p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Zap className="h-4 w-4 text-violet-500" />
          <p className="text-sm font-medium text-foreground">Copiloto Operativo</p>
          <span className="text-xs text-muted-foreground">— ejecuta acciones reales sobre el episodio</span>
        </div>

        <Textarea
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          placeholder='Ej: "Genera 3 hooks distintos" · "Completa tema y tesis" · "Limpia el guión"'
          rows={3}
          className="resize-none"
          onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") execute(); }}
        />

        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            {QUICK_COMMANDS.map((q) => (
              <button
                key={q.label}
                className="text-xs px-2 py-0.5 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
                onClick={() => execute(q.cmd)}
                disabled={loading}
              >
                {q.label}
              </button>
            ))}
          </div>
          <Button onClick={() => execute()} disabled={loading || !command.trim()} size="sm" className="shrink-0">
            {loading
              ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Ejecutando...</>
              : <><Zap className="h-4 w-4 mr-2" />Ejecutar</>}
          </Button>
        </div>
      </div>

      {/* Result */}
      {result && (
        <>
          {/* Plan card */}
          <div className="surface p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-500 shrink-0" />
              <Badge
                variant="outline"
                className={`text-xs ${INTENT_COLORS[result.plan.intent] ?? "bg-muted text-muted-foreground"}`}
              >
                {INTENT_LABELS[result.plan.intent] ?? result.plan.intent}
              </Badge>
            </div>
            <p className="text-sm text-foreground">{result.plan.description}</p>
            {result.plan.fields_to_update && result.plan.fields_to_update.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {result.plan.fields_to_update.map((f) => (
                  <span key={f} className="text-xs bg-secondary px-2 py-0.5 rounded font-mono">
                    {f}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* QA results */}
          {qaChecks && (
            <div className="surface p-4 space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Resultados de auditoría</p>
              <div className="grid grid-cols-2 gap-1.5">
                {qaChecks.map((c) => (
                  <div key={c.field} className={`flex items-center gap-2 text-xs px-2 py-1.5 rounded border ${c.ok ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-700" : "border-red-500/20 bg-red-500/5 text-red-600"}`}>
                    <span>{c.ok ? "✓" : "✗"}</span>
                    <span className="capitalize">{c.field.replace(/_/g, " ")}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Options generated (for GENERATE_OPTIONS intent) */}
          {result.extra?.options && Array.isArray(result.extra.options) && (
            <div className="surface p-4 space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Opciones generadas para <span className="font-mono">{result.extra.field as string}</span>
              </p>
              <div className="space-y-2">
                {(result.extra.options as { value: string; rationale?: string }[]).map((opt, i) => (
                  <div key={i} className="border border-border rounded p-2.5 space-y-1">
                    <p className="text-sm">{opt.value}</p>
                    {opt.rationale && <p className="text-xs text-muted-foreground italic">{opt.rationale}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Diff */}
          {diffEntries.length > 0 && (
            <div className="surface p-4 space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Cambios aplicados al episodio</p>
              <div className="space-y-3">
                {diffEntries.map(([field, { before, after }]) => (
                  <div key={field} className="space-y-1">
                    <p className="text-xs font-medium text-foreground capitalize">{field.replace(/_/g, " ")}</p>
                    {before && (
                      <p className="text-xs text-muted-foreground bg-red-500/5 border border-red-500/10 rounded px-2 py-1.5 line-through">
                        {String(before).slice(0, 140)}{String(before).length > 140 ? "…" : ""}
                      </p>
                    )}
                    <p className="text-xs text-foreground bg-emerald-500/5 border border-emerald-500/10 rounded px-2 py-1.5">
                      {String(after).slice(0, 140)}{String(after).length > 140 ? "…" : ""}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Audit log reference */}
          {result.audit_id && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
              <ClipboardList className="h-3 w-3" />
              <span>Registrado en audit_events</span>
              <ChevronRight className="h-3 w-3" />
              <span className="font-mono">{result.audit_id.slice(0, 8)}…</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
