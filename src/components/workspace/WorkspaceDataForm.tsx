import { useState, useEffect, useCallback, useRef, type ReactNode , memo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, Loader2, Check, AlertTriangle, RefreshCw, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { BlockWrapper, BlockOption } from "./BlockWrapper";
import { invokeEdgeFunction } from "@/services/functions/invokeEdgeFunction";
import { showEdgeFunctionError } from "@/services/functions/edgeFunctionErrors";
import {
  BlockStatesMap,
  VersionHistoryMap,
  VersionEntry,
  applyStaleToStates,
  countStaleBlocks,
  getStaleFields,
  addVersionEntry,
  FIELD_LABELS,
  BASE_FIELDS,
} from "@/lib/block-states";
import type { Tables } from "@/integrations/supabase/types";

type Episode = Tables<"episodes">;

interface FormFields {
  number: string;
  idea_principal: string;
  working_title: string;
  final_title: string;
  titulo_original: string;
  idea_principal: string;
  theme: string;
  core_thesis: string;
  summary: string;
  descripcion_spotify: string;
  link_spotify: string;
  hook: string;
  cta: string;
  quote: string;
  release_date: string;
  duration: string;
  nota_trazabilidad: string;
  conflicto_detectado: boolean;
  conflicto_nota: string;
  fecha_es_estimada: boolean;
  nivel_completitud: string;
}

interface Props {
  episode: Episode;
  onSave: (updates: Partial<Episode> & { title?: string }) => Promise<void>;
  isSaving: boolean;
}

interface AIStableEnvelope {
  status?: "success" | "recovered" | "degraded" | "failed";
  error_code?: string;
  retryable?: boolean;
  provider_used?: string | null;
  fallback_used?: boolean;
  message?: string;
  request_id?: string;
}

/** Fields that trigger dependency propagation when changed */
const PROPAGATING_FIELDS = ["idea_principal", "theme", "core_thesis", "summary", "hook", "cta", "template_id", "visual_preset_id"];

/** Fields wrapped with BlockWrapper (AI-tracked) */
const BLOCK_FIELDS = [...BASE_FIELDS] as string[];

function hydrateFormFromEpisode(episode: Episode): FormFields {
  return {
    number: episode.number || "",
    idea_principal: episode.idea_principal || "",
    working_title: episode.working_title || episode.title || "",
    final_title: episode.final_title || "",
    titulo_original: episode.titulo_original || "",
    theme: episode.theme || "",
    core_thesis: episode.core_thesis || "",
    summary: episode.summary || "",
    descripcion_spotify: episode.descripcion_spotify || "",
    link_spotify: episode.link_spotify || "",
    hook: episode.hook || "",
    cta: episode.cta || "",
    quote: episode.quote || "",
    release_date: episode.release_date || "",
    duration: episode.duration || "",
    nota_trazabilidad: episode.nota_trazabilidad || "",
    conflicto_detectado: episode.conflicto_detectado || false,
    conflicto_nota: episode.conflicto_nota || "",
    fecha_es_estimada: episode.fecha_es_estimada || false,
    nivel_completitud: episode.nivel_completitud || "D",
  };
}

function buildSavePayload(formData: FormFields, states: BlockStatesMap, history: VersionHistoryMap) {
  return {
    ...formData,
    title: formData.final_title || formData.working_title,
    block_states: states,
    version_history: history,
    release_date: formData.release_date || null,
  };
}

export function WorkspaceDataForm({ episode, onSave, isSaving }: Props) {
  const [form, setForm] = useState<FormFields>({
    number: "",
    idea_principal: "",
    working_title: "",
    final_title: "",
    titulo_original: "",
    idea_principal: "",
    theme: "",
    core_thesis: "",
    summary: "",
    descripcion_spotify: "",
    link_spotify: "",
    hook: "",
    cta: "",
    quote: "",
    release_date: "",
    duration: "",
    nota_trazabilidad: "",
    conflicto_detectado: false,
    conflicto_nota: "",
    fecha_es_estimada: false,
    nivel_completitud: "D",
  });
  const [blockStates, setBlockStates] = useState<BlockStatesMap>({});
  const [versionHistory, setVersionHistory] = useState<VersionHistoryMap>({});
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [regeneratingField, setRegeneratingField] = useState<string | null>(null);
  const [fieldOptions, setFieldOptions] = useState<Record<string, BlockOption[]>>({});
  const [generatingOptionsFor, setGeneratingOptionsFor] = useState<string | null>(null);
  const [generatingAll, setGeneratingAll] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef<string>("");
  const previousEpisodeSnapshotRef = useRef<string>("");
  const formRef = useRef(form);
  const blockStatesRef = useRef(blockStates);
  const versionHistoryRef = useRef(versionHistory);

  const syncLocalState = useCallback((nextForm: FormFields, nextStates: BlockStatesMap, nextHistory: VersionHistoryMap) => {
    formRef.current = nextForm;
    blockStatesRef.current = nextStates;
    versionHistoryRef.current = nextHistory;
    setForm(nextForm);
    setBlockStates(nextStates);
    setVersionHistory(nextHistory);
  }, []);

  useEffect(() => {
    if (episode) {
      const nextForm = hydrateFormFromEpisode(episode);
      const nextStates = (episode.block_states as BlockStatesMap) || {};
      const nextHistory = (episode.version_history as VersionHistoryMap) || {};
      const snapshot = JSON.stringify({
        form: nextForm,
        blockStates: nextStates,
        versionHistory: nextHistory,
      });

      if (snapshot === previousEpisodeSnapshotRef.current) {
        return;
      }

      previousEpisodeSnapshotRef.current = snapshot;
      lastSavedRef.current = JSON.stringify(buildSavePayload(nextForm, nextStates, nextHistory));
      syncLocalState(nextForm, nextStates, nextHistory);
    }
  }, [episode, syncLocalState]);

  // ─── Autosave with 2s debounce ─────────────────────────────────────
  const doAutoSave = useCallback(async (formData: FormFields, states: BlockStatesMap, history: VersionHistoryMap) => {
    const payload = buildSavePayload(formData, states, history);
    const hash = JSON.stringify(payload);
    if (hash === lastSavedRef.current) return;

    setAutoSaveStatus("saving");
    try {
      await onSave(payload);
      lastSavedRef.current = hash;
      setAutoSaveStatus("saved");
      setTimeout(() => setAutoSaveStatus("idle"), 2000);
    } catch {
      setAutoSaveStatus("idle");
    }
  }, [onSave]);

  const scheduleAutoSave = useCallback((formData: FormFields, states: BlockStatesMap, history: VersionHistoryMap) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doAutoSave(formData, states, history), 2000);
  }, [doAutoSave]);

  // ─── Field update with dependency propagation ──────────────────────
  const update = (key: keyof FormFields, value: FormFields[keyof FormFields]) => {
    const currentForm = formRef.current;
    const currentStates = blockStatesRef.current;
    const currentHistory = versionHistoryRef.current;
    const newForm = { ...currentForm, [key]: value };
    let newStates = { ...currentStates };
    let newHistory = { ...currentHistory };

    // If this is a block field being manually edited, track it
    if (BLOCK_FIELDS.includes(key)) {
      // Save current value to version history before changing
      const currentValue = currentForm[key];
      if (currentValue && typeof currentValue === "string") {
        newHistory = addVersionEntry(newHistory, key, currentValue, newStates[key]?.source_type || "initial");
      }

      // Mark as edited
      newStates[key] = {
        status: "edited",
        updated_at: new Date().toISOString(),
        source_type: "edited",
      };
    }

    // Propagate stale if this field has dependents
    if (PROPAGATING_FIELDS.includes(key)) {
      const { newStates: propagated, approvedWarnings } = applyStaleToStates(key, newStates);
      newStates = propagated;

      if (approvedWarnings.length > 0) {
        const names = approvedWarnings.map(f => FIELD_LABELS[f] || f).join(", ");
        toast.info(`Campos aprobados afectados: ${names}. Revísalos manualmente.`);
      }
    }

    syncLocalState(newForm, newStates, newHistory);
    scheduleAutoSave(newForm, newStates, newHistory);
  };

  // ─── Approve a block ──────────────────────────────────────────────
  const approveBlock = (fieldName: string) => {
    const currentForm = formRef.current;
    const currentStates = blockStatesRef.current;
    const currentHistory = versionHistoryRef.current;
    const newStates = { ...currentStates };
    newStates[fieldName] = {
      status: "approved",
      updated_at: new Date().toISOString(),
      source_type: "approved",
    };
    syncLocalState(currentForm, newStates, currentHistory);
    scheduleAutoSave(currentForm, newStates, currentHistory);
    toast.success(`${FIELD_LABELS[fieldName] || fieldName} aprobado`);
  };

  // ─── Dismiss stale ────────────────────────────────────────────────
  const dismissStale = (fieldName: string) => {
    const currentForm = formRef.current;
    const currentStates = blockStatesRef.current;
    const currentHistory = versionHistoryRef.current;
    const newStates = { ...currentStates };
    if (newStates[fieldName]) {
      newStates[fieldName] = {
        ...newStates[fieldName],
        status: "edited",
        stale_reason: undefined,
      };
    }
    syncLocalState(currentForm, newStates, currentHistory);
    scheduleAutoSave(currentForm, newStates, currentHistory);
  };

  // ─── Regenerate single field ──────────────────────────────────────
  const regenerateField = async (fieldName: string) => {
    const currentForm = formRef.current;
    const currentStates = blockStatesRef.current;
    const currentHistory = versionHistoryRef.current;
    setRegeneratingField(fieldName);
    try {
      const data = await invokeEdgeFunction<{ value?: string } & AIStableEnvelope>("generate-episode-fields", {
        mode: "regenerate_field",
        field_name: fieldName,
        idea_principal: currentForm.idea_principal,
        episode_number: episode.number,
        current_fields: {
          working_title: currentForm.working_title,
          theme: currentForm.theme,
          core_thesis: currentForm.core_thesis,
          summary: currentForm.summary,
          hook: currentForm.hook,
          cta: currentForm.cta,
          quote: currentForm.quote,
          descripcion_spotify: currentForm.descripcion_spotify,
        },
      }, { timeoutMs: 60_000 });

      if (data?.status === "failed" || data?.status === "degraded") {
        throw new Error(data.message || "No se pudo regenerar el campo");
      }
      if (!data?.value) throw new Error("No value returned");

      // Save current to history
       let newHistory = { ...currentHistory };
       const currentFieldValue = currentForm[fieldName as keyof FormFields];
       if (currentFieldValue && typeof currentFieldValue === "string") {
         newHistory = addVersionEntry(newHistory, fieldName, currentFieldValue, currentStates[fieldName]?.source_type || "initial");
       }

       const newForm = { ...currentForm, [fieldName]: data.value };
       const newStates = { ...currentStates };
       newStates[fieldName] = {
         status: "generated",
         updated_at: new Date().toISOString(),
         source_type: "ai_regenerated",
       };

       syncLocalState(newForm, newStates, newHistory);
       scheduleAutoSave(newForm, newStates, newHistory);
       toast.success(`${FIELD_LABELS[fieldName] || fieldName} regenerado`);
    } catch (e: unknown) {
      showEdgeFunctionError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setRegeneratingField(null);
    }
  };

  // ─── Restore version ─────────────────────────────────────────────
  const restoreVersion = (fieldName: string, entry: VersionEntry) => {
    const currentHistory = versionHistoryRef.current;
    const newForm = { ...formRef.current, [fieldName]: entry.value };
    const newStates = { ...blockStatesRef.current };
    newStates[fieldName] = {
      status: "edited",
      updated_at: new Date().toISOString(),
      source_type: "edited",
    };
    syncLocalState(newForm, newStates, currentHistory);
    scheduleAutoSave(newForm, newStates, currentHistory);
    toast.success(`${FIELD_LABELS[fieldName] || fieldName} restaurado`);
  };

  // ─── Generate options (3) for a single field ─────────────────
  const generateOptions = async (fieldName: string) => {
    const currentForm = formRef.current;
    setGeneratingOptionsFor(fieldName);
    try {
      const data = await invokeEdgeFunction<{ options: BlockOption[] } & AIStableEnvelope>("generate-episode-fields", {
        mode: "generate_options",
        field_name: fieldName,
        idea_principal: currentForm.idea_principal,
        episode_number: episode.number,
        count: 3,
        current_fields: {
          working_title: currentForm.working_title,
          theme: currentForm.theme,
          core_thesis: currentForm.core_thesis,
          summary: currentForm.summary,
          hook: currentForm.hook,
          cta: currentForm.cta,
          quote: currentForm.quote,
          descripcion_spotify: currentForm.descripcion_spotify,
        },
      }, { timeoutMs: 60_000 });
      if (data?.status === "failed" || data?.status === "degraded") {
        throw new Error(data.message || "No se pudieron generar opciones");
      }
      if (!data?.options?.length) throw new Error("No options returned");
      setFieldOptions((prev) => ({ ...prev, [fieldName]: data.options }));
    } catch (e: unknown) {
      showEdgeFunctionError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setGeneratingOptionsFor(null);
    }
  };

  // ─── Apply a chosen option ────────────────────────────────────
  const applyOption = (fieldName: string, value: string) => {
    const currentForm = formRef.current;
    const currentStates = blockStatesRef.current;
    let newHistory = { ...versionHistoryRef.current };
    const currentValue = currentForm[fieldName as keyof FormFields];
    if (currentValue && typeof currentValue === "string") {
      newHistory = addVersionEntry(newHistory, fieldName, currentValue, currentStates[fieldName]?.source_type || "initial");
    }
    const newForm = { ...currentForm, [fieldName]: value };
    const newStates = { ...currentStates };
    newStates[fieldName] = { status: "generated", updated_at: new Date().toISOString(), source_type: "ai_regenerated" };
    syncLocalState(newForm, newStates, newHistory);
    setFieldOptions((prev) => ({ ...prev, [fieldName]: [] }));
    scheduleAutoSave(newForm, newStates, newHistory);
    toast.success(`${FIELD_LABELS[fieldName] || fieldName} aplicado`);
  };

  // ─── Dismiss options panel ────────────────────────────────────
  const dismissOptions = (fieldName: string) => {
    setFieldOptions((prev) => ({ ...prev, [fieldName]: [] }));
  };

  // ─── Generate ALL 8 base fields at once ──────────────────────
  const generateAll = async () => {
    const currentForm = formRef.current;
    const currentStates = blockStatesRef.current;
    const currentHistory = versionHistoryRef.current;
    if (!currentForm.idea_principal.trim()) {
      toast.error("Agrega una idea principal al episodio antes de generar todos los campos");
      return;
    }
    setGeneratingAll(true);
    try {
      const data = await invokeEdgeFunction<{ fields: Record<string, string> } & AIStableEnvelope>("generate-episode-fields", {
        idea_principal: currentForm.idea_principal,
        episode_number: episode.number,
        conflicto_central: (episode as Record<string, unknown>).conflicto_central,
        intencion_del_episodio: (episode as Record<string, unknown>).intencion_del_episodio,
      }, { timeoutMs: 60_000 });
      if (data?.status === "failed" || data?.status === "degraded") {
        throw new Error(data.message || "No se pudieron generar los campos");
      }
      if (!data?.fields) throw new Error("No fields returned");

      let newHistory = { ...currentHistory };
      const newForm = { ...currentForm };
      const newStates = { ...currentStates };
      const now = new Date().toISOString();

      for (const fieldName of BASE_FIELDS) {
        const value = data.fields[fieldName];
        if (value) {
          const currentValue = newForm[fieldName as keyof FormFields];
          if (currentValue && typeof currentValue === "string") {
            newHistory = addVersionEntry(newHistory, fieldName, currentValue, newStates[fieldName]?.source_type || "initial");
          }
          (newForm as Record<string, unknown>)[fieldName] = value;
          newStates[fieldName] = { status: "generated", updated_at: now, source_type: "ai_generated" };
        }
      }

      syncLocalState(newForm, newStates, newHistory);
      scheduleAutoSave(newForm, newStates, newHistory);
      toast.success("Todos los campos generados");
    } catch (e: unknown) {
      showEdgeFunctionError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setGeneratingAll(false);
    }
  };

  // ─── Manual save ──────────────────────────────────────────────────
  const handleSave = async () => {
    const currentForm = formRef.current;
    const currentStates = blockStatesRef.current;
    const currentHistory = versionHistoryRef.current;
    const payload = buildSavePayload(currentForm, currentStates, currentHistory);
    try {
      await onSave(payload);
      lastSavedRef.current = JSON.stringify(payload);
      toast.success("Episodio actualizado");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error al guardar");
    }
  };

  const staleCount = countStaleBlocks(blockStates);

  // Helper to render a block-wrapped field
  const renderBlock = (fieldName: string, children: ReactNode) => (
    <BlockWrapper
      fieldName={fieldName}
      state={blockStates[fieldName]}
      onRegenerate={() => regenerateField(fieldName)}
      onApprove={() => approveBlock(fieldName)}
      onDismissStale={() => dismissStale(fieldName)}
      onRestoreVersion={(entry) => restoreVersion(fieldName, entry)}
      isRegenerating={regeneratingField === fieldName}
      versionHistory={versionHistory[fieldName] || []}
      options={fieldOptions[fieldName] || []}
      onGenerateOptions={() => generateOptions(fieldName)}
      onApplyOption={(value) => applyOption(fieldName, value)}
      onDismissOptions={() => dismissOptions(fieldName)}
      isGeneratingOptions={generatingOptionsFor === fieldName}
    >
      {children}
    </BlockWrapper>
  );

  return (
    <div className="space-y-6">
      {/* Header with save status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {autoSaveStatus === "saving" && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />Guardando...
            </span>
          )}
          {autoSaveStatus === "saved" && (
            <span className="text-xs text-emerald-500 flex items-center gap-1">
              <Check className="h-3 w-3" />Guardado
            </span>
          )}
          {staleCount > 0 && (
            <span className="text-xs text-orange-500 flex items-center gap-1 animate-pulse">
              <AlertTriangle className="h-3 w-3" />{staleCount} bloque{staleCount > 1 ? "s" : ""} desactualizado{staleCount > 1 ? "s" : ""}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={generateAll}
            disabled={generatingAll || !!regeneratingField}
            className="text-violet-600 border-violet-500/30 hover:bg-violet-500/10"
          >
            {generatingAll ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wand2 className="h-4 w-4 mr-2" />}
            Regenerar TODO
          </Button>
          <Button onClick={handleSave} disabled={isSaving} size="sm">
            {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Guardar
          </Button>
        </div>
      </div>

      {/* Stale banner with global regen */}
      {staleCount > 0 && (
        <div className="bg-orange-500/5 border border-orange-500/20 rounded-lg p-3 flex items-center justify-between">
          <p className="text-sm text-orange-600">
            {staleCount} bloque{staleCount > 1 ? "s" : ""} desactualizado{staleCount > 1 ? "s" : ""}. Revisa o regenera.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="text-xs border-orange-500/30 text-orange-600"
            onClick={async () => {
              const fields = getStaleFields(blockStates);
              for (const f of fields) {
                if ((BASE_FIELDS as readonly string[]).includes(f)) {
                  await regenerateField(f);
                }
              }
            }}
            disabled={!!regeneratingField}
          >
            <RefreshCw className={`h-3 w-3 mr-1 ${regeneratingField ? "animate-spin" : ""}`} />
            Regenerar todo
          </Button>
        </div>
      )}

      {/* Identificación */}
      <div className="surface p-5 space-y-4">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Identificación</p>
        <div className="grid grid-cols-2 gap-4">
          <div><Label>Número *</Label><Input value={form.number} onChange={(e) => update("number", e.target.value)} placeholder="01" className="font-mono" /></div>
          <div>
            <Label>Nivel de completitud</Label>
            <Select value={form.nivel_completitud} onValueChange={(v) => update("nivel_completitud", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="A">A — Completo</SelectItem>
                <SelectItem value="B">B — Casi listo</SelectItem>
                <SelectItem value="C">C — En progreso</SelectItem>
                <SelectItem value="D">D — Idea</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        {renderBlock("working_title",
          <Input value={form.working_title} onChange={(e) => update("working_title", e.target.value)} />
        )}
        <div>
          <Label>Idea principal *</Label>
          <Textarea
            value={form.idea_principal}
            onChange={(e) => update("idea_principal", e.target.value)}
            rows={3}
            placeholder="Describe la idea principal del episodio"
          />
        </div>
        <div><Label>Título final</Label><Input value={form.final_title} onChange={(e) => update("final_title", e.target.value)} /></div>
        <div><Label>Título original (si cambió)</Label><Input value={form.titulo_original} onChange={(e) => update("titulo_original", e.target.value)} /></div>
      </div>

      {/* Contenido */}
      <div className="surface p-5 space-y-4">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Contenido</p>
        <div>
          <Label>Idea principal *</Label>
          <Textarea
            value={form.idea_principal}
            onChange={(e) => update("idea_principal", e.target.value)}
            rows={2}
            placeholder="Ej: la diferencia entre soltar y rendirse"
          />
        </div>
        {renderBlock("theme",
          <Input value={form.theme} onChange={(e) => update("theme", e.target.value)} />
        )}
        {renderBlock("core_thesis",
          <Textarea value={form.core_thesis} onChange={(e) => update("core_thesis", e.target.value)} rows={2} placeholder="La idea central que sostiene el episodio" />
        )}
        {renderBlock("summary",
          <Textarea value={form.summary} onChange={(e) => update("summary", e.target.value)} rows={3} />
        )}
        {renderBlock("hook",
          <Textarea value={form.hook} onChange={(e) => update("hook", e.target.value)} rows={2} placeholder="Frase de apertura" />
        )}
        {renderBlock("cta",
          <Textarea value={form.cta} onChange={(e) => update("cta", e.target.value)} rows={2} placeholder="Llamada a la acción" />
        )}
        {renderBlock("quote",
          <Input value={form.quote} onChange={(e) => update("quote", e.target.value)} placeholder="Frase destacable del episodio" />
        )}
      </div>

      {/* Distribución */}
      <div className="surface p-5 space-y-4">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Distribución</p>
        {renderBlock("descripcion_spotify",
          <Textarea value={form.descripcion_spotify} onChange={(e) => update("descripcion_spotify", e.target.value)} rows={3} />
        )}
        <div><Label>Link Spotify</Label><Input value={form.link_spotify} onChange={(e) => update("link_spotify", e.target.value)} placeholder="https://open.spotify.com/episode/..." /></div>
        <div className="grid grid-cols-2 gap-4">
          <div><Label>Fecha de lanzamiento</Label><Input type="date" value={form.release_date} onChange={(e) => update("release_date", e.target.value)} /></div>
          <div><Label>Duración</Label><Input value={form.duration} onChange={(e) => update("duration", e.target.value)} placeholder="45:00" /></div>
        </div>
        <div className="flex items-center gap-3">
          <Switch checked={form.fecha_es_estimada} onCheckedChange={(v) => update("fecha_es_estimada", v)} />
          <Label className="text-sm">Fecha estimada</Label>
        </div>
      </div>

      {/* Validación */}
      <div className="surface p-5 space-y-4">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Validación y Trazabilidad</p>
        <div><Label>Nota de trazabilidad *</Label><Textarea value={form.nota_trazabilidad} onChange={(e) => update("nota_trazabilidad", e.target.value)} rows={2} placeholder="Origen de la idea, decisiones editoriales..." /></div>
        <div className="flex items-center gap-3">
          <Switch checked={form.conflicto_detectado} onCheckedChange={(v) => update("conflicto_detectado", v)} />
          <Label className="text-sm">Conflicto detectado</Label>
        </div>
        {form.conflicto_detectado && (
          <div><Label>Nota de conflicto</Label><Input value={form.conflicto_nota} onChange={(e) => update("conflicto_nota", e.target.value)} placeholder="Ej: tema repetido con EP.12" /></div>
        )}
      </div>
    </div>
  );
}
