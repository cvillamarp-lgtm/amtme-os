import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Plus,
  Download,
  Factory,
  ChevronDown,
  Loader2,
  Sparkles,
  Trash2,
  ArrowLeft,
  RefreshCw,
  Check,
  Pencil,
  History,
} from "lucide-react";
import { TruncatedText } from "@/components/ui/text-clamp";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { invokeEdgeFunction } from "@/services/functions/invokeEdgeFunction";
import { isAuthError, showEdgeFunctionError } from "@/services/functions/edgeFunctionErrors";
import { toast } from "sonner";
import { useEpisodes } from "@/hooks/useEpisode";
import { auditEpisode, getCompletenessLevel } from "@/lib/episode-validation";
import { initBlockStatesFromAI } from "@/lib/block-states";
import {
  useEpisodeDraft,
  saveModalUIState,
  loadModalUIState,
  clearModalUIState,
  type ModalUIState,
} from "@/hooks/useEpisodeDraft";
import type { ConflictOption } from "@/hooks/useEpisodeDraft";
import { useSessionRecovery } from "@/hooks/useSessionRecovery";
import { SessionExpiredDialog } from "@/components/SessionExpiredDialog";
import type { Json } from "@/integrations/supabase/types";
import { useSmartTable } from "@/hooks/useSmartTable";
import {
  ListingToolbar,
  FiltersPanel,
  ViewsTabs,
  BulkActionsBar,
  SmartEmptyState,
} from "@/components/smart-table";
import type { FilterDef, SortOption, SavedView } from "@/components/smart-table";

// ─── Config ────────────────────────────────────────────────────────────────

const EPISODE_COLUMNS = [
  { id: "number", label: "Ep.", sortable: true, visible: true },
  {
    id: "title",
    label: "Título",
    sortable: true,
    visible: true,
    getValue: (e: any) => e.working_title || e.title || "",
  },
  { id: "theme", label: "Tema", sortable: true, visible: true },
  { id: "health_score", label: "Salud", sortable: true, visible: true },
  { id: "status", label: "Estado", sortable: true, visible: true },
  { id: "nivel_completitud", label: "Nivel", sortable: true, visible: false },
  { id: "release_date", label: "Fecha", sortable: true, visible: false },
  { id: "updated_at", label: "Actualizado", sortable: true, visible: false },
];

const EPISODE_SORT_OPTIONS: SortOption[] = [
  { value: "number", label: "Número" },
  { value: "title", label: "Título" },
  { value: "theme", label: "Tema" },
  { value: "health_score", label: "Salud" },
  { value: "status", label: "Estado" },
  { value: "updated_at", label: "Actualizado" },
];

const EPISODE_FILTER_DEFS: FilterDef[] = [
  {
    field: "status",
    label: "Estado",
    type: "select",
    options: [
      { value: "draft", label: "Borrador" },
      { value: "recording", label: "Grabando" },
      { value: "editing", label: "En edición" },
      { value: "published", label: "Publicado" },
    ],
  },
  {
    field: "nivel_completitud",
    label: "Nivel de completitud",
    type: "select",
    options: [
      { value: "A", label: "A — Completo" },
      { value: "B", label: "B" },
      { value: "C", label: "C" },
      { value: "D", label: "D — Básico" },
    ],
  },
  {
    field: "health_score",
    label: "Salud (%)",
    type: "number_range",
    min: 0,
    max: 100,
  },
];

const EPISODE_DEFAULT_VIEWS: SavedView[] = [];

// ─── Types ────────────────────────────────────────────────────────────────────

interface GeneratedOptions {
  conflicto_central: ConflictOption[];
  intencion: ConflictOption[];
}

// ─── Option Card ──────────────────────────────────────────────────────────────

const TYPE_STYLES: Record<string, { badge: string; ring: string }> = {
  emocional_interno: {
    badge: "bg-orange-500/15 text-orange-400",
    ring: "border-orange-400/60 bg-orange-500/5",
  },
  relacional_vincular: {
    badge: "bg-rose-500/15 text-rose-400",
    ring: "border-rose-400/60 bg-rose-500/5",
  },
  identitario_existencial: {
    badge: "bg-purple-500/15 text-purple-400",
    ring: "border-purple-400/60 bg-purple-500/5",
  },
  insight: { badge: "bg-blue-500/15 text-blue-400", ring: "border-blue-400/60 bg-blue-500/5" },
  validacion: { badge: "bg-teal-500/15 text-teal-400", ring: "border-teal-400/60 bg-teal-500/5" },
  transformacion: {
    badge: "bg-emerald-500/15 text-emerald-400",
    ring: "border-emerald-400/60 bg-emerald-500/5",
  },
};

function OptionCard({
  option,
  selected,
  onSelect,
}: {
  option: ConflictOption;
  selected: boolean;
  onSelect: () => void;
}) {
  const styles = TYPE_STYLES[option.tipo] ?? {
    badge: "bg-secondary text-muted-foreground",
    ring: "border-primary/60 bg-primary/5",
  };
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full text-left p-4 rounded-xl border-2 transition-all space-y-2 ${
        selected
          ? styles.ring + " border-2"
          : "border-border hover:border-primary/30 hover:bg-secondary/40"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className={`text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${styles.badge}`}
        >
          {option.label}
        </span>
        {selected && (
          <span className="shrink-0 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
            <Check className="w-2.5 h-2.5 text-primary-foreground" />
          </span>
        )}
      </div>
      <p className="text-sm font-medium text-foreground leading-snug">{option.texto}</p>
      <p className="text-xs text-muted-foreground leading-relaxed">{option.ayuda}</p>
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Episodes() {
  const { draft, saveDraft, loadActiveDraft, markConverted } = useEpisodeDraft();
  const draftLoaded = useRef(false);

  const [open, setOpen] = useState(false);
  const [generatingOptions, setGeneratingOptions] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [manualConflicto, setManualConflicto] = useState("");
  const [manualIntencion, setManualIntencion] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasDraftToRestore, setHasDraftToRestore] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const sessionRecovery = useSessionRecovery();
  const { data: episodes = [], isLoading } = useEpisodes();

  const table = useSmartTable({
    data: episodes as any[],
    columns: EPISODE_COLUMNS,
    searchFields: ["title", "number", "theme", "working_title"],
    defaultSort: [{ field: "number", direction: "desc" }],
    defaultViews: EPISODE_DEFAULT_VIEWS,
    persistKey: "amtme:list:episodes:v1",
    pageSize: 50,
    defaultViewType: "table",
  });

  useEffect(() => {
    if (!open) return;
    if (draftLoaded.current) return;
    draftLoaded.current = true;

    loadActiveDraft().then((loaded) => {
      if (loaded.id) {
        const hasContent = !!loaded.idea_principal;
        const hasOptions = !!loaded.conflict_options_json;
        if (hasOptions) {
          setHasDraftToRestore(true);
          toast.info("Borrador restaurado — continuás desde donde lo dejaste", {
            icon: <History className="w-4 h-4" />,
          });
        } else if (hasContent) {
          setHasDraftToRestore(true);
        }
        if (loaded.selected_conflicto) {
          setManualConflicto(loaded.selected_conflicto.texto ?? "");
        }
        if (loaded.selected_intencion) {
          setManualIntencion(loaded.selected_intencion.texto ?? "");
        }
      }
    });
  }, [open, loadActiveDraft]);

  useEffect(() => {
    if (!open) {
      draftLoaded.current = false;
      setHasDraftToRestore(false);
    }
  }, [open]);

  // Restore modal UI state and reopen after successful login
  useEffect(() => {
    if (!sessionRecovery.showLoginRequired && sessionRecovery.pending) {
      const modalUIState = loadModalUIState();
      if (modalUIState) {
        // Restore UI state
        setGeneratingOptions(modalUIState.generatingOptions ?? false);
        setAdvancedOpen(modalUIState.advancedOpen ?? false);
        setManualMode(modalUIState.manualMode ?? false);
        if (modalUIState.manualConflicto) setManualConflicto(modalUIState.manualConflicto);
        if (modalUIState.manualIntencion) setManualIntencion(modalUIState.manualIntencion);
        // Reopen modal
        setOpen(true);
      }
    }
  }, [sessionRecovery.showLoginRequired, sessionRecovery.pending]);

  const conflictOptions = draft.conflict_options_json as GeneratedOptions | null;
  const finalConflicto = manualMode ? manualConflicto : (draft.selected_conflicto?.texto ?? "");
  const finalIntencion = manualMode ? manualIntencion : (draft.selected_intencion?.texto ?? "");

  const resetForm = async () => {
    draftLoaded.current = false;
    setAdvancedOpen(false);
    setGeneratingOptions(false);
    setManualMode(false);
    setManualConflicto("");
    setManualIntencion("");
    setHasDraftToRestore(false);
    await saveDraft(
      {
        idea_principal: "",
        tono: "íntimo",
        restricciones: "",
        release_date: "",
        conflict_options_json: null,
        selected_conflicto: null,
        selected_intencion: null,
        step: 1,
      },
      { immediate: true }
    );
  };

  const generateOptions = async () => {
    if (!draft.idea_principal.trim()) return;
    setGeneratingOptions(true);
    try {
      const data = await invokeEdgeFunction<{ options?: ConflictOption[] }>(
        "generate-conflict-options",
        { idea_principal: draft.idea_principal, tono: draft.tono || "íntimo" }
      );
      if (data?.options) {
        await saveDraft(
          {
            conflict_options_json: data.options,
            selected_conflicto: null,
            selected_intencion: null,
            step: 2,
          },
          { immediate: true }
        );
        setManualMode(false);
      }
    } catch (e) {
      if (isAuthError(e)) {
        // Auth errors must NOT fall into manual-mode — user needs to re-authenticate first
        showEdgeFunctionError(e);
        return;
      }
      const msg = e instanceof Error ? e.message : "Error al generar opciones";
      if (msg.toLowerCase().includes("api key") || msg.toLowerCase().includes("not configured")) {
        toast.warning("IA no disponible. Puedes escribir el conflicto manualmente.");
      } else {
        toast.error(`${msg} — puedes continuar manualmente.`);
      }
      setManualMode(true);
      await saveDraft({ step: 2 }, { immediate: true });
    } finally {
      setGeneratingOptions(false);
    }
  };

  const doCreateEpisode = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("No autenticado");

    const { data: numData, error: numError } = await supabase.rpc("next_episode_number", {
      p_user_id: user.id,
    });
    if (numError) throw numError;
    if (typeof numData !== "string")
      throw new Error("next_episode_number returned unexpected type");
    const nextNumber = numData;

    const { data: episode, error: insertError } = await supabase
      .from("episodes")
      .insert({
        user_id: user.id,
        title: draft.idea_principal.slice(0, 100),
        idea_principal: draft.idea_principal,
        conflicto_central: finalConflicto || null,
        intencion_del_episodio: finalIntencion || null,
        selected_conflicto_tipo: draft.selected_conflicto?.tipo ?? null,
        selected_intencion_tipo: draft.selected_intencion?.tipo ?? null,
        tono: draft.tono || "íntimo",
        restricciones: draft.restricciones || null,
        release_date: draft.release_date || null,
        fecha_es_estimada: !!draft.release_date,
        status: "draft",
        estado_produccion: "draft",
        nivel_completitud: "D",
        number: nextNumber,
      })
      .select("id")
      .single();
    if (insertError) throw insertError;

    setIsGenerating(true);
    try {
      const fnData = await invokeEdgeFunction<{
        fields?: Record<string, string>;
        metadata?: unknown;
      }>(
        "generate-episode-fields",
        {
          idea_principal: draft.idea_principal,
          conflicto_central: finalConflicto || undefined,
          intencion_del_episodio: finalIntencion || undefined,
          tono: draft.tono || "íntimo",
          restricciones: draft.restricciones || undefined,
          episode_number: nextNumber,
        },
        { timeoutMs: 60_000 }
      );

      if (fnData?.fields) {
        const fields = fnData.fields;
        const { error: updateError } = await supabase
          .from("episodes")
          .update({
            working_title: fields.working_title || null,
            theme: fields.theme || null,
            core_thesis: fields.core_thesis || null,
            summary: fields.summary || null,
            hook: fields.hook || null,
            cta: fields.cta || null,
            quote: fields.quote || null,
            descripcion_spotify: fields.descripcion_spotify || null,
            title: fields.working_title || draft.idea_principal.slice(0, 100),
            generation_metadata: (fnData.metadata ?? null) as Json | null,
            block_states: initBlockStatesFromAI() as unknown as Json,
          })
          .eq("id", episode.id);
        if (updateError) {
          // Silently skip AI fields if update fails; episode core is already created
        }

        const session = await supabase.auth.getSession();
        const userId = session.data.session?.user?.id;
        if (userId) {
          const aiFields = [
            "working_title",
            "theme",
            "core_thesis",
            "summary",
            "hook",
            "cta",
            "quote",
            "descripcion_spotify",
          ];
          const historyRows = aiFields
            .filter((f) => fields[f])
            .map((f) => ({
              user_id: userId,
              table_name: "episodes",
              record_id: episode.id,
              field_name: f,
              old_value: null,
              new_value: String(fields[f]),
              change_origin: "ai",
            }));
          if (historyRows.length > 0) {
            supabase
              .from("change_history")
              .insert(historyRows)
              .then(() => {})
              .catch(() => {});
          }
        }
      }
    } catch (aiError) {
      // AI generation is optional; continue with episode creation
      toast.warning("Episodio creado. Los campos se pueden generar desde el workspace.");
    } finally {
      setIsGenerating(false);
    }

    await markConverted(episode.id);

    return episode;
  };

  const createEpisode = useMutation({
    mutationFn: doCreateEpisode,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["episodes"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-counts-v2"] });
      sessionRecovery.clearRecoveryState();
      clearModalUIState();
      setOpen(false);
      resetForm();
      toast.success("Episodio creado");
      if (data?.id) navigate(`/episodes/${data.id}`);
    },
    onError: (e) => {
      const error = e as Error;
      if (isAuthError(e)) {
        // Guard against infinite recovery loops
        if (sessionRecovery.recovering) {
          showEdgeFunctionError(e);
          return;
        }
        // Save modal state before attempting recovery
        saveModalUIState({
          generatingOptions,
          advancedOpen,
          manualMode,
          manualConflicto,
          manualIntencion,
        });
        // Trigger session recovery with retry capability
        sessionRecovery.handleAuthError({
          name: "createEpisode",
          execute: async () => {
            // Create a new mutation to avoid infinite loop
            return doCreateEpisode();
          },
          onError: (recoveryError) => toast.error(recoveryError.message),
        });
        return;
      }
      toast.error(error.message);
    },
  });

  const deleteEpisode = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("episodes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["episodes"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-counts-v2"] });
      toast.success("Episodio eliminado");
    },
    onError: (e) => {
      if (isAuthError(e)) {
        showEdgeFunctionError(e);
        return;
      }
      toast.error((e as Error).message);
    },
  });

  const exportCSV = () => {
    const selectedEpisodes =
      table.selectedIds.size > 0
        ? (episodes as any[]).filter((ep: any) => table.selectedIds.has(ep.id))
        : table.filtered;

    if (!selectedEpisodes.length) return;
    const headers = [
      "number",
      "title",
      "theme",
      "status",
      "nivel_completitud",
      "release_date",
      "health_score",
    ];
    const rows = selectedEpisodes.map((ep: any) =>
      headers.map((h) => {
        const val = ep[h];
        return val === null || val === undefined ? "" : String(val).replace(/"/g, '""');
      })
    );
    const csv = [
      headers.join(","),
      ...rows.map((r: string[]) => r.map((v) => `"${v}"`).join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "episodios.csv";
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success("CSV exportado");
  };

  const statusLabel = (s: string | null) => {
    switch (s) {
      case "published":
        return "Publicado";
      case "recording":
        return "Grabando";
      case "editing":
        return "En edición";
      default:
        return "Borrador";
    }
  };

  const isPending = createEpisode.isPending || isGenerating;

  return (
    <div className="p-6 lg:p-8 h-full flex flex-col animate-fade-in gap-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="page-title">Episodios</h1>
          <p className="page-subtitle">
            Fuente de verdad. Haz click en un episodio para abrir su Workspace.
          </p>
        </div>
      </div>

      <BulkActionsBar
        selectedCount={table.selectedIds.size}
        totalCount={table.filteredCount}
        onSelectAll={table.selectAll}
        onClearSelection={table.clearSelection}
        isAllSelected={table.isAllSelected}
        isIndeterminate={table.isIndeterminate}
        actions={[
          {
            label: "Exportar CSV",
            icon: <Download className="h-3.5 w-3.5" />,
            onClick: exportCSV,
          },
          {
            label: "Archivar",
            onClick: () => toast.info("Próximamente"),
          },
        ]}
      />

      <ListingToolbar
        searchQuery={table.searchQuery}
        onSearchChange={table.setSearchQuery}
        searchPlaceholder="Buscar por título, número o tema..."
        sortOptions={EPISODE_SORT_OPTIONS}
        currentSort={table.currentSort}
        onSortChange={table.setSortRule}
        filters={table.filters}
        onClearFilters={table.clearFilters}
        onRemoveFilter={table.removeFilter}
        totalCount={table.totalCount}
        filteredCount={table.filteredCount}
        filtersOpen={filtersOpen}
        onFiltersToggle={() => setFiltersOpen((v) => !v)}
        showViewToggle={false}
      >
        <Button
          variant="outline"
          onClick={exportCSV}
          disabled={!(episodes as any[]).length}
          size="sm"
        >
          <Download className="h-4 w-4 mr-2" />
          CSV
        </Button>
        <Dialog
          open={open}
          onOpenChange={(v) => {
            setOpen(v);
            if (!v) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Episodio
            </Button>
          </DialogTrigger>

          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center gap-3">
                {draft.step === 2 && (
                  <button
                    onClick={() => saveDraft({ step: 1 }, { immediate: true })}
                    className="p-1 rounded-md hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                )}
                <div>
                  <DialogTitle>
                    {draft.step === 1 ? "Nuevo episodio" : "Elige el enfoque"}
                  </DialogTitle>
                  {draft.step === 2 && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                      "{draft.idea_principal}"
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 ml-auto">
                  <div
                    className={`h-1.5 w-8 rounded-full transition-colors ${draft.step >= 1 ? "bg-primary" : "bg-border"}`}
                  />
                  <div
                    className={`h-1.5 w-8 rounded-full transition-colors ${draft.step >= 2 ? "bg-primary" : "bg-border"}`}
                  />
                </div>
              </div>
            </DialogHeader>

            {draft.step === 1 && (
              <div className="space-y-5 pt-1">
                {hasDraftToRestore && (
                  <div className="flex items-center gap-2 text-xs text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                    <History className="w-3.5 h-3.5 shrink-0" />
                    <span>Borrador en progreso restaurado automáticamente.</span>
                    <button className="ml-auto underline hover:text-amber-400" onClick={resetForm}>
                      Empezar de nuevo
                    </button>
                  </div>
                )}

                <div>
                  <Label className="text-sm font-medium">
                    Idea principal <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    value={draft.idea_principal}
                    onChange={(e) => saveDraft({ idea_principal: e.target.value })}
                    placeholder="Ej: la diferencia entre soltar y rendirse"
                    rows={3}
                    className="mt-1.5"
                    disabled={generatingOptions}
                  />
                  <p className="text-xs text-muted-foreground mt-1.5">
                    A partir de esta idea se generarán 3 opciones de conflicto y 3 de intención.
                  </p>
                </div>

                <div>
                  <Label className="text-sm">Tono del episodio</Label>
                  <Select
                    value={draft.tono || "íntimo"}
                    onValueChange={(v) => saveDraft({ tono: v })}
                    disabled={generatingOptions}
                  >
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="íntimo">Íntimo — como un amigo honesto</SelectItem>
                      <SelectItem value="confrontador">
                        Confrontador — verdad directa e incómoda
                      </SelectItem>
                      <SelectItem value="reflexivo">Reflexivo — espacio para pensar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-between text-muted-foreground hover:text-foreground"
                    >
                      Opciones adicionales
                      <ChevronDown
                        className={`h-4 w-4 transition-transform ${advancedOpen ? "rotate-180" : ""}`}
                      />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-4 pt-3">
                    <div>
                      <Label className="text-sm">Fecha estimada de lanzamiento</Label>
                      <Input
                        type="date"
                        value={draft.release_date}
                        onChange={(e) => saveDraft({ release_date: e.target.value })}
                        className="mt-1.5"
                        disabled={generatingOptions}
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Restricciones del episodio</Label>
                      <Textarea
                        value={draft.restricciones}
                        onChange={(e) => saveDraft({ restricciones: e.target.value })}
                        placeholder="Ej: no mencionar religión organizada, enfocarse en relaciones de pareja"
                        rows={2}
                        className="mt-1.5"
                        disabled={generatingOptions}
                      />
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                <Button
                  onClick={generateOptions}
                  className="w-full"
                  disabled={!draft.idea_principal.trim() || generatingOptions}
                >
                  {generatingOptions ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generando opciones...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generar 3 opciones de conflicto e intención
                    </>
                  )}
                </Button>
              </div>
            )}

            {draft.step === 2 && (
              <div className="space-y-6 pt-1">
                {conflictOptions && !manualMode ? (
                  <>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-foreground">
                          ⚡ Conflicto central
                          <span className="text-xs font-normal text-muted-foreground ml-2">
                            Elige 1
                          </span>
                        </h3>
                        {draft.selected_conflicto && (
                          <span className="text-xs text-emerald-500 font-medium flex items-center gap-1">
                            <Check className="w-3 h-3" /> Seleccionado
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {conflictOptions.conflicto_central.map((opt) => (
                          <OptionCard
                            key={opt.tipo}
                            option={opt}
                            selected={draft.selected_conflicto?.tipo === opt.tipo}
                            onSelect={() =>
                              saveDraft({ selected_conflicto: opt }, { immediate: true })
                            }
                          />
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-foreground">
                          🎯 Intención del episodio
                          <span className="text-xs font-normal text-muted-foreground ml-2">
                            Elige 1
                          </span>
                        </h3>
                        {draft.selected_intencion && (
                          <span className="text-xs text-emerald-500 font-medium flex items-center gap-1">
                            <Check className="w-3 h-3" /> Seleccionada
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {conflictOptions.intencion.map((opt) => (
                          <OptionCard
                            key={opt.tipo}
                            option={opt}
                            selected={draft.selected_intencion?.tipo === opt.tipo}
                            onSelect={() =>
                              saveDraft({ selected_intencion: opt }, { immediate: true })
                            }
                          />
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 text-xs"
                        onClick={generateOptions}
                        disabled={generatingOptions || isPending}
                      >
                        {generatingOptions ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <RefreshCw className="h-3.5 w-3.5" />
                        )}
                        Regenerar opciones
                      </Button>
                      <button
                        className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors flex items-center gap-1"
                        onClick={() => {
                          setManualMode(true);
                          setManualConflicto(draft.selected_conflicto?.texto ?? "");
                          setManualIntencion(draft.selected_intencion?.texto ?? "");
                        }}
                      >
                        <Pencil className="w-3 h-3" />
                        Escribir manualmente
                      </button>
                      <div className="flex-1" />
                      <Button
                        onClick={() => createEpisode.mutate()}
                        disabled={
                          !draft.selected_conflicto || !draft.selected_intencion || isPending
                        }
                        className="gap-1.5"
                      >
                        {isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            {isGenerating ? "Generando episodio..." : "Creando..."}
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4" />
                            Crear episodio
                          </>
                        )}
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="space-y-4">
                    {manualMode && conflictOptions && (
                      <button
                        className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
                        onClick={() => setManualMode(false)}
                      >
                        ← Volver a las opciones generadas
                      </button>
                    )}

                    <div>
                      <Label className="text-sm font-medium">Conflicto central</Label>
                      <Textarea
                        value={manualConflicto}
                        onChange={(e) => setManualConflicto(e.target.value)}
                        placeholder="Ej: quieres intimidad pero cuando alguien realmente se acerca, te cierras"
                        rows={3}
                        className="mt-1.5 text-sm"
                        disabled={isPending}
                      />
                    </div>

                    <div>
                      <Label className="text-sm font-medium">Intención del episodio</Label>
                      <Textarea
                        value={manualIntencion}
                        onChange={(e) => setManualIntencion(e.target.value)}
                        placeholder="Ej: que el oyente entienda que no siempre se aferra por amor"
                        rows={3}
                        className="mt-1.5 text-sm"
                        disabled={isPending}
                      />
                    </div>

                    <div className="flex gap-3 pt-1">
                      {!conflictOptions && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={generateOptions}
                          disabled={generatingOptions || isPending}
                          className="gap-1.5 text-xs"
                        >
                          {generatingOptions ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Sparkles className="h-3.5 w-3.5" />
                          )}
                          Generar opciones de IA
                        </Button>
                      )}
                      <Button
                        onClick={() => createEpisode.mutate()}
                        disabled={isPending}
                        className="gap-1.5 flex-1"
                      >
                        {isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            {isGenerating ? "Generando episodio..." : "Creando..."}
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4" />
                            Crear episodio
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                {isGenerating && (
                  <p className="text-xs text-muted-foreground text-center animate-pulse">
                    La IA está generando título, hook, resumen, CTA, quote y descripción Spotify...
                  </p>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        <SessionExpiredDialog
          open={sessionRecovery.showLoginRequired && !sessionRecovery.recovering}
          onRetry={sessionRecovery.retryAfterLogin}
          onLoginComplete={() => setOpen(true)}
        />
      </ListingToolbar>

      <FiltersPanel
        open={filtersOpen}
        filterDefs={EPISODE_FILTER_DEFS}
        activeFilters={table.filters}
        onAddFilter={table.addFilter}
        onRemoveFilter={table.removeFilter}
        onClearAll={table.clearFilters}
      />

      <ViewsTabs
        views={table.views}
        activeViewId={table.activeViewId}
        onApplyView={table.applyView}
        onSaveView={table.saveView}
        onDeleteView={table.deleteView}
        onReset={table.resetToDefault}
      />

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse bg-muted rounded-lg" />
          ))}
        </div>
      ) : table.filteredCount === 0 ? (
        <SmartEmptyState
          filtered={table.filters.length > 0 || !!table.searchQuery}
          onClearFilters={table.clearFilters}
          title="No hay episodios aún"
          description="Crea tu primer episodio para empezar"
          action={
            <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Episodio
            </Button>
          }
        />
      ) : (
        <div className="surface flex-1 overflow-hidden flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-secondary/50 text-muted-foreground border-b border-border">
                <tr>
                  <th className="px-3 py-3 w-10">
                    <Checkbox
                      checked={table.isAllSelected}
                      onCheckedChange={() =>
                        table.isAllSelected ? table.clearSelection() : table.selectAll()
                      }
                    />
                  </th>
                  <th className="px-4 py-3 font-medium">Episodio</th>
                  <th className="px-4 py-3 font-medium">Tema</th>
                  <th className="px-4 py-3 font-medium">Salud</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium">Nivel</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {table.paginated.map((ep: any) => {
                  const audit = auditEpisode(ep);
                  const level = getCompletenessLevel(audit.healthScore);
                  return (
                    <tr
                      key={ep.id}
                      className={`surface-hover cursor-pointer group ${table.selectedIds.has(ep.id) ? "bg-primary/5" : ""}`}
                      onClick={() => navigate(`/episodes/${ep.id}`)}
                    >
                      <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={table.selectedIds.has(ep.id)}
                          onCheckedChange={() => table.toggleSelection(ep.id)}
                        />
                      </td>
                      <td className="px-4 py-3 max-w-[280px]">
                        <div className="flex flex-col min-w-0">
                          <TruncatedText className="font-medium text-foreground hover:text-primary transition-colors">
                            {ep.final_title || ep.working_title || ep.title}
                          </TruncatedText>
                          {ep.number && (
                            <span className="text-xs text-muted-foreground mt-0.5">
                              #{ep.number}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 max-w-[180px]">
                        <TruncatedText className="text-foreground">{ep.theme || "—"}</TruncatedText>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Progress value={audit.healthScore} className="h-1.5 w-16" />
                          <span className={`text-xs font-medium ${level.color}`}>
                            {audit.healthScore}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-muted-foreground">
                          {statusLabel(ep.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={`text-xs font-bold ${level.color}`}>
                          {level.nivel}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/factory?episode_id=${ep.id}`);
                            }}
                          >
                            <Factory className="h-3.5 w-3.5 mr-1" />
                            Producir
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-destructive opacity-0 group-hover:opacity-100 hover:bg-destructive/10"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (
                                confirm(
                                  `¿Eliminar "${ep.final_title || ep.working_title || ep.title}"? Esta acción no se puede deshacer.`
                                )
                              ) {
                                deleteEpisode.mutate(ep.id);
                              }
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {table.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <span className="text-xs text-muted-foreground">
                Página {table.currentPage + 1} de {table.totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.setCurrentPage(table.currentPage - 1)}
                  disabled={!table.hasPrevPage}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.setCurrentPage(table.currentPage + 1)}
                  disabled={!table.hasNextPage}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
