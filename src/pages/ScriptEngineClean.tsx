/**
 * Fase 2 — Limpieza automática
 * Split view: original vs limpio, contadores, aprobación
 */

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useScriptEngineClean } from "@/hooks/useScriptEngineClean";
import { Button } from "@/components/ui/button";
import { AlertCircle, Loader2, ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

export default function ScriptEngineClean() {
  const { rawInputId } = useParams();
  const navigate = useNavigate();
  const { state, loadRawInput, cleanText, approveCleaned } = useScriptEngineClean();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (rawInputId && !isInitialized)  {
      loadRawInput(rawInputId);
      setIsInitialized(true);
    }
  }, [rawInputId, loadRawInput, isInitialized]);

  const handleClean = async () => {
    if (rawInputId && state.rawText) {
      await cleanText(rawInputId, state.rawText);
    }
  };

  const handleApprove = async () => {
    const approvedId = await approveCleaned();
    if (approvedId) {
      navigate(`/script-engine/semantico/${approvedId}`);
    }
  };

  return (
    <div className="page-container animate-fade-in">
      <div className="max-w-7xl">
        <PageHeader title="Script Engine — Fase 2: Limpieza" />

        {state.loading && !state.rawText && (
          <div className="flex items-center justify-center h-96">
            <Loader2 className="animate-spin text-muted-foreground" size={32} />
          </div>
        )}

        {state.rawText && (
          <div className="grid grid-cols-2 gap-6 mb-6">
            {/* Original */}
            <div className="bg-card rounded-xl border border-border shadow-sm p-6">
              <div className="mb-4">
                <h2 className="text-lg font-semibold mb-1">Original</h2>
                <p className="text-xs text-muted-foreground">
                  {state.rawWordCount.toLocaleString()} palabras
                </p>
              </div>
              <div className="bg-muted rounded-lg p-4 h-96 overflow-auto text-sm text-foreground font-mono">
                {state.rawText}
              </div>
            </div>

            {/* Cleaned */}
            <div className="bg-card rounded-xl border border-border shadow-sm p-6">
              <div className="mb-4">
                <h2 className="text-lg font-semibold mb-1">Limpio</h2>
                <p className="text-xs text-muted-foreground">
                  {state.cleanedWordCount.toLocaleString()} palabras
                  {state.reductionPercentage && ` (−${state.reductionPercentage}%)`}
                </p>
              </div>
              <div className="bg-muted rounded-lg p-4 h-96 overflow-auto text-sm text-foreground font-mono">
                {state.cleanedText || (
                  <span className="text-muted-foreground">Haz clic en "Limpiar" para procesar...</span>
                )}
              </div>
            </div>
          </div>
        )}

        {state.error && (
          <div className="flex gap-2 p-4 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive mb-6">
            <AlertCircle size={20} />
            <p>{state.error}</p>
          </div>
        )}

        <div className="flex gap-3">
          {!state.cleanedText && (
            <Button onClick={handleClean} disabled={state.loading} variant="outline">
              {state.loading ? <Loader2 className="mr-2 animate-spin" size={16} /> : null}
              Limpiar texto
            </Button>
          )}

          {state.cleanedText && !state.approved && (
            <Button onClick={handleApprove} disabled={state.loading}>
              {state.loading ? <Loader2 className="mr-2 animate-spin" size={16} /> : <ArrowRight className="mr-2" size={16} />}
              Aprobar y continuar
            </Button>
          )}

          {state.approved && (
            <Button variant="outline" className="cursor-default opacity-75">
              ✓ Aprobado
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
