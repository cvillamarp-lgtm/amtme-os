import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Sparkles, Loader2, Save, Copy, Check, Quote, FlaskConical } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { invokeEdgeFunction } from "@/services/functions/invokeEdgeFunction";
import { useQueryClient } from "@tanstack/react-query";

// Supabase URL with hardcoded fallback for streaming SSE calls
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
  ?? "https://vudvgfdoeciurejtbzbw.supabase.co";

interface Props {
  episode: Record<string, any>;
  onSave: (updates: Record<string, any>) => Promise<void>;
  isSaving: boolean;
}

export function WorkspaceScript({ episode, onSave, isSaving }: Props) {
  const qc = useQueryClient();
  const [scriptBase, setScriptBase] = useState(episode.script_base || "");
  const [scriptGenerated, setScriptGenerated] = useState(episode.script_generated || "");
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [extractingQuotes, setExtractingQuotes] = useState(false);
  const [extractingInsights, setExtractingInsights] = useState(false);
  const [autoExtracting, setAutoExtracting] = useState(false);

  const generateScript = async () => {
    if (!episode.theme && !episode.working_title) {
      toast.error("El episodio necesita tema o título para generar guión");
      return;
    }
    setGenerating(true);
    setScriptGenerated("");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Sesión expirada");

      const resp = await fetch(
        `${SUPABASE_URL}/functions/v1/generate-script`,
        {
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
        }
      );

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
          } catch { /* skip */ }
        }
      }

      toast.success("Guión generado");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setGenerating(false);
    }
  };

  const extractFromScript = async (mode: "quotes" | "insights") => {
    const script = scriptGenerated || scriptBase;
    if (!script || script.trim().length < 50) {
      toast.error("Genera o escribe el guión primero");
      return;
    }
    if (!episode.id) return;

    const setter = mode === "quotes" ? setExtractingQuotes : setExtractingInsights;
    setter(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No autenticado");

      const result = await invokeEdgeFunction<{
        quotes?: Array<{ text: string; quote_type: string; timestamp_hint: string }>;
        insights?: Array<{ hypothesis: string; category: string; potential_action: string }>;
      }>("extract-from-script", {
        script,
        mode,
        episode_title: episode.title || episode.working_title,
        episode_number: episode.number,
      });

      if (mode === "quotes") {
        const quotes = (result.quotes || []) as Array<{
          text: string; quote_type: string; timestamp_hint: string;
        }>;
        if (quotes.length === 0) { toast.error("No se encontraron citas"); return; }

        const rows = quotes.map((q) => ({
          user_id: session.user.id,
          episode_id: episode.id,
          text: q.text,
          quote_type: q.quote_type || null,
          timestamp_ref: q.timestamp_hint || null,
          status: "captured" as const,
          clarity: 3, emotional_intensity: 3, memorability: 3, shareability: 3, visual_fit: 3, score_total: 3,
        }));

        const { error } = await supabase.from("quote_candidates").insert(rows);
        if (error) throw error;
        qc.invalidateQueries({ queryKey: ["quote-candidates"] });
        qc.invalidateQueries({ queryKey: ["dashboard-counts-v2"] });
        toast.success(`${rows.length} citas guardadas en Banco de Citas`);
      } else {
        const insightItems = (result.insights || []) as Array<{
          hypothesis: string; category: string; potential_action: string;
        }>;
        if (insightItems.length === 0) { toast.error("No se encontraron insights"); return; }

        const rows = insightItems.map((item) => ({
          user_id: session.user.id,
          episode_id: episode.id,
          finding: item.hypothesis,
          hypothesis: item.hypothesis,
          recommendation: item.potential_action || null,
          confidence_level: "medium",
          status: "active" as const,
          source: "ai_extracted",
          category: item.category || null,
        }));

        const { error } = await supabase.from("insights").insert(rows);
        if (error) throw error;
        qc.invalidateQueries({ queryKey: ["insights"] });
        qc.invalidateQueries({ queryKey: ["dashboard-counts-v2"] });
        toast.success(`${rows.length} insights guardados en Insights`);
      }
    } catch (e: any) {
      toast.error(e.message || "Error al extraer");
    } finally {
      setter(false);
    }
  };

  const saveScripts = async () => {
    // Detect first-time save: episode had no script before, now it does
    const wasEmpty = !episode.script_base && !episode.script_generated;
    const nowHasScript =
      scriptBase.trim().length > 50 || scriptGenerated.trim().length > 50;

    await onSave({
      script_base: scriptBase || null,
      script_generated: scriptGenerated || null,
    });
    toast.success("Guiones guardados");

    // Auto-extract quotes + insights only on the very first save with real content
    if (wasEmpty && nowHasScript) {
      setAutoExtracting(true);
      Promise.allSettled([
        extractFromScript("quotes"),
        extractFromScript("insights"),
      ]).finally(() => setAutoExtracting(false));
    }
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
          {autoExtracting && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Extrayendo citas e insights...
            </span>
          )}
          {hasScript && (
            <Button variant="outline" size="sm" onClick={copyScript}>
              {copied ? <Check className="h-3.5 w-3.5 mr-1" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
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
          onChange={(e) => setScriptBase(e.target.value)}
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
            {generating ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 mr-1" />}
            {generating ? "Generando..." : "Generar desde datos"}
          </Button>
        </div>
        <div className="bg-secondary/30 rounded-lg p-4 min-h-[200px]">
          <pre className="text-sm text-foreground/90 whitespace-pre-wrap font-body leading-relaxed">
            {scriptGenerated || <span className="text-muted-foreground">El guión generado aparecerá aquí</span>}
            {generating && <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-0.5" />}
          </pre>
        </div>
      </div>

      {/* Post-generation actions */}
      {hasScript && (
        <div className="surface p-4 space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Extraer del guión con IA
          </p>
          <div className="flex gap-2 flex-wrap">
            <Button
              size="sm"
              variant="outline"
              onClick={() => extractFromScript("quotes")}
              disabled={extractingQuotes || extractingInsights}
              className="gap-2"
            >
              {extractingQuotes
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <Quote className="h-3.5 w-3.5" />}
              {extractingQuotes ? "Extrayendo citas..." : "Extraer citas"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => extractFromScript("insights")}
              disabled={extractingInsights || extractingQuotes}
              className="gap-2"
            >
              {extractingInsights
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <FlaskConical className="h-3.5 w-3.5" />}
              {extractingInsights ? "Extrayendo insights..." : "Extraer insights"}
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Las citas se guardan en <strong>Banco de Citas</strong> · Los insights en <strong>Insights</strong>
          </p>
        </div>
      )}
    </div>
  );
}
