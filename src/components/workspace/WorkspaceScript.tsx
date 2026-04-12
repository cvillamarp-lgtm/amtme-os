import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Sparkles, Loader2, Save, Copy, Check, Quote, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { onScriptSaved } from "@/services/automation/onScriptSaved";
import { showEdgeFunctionError } from "@/services/functions/edgeFunctionErrors";
import { AutomationStatusBadge } from "@/components/automation/AutomationStatusBadge";

// Supabase URL with hardcoded fallback for streaming SSE calls
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
  ?? "https://vudvgfdoeciurejtbzbw.supabase.co";

interface Props {
  episode: Record<string, unknown>;
  onSave: (updates: Record<string, unknown>) => Promise<void>;
  isSaving: boolean;
}

export function WorkspaceScript({ episode, onSave, isSaving }: Props) {
  const qc = useQueryClient();
  const [scriptBase, setScriptBase] = useState((episode.script_base as string) || "");
  const [scriptGenerated, setScriptGenerated] = useState((episode.script_generated as string) || "");
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [autoExtracting, setAutoExtracting] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef("");

  const doAutoSave = useCallback(async (base: string, generated: string) => {
    const hash = `${base}||${generated}`;
    if (hash === lastSavedRef.current) return;
    setAutoSaveStatus("saving");
    try {
      await onSave({ script_base: base || null, script_generated: generated || null });
      lastSavedRef.current = hash;
      setAutoSaveStatus("saved");
      setTimeout(() => setAutoSaveStatus("idle"), 2000);
    } catch {
      setAutoSaveStatus("idle");
    }
  }, [onSave]);

  const scheduleAutoSave = useCallback((base: string, generated: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doAutoSave(base, generated), 2000);
  }, [doAutoSave]);

  const generateScript = async () => {
    if (!episode.theme && !episode.working_title) {
      toast.error("El episodio necesita tema o título para generar guión");
      return;
    }
    setGenerating(true);
    setScriptGenerated("");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Sesión expirada");

      const resp = await fetch(`${SUPABASE_URL}/functions/v1/generate-script`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          theme: episode.theme,
          title: episode.final_title || episode.working_title,
          format: "solo",
        }),
      });

      if (!resp.ok || !resp.body) throw new Error("Error al generar");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullText += content;
              setScriptGenerated(fullText);
            }
          } catch {
            /* skip malformed SSE lines */
          }
        }
      }

      toast.success("Guión generado");
    } catch (e: unknown) {
      showEdgeFunctionError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setGenerating(false);
    }
  };

  /**
   * Runs onScriptSaved automation (quotes + insights extraction).
   * Called both automatically on save and from the manual extraction buttons.
   */
  const runExtraction = async (script: string) => {
    if (!episode.id || !script || script.trim().length < 50) {
      toast.warning("El guión debe tener al menos 50 caracteres para extraer citas e insights");
      return;
    }

    setAutoExtracting(true);
    try {
      const result = await onScriptSaved({
        episodeId: episode.id as string,
        script,
        episodeTitle: (episode.title as string) || (episode.working_title as string),
        episodeNumber: episode.number as string | null,
      });

      if (result.ok) {
        if (result.quotesExtracted > 0 || result.insightsExtracted > 0) {
          qc.invalidateQueries({ queryKey: ["quote-candidates"] });
          qc.invalidateQueries({ queryKey: ["insights"] });
          qc.invalidateQueries({ queryKey: ["dashboard-counts-v2"] });
          qc.invalidateQueries({ queryKey: ["op-state-quotes", episode.id] });
          toast.success(
            `Extraídos: ${result.quotesExtracted} citas · ${result.insightsExtracted} insights`
          );
        }
        // Refresh episode state — onScriptSaved already called evaluateEpisodeCompletion
        // internally, but we need to invalidate the cache here so the UI reflects it.
        qc.invalidateQueries({ queryKey: ["episode", episode.id] });
      } else {
        showEdgeFunctionError(new Error(result.error ?? "Error en extracción automática"));
      }
    } finally {
      setAutoExtracting(false);
    }
  };

  const saveScripts = async () => {
    await onSave({
      script_base: scriptBase || null,
      script_generated: scriptGenerated || null,
    });
    lastSavedRef.current = `${scriptBase}||${scriptGenerated}`;
    toast.success("Guiones guardados");
  };

  const copyScript = () => {
    const text = scriptGenerated || scriptBase;
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const hasScript = !!(scriptGenerated || scriptBase);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          Escribe o genera el guión directamente desde los datos del episodio.
        </p>
        <div className="flex items-center gap-2">
          {autoSaveStatus === "saving" && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />Guardando...
            </span>
          )}
          {autoSaveStatus === "saved" && (
            <span className="flex items-center gap-1.5 text-xs text-emerald-500">
              <CheckCircle2 className="h-3 w-3" />Guardado
            </span>
          )}
          {autoExtracting && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Extrayendo citas e insights...
            </span>
          )}
          {hasScript && (
            <Button variant="outline" size="sm" onClick={copyScript}>
              {copied ? (
                <Check className="h-3.5 w-3.5 mr-1" />
              ) : (
                <Copy className="h-3.5 w-3.5 mr-1" />
              )}
              {copied ? "Copiado" : "Copiar"}
            </Button>
          )}
          <Button size="sm" onClick={saveScripts} disabled={isSaving || autoExtracting}>
            <Save className="h-3.5 w-3.5 mr-1" />
            Guardar
          </Button>
        </div>
      </div>

      {/* Script base */}
      <div className="surface p-5 space-y-3">
        <Label>Guión base (manual)</Label>
        <Textarea
          value={scriptBase}
          onChange={(e) => { setScriptBase(e.target.value); scheduleAutoSave(e.target.value, scriptGenerated); }}
          rows={8}
          placeholder="Pega o escribe tu guión aquí..."
          className="font-mono text-sm"
        />
      </div>

      {/* Script generated */}
      <div className="surface p-5 space-y-3">
        <div className="flex justify-between items-center">
          <Label>Guión generado (IA)</Label>
          <Button size="sm" variant="outline" onClick={generateScript} disabled={generating}>
            {generating ? (
              <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5 mr-1" />
            )}
            {generating ? "Generando..." : "Generar desde datos"}
          </Button>
        </div>
        <div className="bg-secondary/30 rounded-lg p-4 min-h-[200px]">
          <pre className="text-sm text-foreground/90 whitespace-pre-wrap font-body leading-relaxed">
            {scriptGenerated || (
              <span className="text-muted-foreground">El guión generado aparecerá aquí</span>
            )}
            {generating && (
              <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-0.5" />
            )}
          </pre>
        </div>
      </div>

      {/* On-demand extraction (also auto-runs on every save) */}
      {hasScript && (
        <div className="surface p-4 space-y-3">
          <div className="flex items-center gap-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Extraer del guión con IA
            </p>
            <AutomationStatusBadge
              episodeId={episode.id as string | undefined}
              eventType="script_saved"
            />
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            <Button
              size="sm"
              variant="outline"
              onClick={() => runExtraction(scriptGenerated || scriptBase)}
              disabled={autoExtracting}
              className="gap-2"
            >
              {autoExtracting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Quote className="h-3.5 w-3.5" />
              )}
              {autoExtracting ? "Extrayendo..." : "Extraer citas e insights"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Citas → <strong>Banco de Citas</strong> · Insights → <strong>Insights</strong>
            {" · "}
            <span className="text-primary/70">Se ejecuta automáticamente al guardar</span>
          </p>
        </div>
      )}
    </div>
  );
}
