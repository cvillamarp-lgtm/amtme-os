import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Wand2, Check, X, History, RotateCcw, AlertTriangle, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { invokeEdgeFunction } from "@/services/functions/invokeEdgeFunction";
import { showEdgeFunctionError } from "@/services/functions/edgeFunctionErrors";
import { useQueryClient } from "@tanstack/react-query";
import type { Tables } from "@/integrations/supabase/types";

type Episode = Tables<"episodes">;

interface PlanChange {
  change_id: string;
  entity_type: "episode" | "asset_candidates" | "tasks" | "publication_queue";
  action:
    | "update_field"
    | "create_candidate"
    | "update_candidate"
    | "create_task"
    | "update_task"
    | "create_publication"
    | "update_publication";
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
  risk?: {
    score: number;
    level: "low" | "medium" | "high";
    factors: string[];
    requires_manual_review: boolean;
  };
  impact?: {
    will_modify: string[];
    will_preserve: string[];
    historical_snapshot: boolean;
    potential_conflicts: number;
  };
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
  created_assets?: number;
  created_tasks?: number;
  created_publications?: number;
  updated_assets?: number;
  updated_tasks?: number;
  updated_publications?: number;
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

const ENTITY_LABELS: Record<PlanChange["entity_type"], string> = {
  episode: "Episodio",
  asset_candidates: "Assets",
  tasks: "Tareas",
  publication_queue: "Publicación",
};

const ACTION_LABELS: Record<PlanChange["action"], string> = {
  update_field: "Actualizar",
  create_candidate: "Crear candidate",
  update_candidate: "Actualizar candidate",
  create_task: "Crear tarea",
  update_task: "Actualizar tarea",
  create_publication: "Crear cola",
  update_publication: "Actualizar cola",
};

const HIGH_IMPACT_EPISODE_FIELDS = new Set([
  "working_title",
  "theme",
  "core_thesis",
  "summary",
  "hook",
  "cta",
]);

export function WorkspaceConstructor({ episode }: Props) {
  const queryClient = useQueryClient();
  const [instruction, setInstruction] = useState("");
  const [planning, setPlanning] = useState(false);
  const [applying, setApplying] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [rollingBackId, setRollingBackId] = useState<string | null>(null);
  const [highRiskConfirmed, setHighRiskConfirmed] = useState(false);
  const [selectedChangeIds, setSelectedChangeIds] = useState<string[]>([]);

  const [plan, setPlan] = useState<PlanResult | null>(null);
  const [history, setHistory] = useState<ActionHistoryItem[]>([]);

  const hasBlockingConflicts = useMemo(() => {
    if (!plan) return false;
    return plan.changes.some((c) => selectedChangeIds.includes(c.change_id) && c.status === "conflict");
  }, [plan, selectedChangeIds]);

  const requiresExtraConfirmation = useMemo(
    () => !!plan?.risk && plan.risk.level === "high",
    [plan],
  );

  const canApply = selectedChangeIds.length > 0 && !hasBlockingConflicts && (!requiresExtraConfirmation || highRiskConfirmed);

  const isHighImpactChange = (change: PlanChange) => {
    if (change.entity_type !== "episode") return true;
    if (HIGH_IMPACT_EPISODE_FIELDS.has(change.field)) return true;
    const beforeLen = String(change.before ?? "").trim().length;
    const afterLen = String(change.after ?? "").trim().length;
    return Math.abs(afterLen - beforeLen) > 180;
  };

  const toggleChangeSelection = (changeId: string, checked: boolean) => {
    setSelectedChangeIds((prev) => checked ? Array.from(new Set([...prev, changeId])) : prev.filter((id) => id !== changeId));
  };

  const selectAllUpdates = () => {
    if (!plan) return;
    setSelectedChangeIds(plan.changes.filter((c) => c.status === "update").map((c) => c.change_id));
  };

  const clearSelection = () => setSelectedChangeIds([]);

  const selectConflicts = () => {
    if (!plan) return;
    setSelectedChangeIds(plan.changes.filter((c) => c.status === "conflict").map((c) => c.change_id));
  };

  const selectHighImpact = () => {
    if (!plan) return;
    setSelectedChangeIds(plan.changes.filter((c) => c.status === "update" && isHighImpactChange(c)).map((c) => c.change_id));
  };

  const renderWordDelta = (before: unknown, after: unknown) => {
    const beforeWords = String(before ?? "").trim().split(/\s+/).filter(Boolean);
    const afterWords = String(after ?? "").trim().split(/\s+/).filter(Boolean);
    const afterSet = new Set(afterWords.map((w) => w.toLowerCase()));
    const beforeSet = new Set(beforeWords.map((w) => w.toLowerCase()));

    const removed = beforeWords.filter((w) => !afterSet.has(w.toLowerCase())).slice(0, 24);
    const added = afterWords.filter((w) => !beforeSet.has(w.toLowerCase())).slice(0, 24);

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
        <div className="bg-red-500/5 border border-red-500/10 rounded px-2 py-1.5">
          <p className="text-[10px] uppercase tracking-wide text-red-700 mb-1">Palabras removidas</p>
          <p className="text-xs text-red-800/80">{removed.length ? removed.join(" ") : "Sin cambios"}</p>
        </div>
        <div className="bg-emerald-500/5 border border-emerald-500/10 rounded px-2 py-1.5">
          <p className="text-[10px] uppercase tracking-wide text-emerald-700 mb-1">Palabras agregadas</p>
          <p className="text-xs text-emerald-800/80">{added.length ? added.join(" ") : "Sin cambios"}</p>
        </div>
      </div>
    );
  };

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
      setHighRiskConfirmed(false);
      setSelectedChangeIds(data.changes.filter((c) => c.status === "update").map((c) => c.change_id));
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
        selected_change_ids: selectedChangeIds,
      });
      queryClient.invalidateQueries({ queryKey: ["episode", episode.id] });
      const summary = [
        `${data.updated_fields.length} campos`,
        `${data.created_assets ?? 0} assets`,
        `${data.created_tasks ?? 0} tareas`,
        `${data.created_publications ?? 0} publicaciones`,
        `${data.updated_assets ?? 0} updates assets`,
        `${data.updated_tasks ?? 0} updates tareas`,
        `${data.updated_publications ?? 0} updates publicación`,
      ].join(" · ");
      toast.success(`Cambios aplicados: ${summary}`);
      setPlan(null);
      setSelectedChangeIds([]);
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
      setSelectedChangeIds([]);
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
              {plan.risk && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <div className="border border-border rounded p-2">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Riesgo</p>
                    <p className="text-sm font-medium">
                      {plan.risk.score}/100 · {plan.risk.level.toUpperCase()}
                    </p>
                  </div>
                  <div className="border border-border rounded p-2 md:col-span-2">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Factores</p>
                    <p className="text-xs text-foreground">{plan.risk.factors.join(" · ") || "Sin factores relevantes"}</p>
                  </div>
                </div>
              )}
              {plan.impact && (
                <div className="bg-secondary/40 border border-border rounded p-2 space-y-1">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Impacto</p>
                  <p className="text-xs text-foreground">Modifica: {plan.impact.will_modify.length ? plan.impact.will_modify.join(", ") : "ningún campo"}</p>
                  <p className="text-xs text-muted-foreground">Conserva: {plan.impact.will_preserve.length} campo(s)</p>
                  <p className="text-xs text-muted-foreground">Histórico/snapshot: {plan.impact.historical_snapshot ? "sí" : "no"}</p>
                </div>
              )}
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
              <div className="flex flex-wrap gap-2 pb-1">
                <Button type="button" variant="outline" size="sm" className="h-7 text-[11px]" onClick={selectAllUpdates}>
                  Seleccionar todo
                </Button>
                <Button type="button" variant="outline" size="sm" className="h-7 text-[11px]" onClick={clearSelection}>
                  Limpiar selección
                </Button>
                <Button type="button" variant="outline" size="sm" className="h-7 text-[11px]" onClick={selectConflicts}>
                  Solo conflictos
                </Button>
                <Button type="button" variant="outline" size="sm" className="h-7 text-[11px]" onClick={selectHighImpact}>
                  Solo alto impacto
                </Button>
              </div>
              {plan.changes.map((c, idx) => (
                <div key={c.change_id || `${c.entity_type}-${c.action}-${c.field}-${idx}`} className="border border-border rounded-md p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Checkbox
                      checked={selectedChangeIds.includes(c.change_id)}
                      onCheckedChange={(v) => toggleChangeSelection(c.change_id, !!v)}
                      disabled={c.status !== "update" || applying}
                    />
                    <p className="text-xs font-medium capitalize">{c.field.replace(/_/g, " ")}</p>
                    <Badge variant="secondary" className="text-[10px]">{ENTITY_LABELS[c.entity_type]}</Badge>
                    <Badge variant="secondary" className="text-[10px]">{ACTION_LABELS[c.action]}</Badge>
                    <Badge variant="outline" className="text-[10px]">{c.status}</Badge>
                  </div>
                  {c.before !== null && c.before !== undefined && (
                    <p className="text-xs text-muted-foreground line-clamp-2">Antes: {String(c.before)}</p>
                  )}
                  <p className="text-xs text-foreground line-clamp-3">Después: {String(c.after)}</p>
                  {renderWordDelta(c.before, c.after)}
                  {c.reason && <p className="text-[11px] text-muted-foreground mt-1">{c.reason}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        {plan && (
          <div className="surface p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
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
                <Button onClick={handleApply} disabled={applying || !canApply}>
                  {applying ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Aplicando...</> : <><Check className="h-4 w-4 mr-1" />Aplicar cambios</>}
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Cambios seleccionados: {selectedChangeIds.length}</p>
            {requiresExtraConfirmation && (
              <label className="flex items-center gap-2 text-xs text-amber-700 bg-amber-500/10 border border-amber-500/20 rounded p-2">
                <Checkbox checked={highRiskConfirmed} onCheckedChange={(v) => setHighRiskConfirmed(!!v)} />
                Confirmo revisión manual y autorizo aplicar cambios de riesgo alto.
              </label>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
