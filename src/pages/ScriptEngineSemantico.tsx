/**
 * Fase 3 — Mapa Semántico
 * Genera mapa semántico, sugiere paleta + imagen, muestra validaciones
 */

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useScriptEngineSemantico } from "@/hooks/useScriptEngineSemantico";
import { Button } from "@/components/ui/button";
import { AlertCircle, Loader2, ArrowRight, CheckCircle2 } from "lucide-react";
import { PALETTE_SYSTEM } from "@/lib/design-utils";
import { PageHeader } from "@/components/PageHeader";

export default function ScriptEngineSemantico() {
  const { cleanedTextId } = useParams();
  const navigate = useNavigate();
  const { state, loadCleanedText, generateSemanticMap, approveSemanticMap } = useScriptEngineSemantico();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (cleanedTextId && !isInitialized) {
      loadCleanedText(cleanedTextId);
      setIsInitialized(true);
    }
  }, [cleanedTextId, loadCleanedText, isInitialized]);

  const handleGenerate = async () => {
    if (state.cleanedText) {
      await generateSemanticMap(state.cleanedText);
    }
  };

  const handleApprove = async () => {
    const ok = await approveSemanticMap();
    if (ok && state.semanticMapId) {
      navigate(`/script-engine/outputs/${state.semanticMapId}`);
    }
  };

  const paletteInfo = PALETTE_SYSTEM[(state.suggestedPaletteId as 1 | 2 | 3 | 4)] || PALETTE_SYSTEM[1];

  return (
    <div className="page-container animate-fade-in">
      <div className="max-w-4xl">
        <PageHeader title="Script Engine — Fase 3: Mapa Semántico" />

        {state.loading && !state.semanticJson && (
          <div className="flex items-center justify-center h-96">
            <Loader2 className="animate-spin text-muted-foreground" size={32} />
          </div>
        )}

        {state.semanticJson && (
          <div className="space-y-6">
            {/* Metadata */}
            <div className="bg-card rounded-xl border border-border shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4">Metadata Editorial</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Tesis Central</p>
                  <p className="text-sm text-foreground">{state.semanticJson.episode_metadata?.central_thesis || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Conflicto Central</p>
                  <p className="text-sm text-foreground">{state.semanticJson.episode_metadata?.central_conflict || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Promesa del Episodio</p>
                  <p className="text-sm text-foreground">{state.semanticJson.episode_metadata?.episode_promise || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Tono Emocional</p>
                  <p className="text-sm text-foreground">{state.dominantEmotionalTone}</p>
                </div>
              </div>
            </div>

            {/* Sugerencias */}
            <div className="bg-card rounded-xl border border-border shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4">Sugerencias Automáticas</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground mb-2">Paleta sugerida</p>
                  <div
                    className="w-full h-20 rounded mb-2 border-2"
                    style={{
                      backgroundColor: paletteInfo.bg,
                      borderColor: paletteInfo.accent,
                    }}
                  />
                  <p className="text-sm font-medium">{paletteInfo.name}</p>
                </div>

                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground mb-2">Imagen del host</p>
                  <div className="text-3xl text-center mb-2">
                    {state.suggestedHostImage === "REF_1" ? "🪑 Suelo (íntimo)" : "🪑 Silla (directo)"}
                  </div>
                  <p className="text-sm font-medium">{state.suggestedHostImage}</p>
                </div>
              </div>
            </div>

            {/* Validaciones */}
            {state.wordCountsValidation.warnings.length > 0 && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                <h3 className="font-semibold text-amber-600 dark:text-amber-400 mb-2">Advertencias de validación</h3>
                <ul className="space-y-1">
                  {state.wordCountsValidation.warnings.map((warning, i) => (
                    <li key={i} className="text-sm text-amber-700 dark:text-amber-300">• {warning}</li>
                  ))}
                </ul>
              </div>
            )}

            {state.semanticJson && state.wordCountsValidation.valid && (
              <div className="flex gap-2 p-4 bg-green-500/10 border border-green-500/30 rounded-lg text-green-700 dark:text-green-400">
                <CheckCircle2 size={20} className="flex-shrink-0 mt-0.5" />
                <p>Todos los rangos de palabras son válidos</p>
              </div>
            )}

            {state.error && (
              <div className="flex gap-2 p-4 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive">
                <AlertCircle size={20} />
                <p>{state.error}</p>
              </div>
            )}

            <div className="flex gap-3">
              {!state.approved && (
                <Button onClick={handleApprove} disabled={state.loading}>
                  {state.loading ? <Loader2 className="mr-2 animate-spin" size={16} /> : <ArrowRight className="mr-2" size={16} />}
                  Aprobar y generar outputs
                </Button>
              )}

              {state.approved && (
                <Button variant="outline" className="cursor-default opacity-75">
                  ✓ Aprobado
                </Button>
              )}
            </div>
          </div>
        )}

        {!state.semanticJson && !state.loading && (
          <Button onClick={handleGenerate} disabled={state.loading} variant="outline">
            {state.loading ? <Loader2 className="mr-2 animate-spin" size={16} /> : null}
            Generar mapa semántico
          </Button>
        )}
      </div>
    </div>
  );
}
