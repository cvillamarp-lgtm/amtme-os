import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Wand2, Check, X, History, RotateCcw, AlertTriangle, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { invokeEdgeFunction } from "@/services/functions/invokeEdgeFunction";
import { showEdgeFunctionError } from "@/services/functions/edgeFunctionErrors";
import { useQueryClient } from "@tanstack/react-query";
import type { Tables } from "@/integrations/supabase/types";

type Episode = Tables<"episodes">;

interface PlanChange {
  field: string;
  before: unknown;
  after: unknown;
  status: "update" | "conflict" | "no_change";
  reason?: string;
}

interface PlanResult {
  run_id: string;
  plan: {
    intent: string;
    summary: string;
    operations_count: number;
  };
  changes: PlanChange[];
  warnings: string[];
  conflicts: string[];
}

interface ActionHistoryItem {
  id: string;
  instruction: string;
  status: "planned" | "applied" | "canceled" | "rolled_back" | "error";
  intent: string;
  created_at: string;
  applied_at?: string | null;
  rolled_back_at?: string | null;
}

interface ApplyResult {
  run_id: string;
  status: "applied";
  updated_fields: string[];
}

interface Props {
  episode: Episode;
}

const INTENT_LABELS: Record<string, string> = {
  UPDATE_FIELDS: "Actualizar campos",
  REORGANIZE: "Reorganizar estructura",
  CONSOLIDATE: "Consolidar contenido",
  SAFETY_REVIEW: "Revisión de seguridad",
};

export function WorkspaceConstructor({ episode }: Props) {
  const queryClient = useQueryClient();
  const [instruction, setInstruction] = useState("");
  const [planning, setPlanning] = useState(false);
  const [applying, setApplying] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [rollingBackId, setRollingBackId] = useState<string | null>(null);

  const [plan, setPlan] = useState<PlanResult | null>(null);
  const [history, setHistory] = useState<ActionHistoryItem[]>([]);

  const hasBlockingConflicts = useMemo(
    () => (plan?.changes ?? []).some((c) => c.status === "conflict"),
    [plan],
  );

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const data = await invokeEdgeFunction<{ runs: ActionHistoryItem[] }>(
        "assistant-constructor",
        { mode: "history", episode_id: episode.id },
      );
      setHistory(data.runs || []);
    } catch (e: unknown) {
      showEdgeFunctionError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    void loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [episode.id]);

  const handlePlan = async () => {
    const text = instruction.trim();
    if (!text) {
      toast.error("Escribe una instrucción primero");
      return;
    }
    setPlanning(true);
    setPlan(null);
    try {
      const data = await invokeEdgeFunction<PlanResult>("assistant-constructor", {
        mode: "plan",
        episode_id: episode.id,
        instruction: text,
      });
      setPlan(data);
      toast.success("Propuesta generada. Revisa antes de aplicar.");
      await loadHistory();
    } catch (e: unknown) {
      showEdgeFunctionError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setPlanning(false);
    }
  };

  const handleApply = async () => {
    if (!plan?.run_id) return;
    setApplying(true);
    try {
      const data = await invokeEdgeFunction<ApplyResult>("assistant-constructor", {
        mode: "apply",
        episode_id: episode.id,
        run_id: plan.run_id,
      });
      queryClient.invalidateQueries({ queryKey: ["episode", episode.id] });
      toast.success(`Cambios aplicados: ${data.updated_fields.length} campo(s)`);
      setPlan(null);
      await loadHistory();
    } catch (e: unknown) {
      showEdgeFunctionError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setApplying(false);
    }
  };

  const handleCancel = async () => {
    if (!plan?.run_id) return;
    try {
      await invokeEdgeFunction("assistant-constructor", {
        mode: "cancel",
        episode_id: episode.id,
        run_id: plan.run_id,
      });
      toast.success("Propuesta cancelada");
      setPlan(null);
      await loadHistory();
    } catch (e: unknown) {
      showEdgeFunctionError(e instanceof Error ? e : new Error(String(e)));
    }
  };

  const handleRollback = async (runId: string) => {
    setRollingBackId(runId);
    try {
      await invokeEdgeFunction("assistant-constructor", {
        mode: "rollback",
        episode_id: episode.id,
        run_id: runId,
      });
      queryClient.invalidateQueries({ queryKey: ["episode", episode.id] });
      toast.success("Versión restaurada");
      await loadHistory();
    } catch (e: unknown) {
      showEdgeFunctionError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setRollingBackId(null);
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
      <div className="xl:col-span-4 space-y-4">
        <div className="surface p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Wand2 className="h-4 w-4 text-primary" />
            <p className="text-sm font-medium">Instrucción en lenguaje natural</p>
          </div>
          <Textarea
            rows={8}
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            placeholder='Ej: "reorganiza el resumen para que sea más directo y actualiza el hook con más tensión"'
            className="resize-none"
          />
          <Button onClick={handlePlan} disabled={planning || !instruction.trim()} className="w-full">
            {planning ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Interpretando...</> : <><Sparkles className="h-4 w-4 mr-2" />Generar propuesta</>}
          </Button>
        </div>

        <div className="surface p-4 space-y-3">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-medium">Historial y versiones</p>
          </div>
          <ScrollArea className="h-[360px] pr-2">
            <div className="space-y-2">
              {loadingHistory && <p className="text-xs text-muted-foreground">Cargando historial...</p>}
              {!loadingHistory && history.length === 0 && (
                <p className="text-xs text-muted-foreground">Sin acciones registradas todavía.</p>
              )}
              {history.map((item) => (
                <div key={item.id} className="border border-border rounded-md p-2 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="outline" className="text-[10px]">{item.status}</Badge>
                    <span className="text-[10px] text-muted-foreground">{new Date(item.created_at).toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-foreground line-clamp-2">{item.instruction}</p>
                  {item.status === "applied" && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-[11px]"
                      onClick={() => handleRollback(item.id)}
                      disabled={rollingBackId === item.id}
                    >
                      {rollingBackId === item.id ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <RotateCcw className="h-3 w-3 mr-1" />}
                      Restaurar
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>

      <div className="xl:col-span-8 space-y-4">
        <div className="surface p-4 space-y-3">
          <p className="text-sm font-medium">Interpretación de la IA</p>
          {!plan && <p className="text-sm text-muted-foreground">Aún no hay una propuesta activa.</p>}
          {plan && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline">{INTENT_LABELS[plan.plan.intent] ?? plan.plan.intent}</Badge>
                <Badge variant="secondary">{plan.plan.operations_count} acción(es)</Badge>
              </div>
              <p className="text-sm text-foreground">{plan.plan.summary}</p>
              {plan.warnings.length > 0 && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded p-2">
                  {plan.warnings.map((w, idx) => (
                    <p key={idx} className="text-xs text-amber-700">• {w}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="surface p-4 space-y-3">
          <p className="text-sm font-medium">Vista previa de cambios</p>
          {!plan && <p className="text-sm text-muted-foreground">Aquí verás qué cambia, qué se conserva y posibles conflictos.</p>}
          {plan && (
            <div className="space-y-2">
              {plan.changes.map((c) => (
                <div key={c.field} className="border border-border rounded-md p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-xs font-medium capitalize">{c.field.replace(/_/g, " ")}</p>
                    <Badge variant="outline" className="text-[10px]">{c.status}</Badge>
                  </div>
                  {c.before !== null && c.before !== undefined && (
                    <p className="text-xs text-muted-foreground line-clamp-2">Antes: {String(c.before)}</p>
                  )}
                  <p className="text-xs text-foreground line-clamp-3">Después: {String(c.after)}</p>
                  {c.reason && <p className="text-[11px] text-muted-foreground mt-1">{c.reason}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        {plan && (
          <div className="surface p-4 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {hasBlockingConflicts ? (
                <><AlertTriangle className="h-3.5 w-3.5 text-amber-600" />Hay conflictos: revisa antes de aplicar.</>
              ) : (
                <><Check className="h-3.5 w-3.5 text-emerald-600" />Propuesta lista para aplicar.</>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handleCancel} disabled={applying}>
                <X className="h-4 w-4 mr-1" />Cancelar
              </Button>
              <Button onClick={handleApply} disabled={applying || hasBlockingConflicts}>
                {applying ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Aplicando...</> : <><Check className="h-4 w-4 mr-1" />Aplicar cambios</>}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
