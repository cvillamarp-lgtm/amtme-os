import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Mic, Plus, Search, Download, Factory, ChevronDown, Loader2,
  Sparkles, Trash2, ArrowLeft, RefreshCw, Check, Pencil, History,
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useEpisodes } from "@/hooks/useEpisode";
import { auditEpisode, getCompletenessLevel } from "@/lib/episode-validation";
import { initBlockStatesFromAI } from "@/lib/block-states";
import { useEpisodeDraft } from "@/hooks/useEpisodeDraft";
import type { ConflictOption } from "@/hooks/useEpisodeDraft";

// ─── Types ────────────────────────────────────────────────────────────────────

interface GeneratedOptions {
  conflicto_central: ConflictOption[];
  intencion: ConflictOption[];
}

// ─── Option Card ──────────────────────────────────────────────────────────────

const TYPE_STYLES: Record<string, { badge: string; ring: string }> = {
  emocional_interno:       { badge: "bg-orange-500/15 text-orange-400",  ring: "border-orange-400/60 bg-orange-500/5" },
  relacional_vincular:     { badge: "bg-rose-500/15 text-rose-400",      ring: "border-rose-400/60 bg-rose-500/5" },
  identitario_existencial: { badge: "bg-purple-500/15 text-purple-400",  ring: "border-purple-400/60 bg-purple-500/5" },
  insight:                 { badge: "bg-blue-500/15 text-blue-400",      ring: "border-blue-400/60 bg-blue-500/5" },
  validacion:              { badge: "bg-teal-500/15 text-teal-400",      ring: "border-teal-400/60 bg-teal-500/5" },
  transformacion:          { badge: "bg-emerald-500/15 text-emerald-400",ring: "border-emerald-400/60 bg-emerald-500/5" },
};

function OptionCard({
  option, selected, onSelect,
}: {
  option: ConflictOption; selected: boolean; onSelect: () => void;
}) {
  const styles = TYPE_STYLES[option.tipo] ?? { badge: "bg-secondary text-muted-foreground", ring: "border-primary/60 bg-primary/5" };
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full text-left p-4 rounded-xl border-2 transition-all space-y-2 ${
        selected ? styles.ring + " border-2" : "border-border hover:border-primary/30 hover:bg-secondary/40"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${styles.badge}`}>
          {option.label}
        </span>
        {selected && (
          <span className="shrink-0 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
            <Check className="w-2.5 h-2.5 text-primary-foreground" />
          </span>
        )}
      </div>
      <p className="text-sm font-medium text-foreground leading-snug">{option.texto}</p>
      <p className="text-[11px] text-muted-foreground leading-relaxed">{option.ayuda}</p>
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Episodes() {
  // ── Draft persistence (DB-backed wizard state) ─────────────────────────────
  const { draft, saveDraft, loadActiveDraft, markConverted } = useEpisodeDraft();
  const draftLoaded = useRef(false);

  // ── UI-only state (not persisted) ──────────────────────────────────────────
  const [open, setOpen] = useState(false);
  const [generatingOptions, setGeneratingOptions] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [manualConflicto, setManualConflicto] = useState("");
  const [manualIntencion, setManualIntencion] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasDraftToRestore, setHasDraftToRestore] = useState(false);

  // ── List state ─────────────────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { data: episodes = [], isLoading } = useEpisodes();

  // ── On dialog open: load active draft from DB ──────────────────────────────
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
        // Restore manual fields if draft is in step 2 manually
        if (loaded.selected_conflicto) {
          setManualConflicto(loaded.selected_conflicto.texto ?? "");
        }
        if (loaded.selected_intencion) {
          setManualIntencion(loaded.selected_intencion.texto ?? "");
        }
      }
    });
  }, [open, loadActiveDraft]);

  // Reset draftLoaded when dialog closes so next open re-checks
  useEffect(() => {
    if (!open) {
      draftLoaded.current = false;
      setHasDraftToRestore(false);
    }
  }, [open]);

  // ── Derived state ──────────────────────────────────────────────────────────
  const conflictOptions = draft.conflict_options_json as GeneratedOptions | null;
  const finalConflicto = manualMode ? manualConflicto : (draft.selected_conflicto?.texto ?? "");
  const finalIntencion = manualMode ? manualIntencion : (draft.selected_intencion?.texto ?? "");

  // ── Helpers ────────────────────────────────────────────────────────────────
  const resetForm = async () => {
    draftLoaded.current = false;
    setAdvancedOpen(false);
    setGeneratingOptions(false);
    setManualMode(false);
    setManualConflicto("");
    setManualIntencion("");
    setHasDraftToRestore(false);
    await saveDraft({
      idea_principal: "",
      tono: "íntimo",
      restricciones: "",
      release_date: "",
      conflict_options_json: null,
      selected_conflicto: null,
      selected_intencion: null,
      step: 1,
    }, { immediate: true });
  };

  // ── Generate 3+3 options ───────────────────────────────────────────────────
  const generateOptions = async () => {
    if (!draft.idea_principal.trim()) return;
    setGeneratingOptions(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-conflict-options", {
        body: { idea_principal: draft.idea_principal, tono: draft.tono || "íntimo" },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      if (data?.options) {
        // Persist generated options to DB immediately
        await saveDraft(
          { conflict_options_json: data.options, selected_conflicto: null, selected_intencion: null, step: 2 },
          { immediate: true }
        );
        setManualMode(false);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al generar opciones");
    } finally {
      setGeneratingOptions(false);
    }
  };

  // ── Create episode ─────────────────────────────────────────────────────────
  const createEpisode = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");

      const { count } = await supabase
        .from("episodes")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);
      const nextNumber = String((count || 0) + 1).padStart(2, "0");

      // ── 1. Insert episode with all known data ──────────────────────────────
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
        } as any)
        .select("id")
        .single();
      if (insertError) throw insertError;

      // ── 2. Generate AI fields ──────────────────────────────────────────────
      setIsGenerating(true);
      try {
        const { data: fnData, error: fnError } = await supabase.functions.invoke(
          "generate-episode-fields",
          {
            body: {
              idea_principal: draft.idea_principal,
              conflicto_central: finalConflicto || undefined,
              intencion_del_episodio: finalIntencion || undefined,
              tono: draft.tono || "íntimo",
              restricciones: draft.restricciones || undefined,
              episode_number: nextNumber,
            },
          }
        );

        if (fnError) throw fnError;

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
              generation_metadata: fnData.metadata,
              block_states: initBlockStatesFromAI(),
            } as any)
            .eq("id", episode.id);
          if (updateError) console.warn("AI fields update error:", updateError.message);

          // ── 3. Log AI generation in change_history ─────────────────────────
          const session = await supabase.auth.getSession();
          const userId = session.data.session?.user?.id;
          if (userId) {
            const aiFields = ["working_title", "theme", "core_thesis", "summary", "hook", "cta", "quote", "descripcion_spotify"];
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
              supabase.from("change_history").insert(historyRows).then(() => {});
            }
          }
        }
      } catch (aiError) {
        console.error("AI generation failed:", aiError);
        toast.warning("Episodio creado. Los campos se pueden generar desde el workspace.");
      } finally {
        setIsGenerating(false);
      }

      // ── 4. Mark draft as converted ─────────────────────────────────────────
      await markConverted(episode.id);

      return episode;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["episodes"] });
      setOpen(false);
      resetForm();
      toast.success("Episodio creado");
      if (data?.id) navigate(`/episodes/${data.id}`);
    },
    onError: (e) => toast.error((e as Error).message),
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
    onError: (e) => toast.error((e as Error).message),
  });

  const exportCSV = () => {
    if (!episodes.length) return;
    const headers = ["number", "title", "theme", "status", "nivel_completitud", "release_date", "health_score"];
    const rows = episodes.map((ep: any) =>
      headers.map((h) => {
        const val = ep[h];
        return val === null || val === undefined ? "" : String(val).replace(/"/g, '""');
      })
    );
    const csv = [headers.join(","), ...rows.map((r) => r.map((v) => `"${v}"`).join(","))].join("\n");
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
      case "published": return "Publicado";
      case "recording": return "Grabando";
      case "editing": return "En edición";
      default: return "Borrador";
    }
  };

  const filtered = episodes.filter((ep: any) =>
    !search ||
    ep.title?.toLowerCase().includes(search.toLowerCase()) ||
    ep.number?.includes(search) ||
    ep.theme?.toLowerCase().includes(search.toLowerCase())
  );

  const isPending = createEpisode.isPending || isGenerating;
  const canCreate = draft.step === 2 && (manualMode ? true : (!!draft.selected_conflicto && !!draft.selected_intencion));

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 lg:p-8 h-full flex flex-col animate-fade-in">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="page-title">Episodios</h1>
          <p className="page-subtitle">Fuente de verdad. Haz click en un episodio para abrir su Workspace.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCSV} disabled={!episodes.length}>
            <Download className="h-4 w-4 mr-2" />CSV
          </Button>

          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Nuevo Episodio</Button>
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
                  {/* Step indicator */}
                  <div className="flex items-center gap-1.5 ml-auto">
                    <div className={`h-1.5 w-8 rounded-full transition-colors ${draft.step >= 1 ? "bg-primary" : "bg-border"}`} />
                    <div className={`h-1.5 w-8 rounded-full transition-colors ${draft.step >= 2 ? "bg-primary" : "bg-border"}`} />
                  </div>
                </div>
              </DialogHeader>

              {/* ── STEP 1 ── */}
              {draft.step === 1 && (
                <div className="space-y-5 pt-1">

                  {/* Draft restore banner */}
                  {hasDraftToRestore && (
                    <div className="flex items-center gap-2 text-xs text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                      <History className="w-3.5 h-3.5 shrink-0" />
                      <span>Borrador en progreso restaurado automáticamente.</span>
                      <button
                        className="ml-auto underline hover:text-amber-400"
                        onClick={resetForm}
                      >
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
                        <SelectItem value="confrontador">Confrontador — verdad directa e incómoda</SelectItem>
                        <SelectItem value="reflexivo">Reflexivo — espacio para pensar</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="w-full justify-between text-muted-foreground hover:text-foreground">
                        Opciones adicionales
                        <ChevronDown className={`h-4 w-4 transition-transform ${advancedOpen ? "rotate-180" : ""}`} />
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
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generando opciones...</>
                    ) : (
                      <><Sparkles className="h-4 w-4 mr-2" />Generar 3 opciones de conflicto e intención</>
                    )}
                  </Button>
                </div>
              )}

              {/* ── STEP 2 ── */}
              {draft.step === 2 && (
                <div className="space-y-6 pt-1">

                  {conflictOptions && !manualMode ? (
                    <>
                      {/* ── Conflicto central ── */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-semibold text-foreground">
                            ⚡ Conflicto central
                            <span className="text-xs font-normal text-muted-foreground ml-2">Elige 1</span>
                          </h3>
                          {draft.selected_conflicto && (
                            <span className="text-[10px] text-emerald-500 font-medium flex items-center gap-1">
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
                              onSelect={() => saveDraft({ selected_conflicto: opt }, { immediate: true })}
                            />
                          ))}
                        </div>
                      </div>

                      {/* ── Intención del episodio ── */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-semibold text-foreground">
                            🎯 Intención del episodio
                            <span className="text-xs font-normal text-muted-foreground ml-2">Elige 1</span>
                          </h3>
                          {draft.selected_intencion && (
                            <span className="text-[10px] text-emerald-500 font-medium flex items-center gap-1">
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
                              onSelect={() => saveDraft({ selected_intencion: opt }, { immediate: true })}
                            />
                          ))}
                        </div>
                      </div>

                      {/* ── Actions row ── */}
                      <div className="flex items-center gap-3 flex-wrap">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 text-xs"
                          onClick={generateOptions}
                          disabled={generatingOptions || isPending}
                        >
                          {generatingOptions
                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            : <RefreshCw className="h-3.5 w-3.5" />}
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
                          disabled={!draft.selected_conflicto || !draft.selected_intencion || isPending}
                          className="gap-1.5"
                        >
                          {isPending ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              {isGenerating ? "Generando episodio..." : "Creando..."}
                            </>
                          ) : (
                            <><Sparkles className="h-4 w-4" />Crear episodio</>
                          )}
                        </Button>
                      </div>
                    </>
                  ) : (
                    /* ── Manual mode ── */
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
                          placeholder="Ej: quieres intimidad pero cuando alguien realmente se acerca, te cierras para no sentirte expuesto"
                          rows={3}
                          className="mt-1.5 text-sm"
                          disabled={isPending}
                        />
                        <p className="text-[11px] text-muted-foreground mt-1">La tensión emocional o situacional central del episodio.</p>
                      </div>

                      <div>
                        <Label className="text-sm font-medium">Intención del episodio</Label>
                        <Textarea
                          value={manualIntencion}
                          onChange={(e) => setManualIntencion(e.target.value)}
                          placeholder="Ej: que el oyente entienda que no siempre se aferra por amor, sino por miedo a no volver a sentirse elegido"
                          rows={3}
                          className="mt-1.5 text-sm"
                          disabled={isPending}
                        />
                        <p className="text-[11px] text-muted-foreground mt-1">Qué transformación busca provocar el episodio en el oyente.</p>
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
                            {generatingOptions
                              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              : <Sparkles className="h-3.5 w-3.5" />}
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
                            <><Sparkles className="h-4 w-4" />Crear episodio</>
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
        </div>
      </div>

      {/* ── Search ── */}
      <div className="flex gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por título, número o tema..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* ── Episode list ── */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse bg-muted rounded-lg" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state flex-1">
          <Mic className="h-12 w-12 text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground">{search ? "Sin resultados" : "No hay episodios aún"}</p>
        </div>
      ) : (
        <div className="surface flex-1 overflow-hidden flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-secondary/50 text-muted-foreground border-b border-border">
                <tr>
                  <th className="px-4 py-3 font-medium">Episodio</th>
                  <th className="px-4 py-3 font-medium">Tema</th>
                  <th className="px-4 py-3 font-medium">Salud</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium">Nivel</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((ep: any) => {
                  const audit = auditEpisode(ep);
                  const level = getCompletenessLevel(audit.healthScore);
                  return (
                    <tr
                      key={ep.id}
                      className="surface-hover cursor-pointer group"
                      onClick={() => navigate(`/episodes/${ep.id}`)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground hover:text-primary transition-colors">
                            {ep.final_title || ep.working_title || ep.title}
                          </span>
                          {ep.number && (
                            <span className="text-xs text-muted-foreground mt-0.5">#{ep.number}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-foreground">{ep.theme || "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Progress value={audit.healthScore} className="h-1.5 w-16" />
                          <span className={`text-[10px] font-medium ${level.color}`}>{audit.healthScore}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-muted-foreground">{statusLabel(ep.status)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={`text-[10px] font-bold ${level.color}`}>
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
                            <Factory className="h-3.5 w-3.5 mr-1" />Producir
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-destructive opacity-0 group-hover:opacity-100 hover:bg-destructive/10"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`¿Eliminar "${ep.final_title || ep.working_title || ep.title}"? Esta acción no se puede deshacer.`)) {
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
        </div>
      )}
    </div>
  );
}
