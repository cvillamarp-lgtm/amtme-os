/**
 * Fase 4 — Generación de Outputs
 * Muestra los 10 tipos de outputs generados con tabs y contadores
 */

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useScriptEngineOutputs } from "@/hooks/useScriptEngineOutputs";
import { Button } from "@/components/ui/button";
import { Loader2, Download, Zap, ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

const OUTPUT_TYPES = [
  { id: "editorial_summary", label: "Resumen Editorial", num: 1 },
  { id: "visual_copy", label: "Visual Copy", num: 2 },
  { id: "captions", label: "Captions", num: 3 },
  { id: "hooks", label: "Hooks", num: 4 },
  { id: "quotes", label: "Quotes", num: 5 },
  { id: "carousel", label: "Carrusel", num: 6 },
  { id: "stories", label: "Stories", num: 7 },
  { id: "reels", label: "Reels", num: 8 },
  { id: "descriptions", label: "Descripciones", num: 9 },
  { id: "distribution", label: "Distribución", num: 10 },
];

type OutputTabId = (typeof OUTPUT_TYPES)[number]["id"];

export default function ScriptEngineOutputs() {
  const { semanticMapId } = useParams();
  const navigate = useNavigate();
  const { state, loadSemanticMap, generateOutputs } = useScriptEngineOutputs();
  const [activeTab, setActiveTab] = useState<OutputTabId>("editorial_summary");
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (semanticMapId && !isInitialized) {
      loadSemanticMap(semanticMapId);
      setIsInitialized(true);
    }
  }, [semanticMapId, loadSemanticMap, isInitialized]);

  const handleGenerate = async () => {
    if (semanticMapId && state.semanticJson) {
      await generateOutputs(semanticMapId, state.semanticJson);
    }
  };

  const activeOutput = state.outputs.find((o) => o.output_number === OUTPUT_TYPES.find((t) => t.id === activeTab)?.num);

  return (
    <div className="page-container animate-fade-in">
      <div className="max-w-6xl">
        <PageHeader title="Script Engine — Fase 4: Outputs" />

        {!state.outputs.length && !state.loading && (
          <Button onClick={handleGenerate} className="mb-6">
            <Zap className="mr-2" size={16} />
            Generar 10 outputs
          </Button>
        )}

        {state.loading && (
          <div className="bg-primary/10 border border-primary/20 rounded-xl p-6 mb-6">
            <div className="flex items-center gap-3 mb-2">
              <Loader2 className="animate-spin text-primary" size={20} />
              <p className="font-medium">Generando contenido...</p>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${state.progress}%` }} />
            </div>
            <p className="text-sm text-muted-foreground mt-2">{state.progress}% completado</p>
          </div>
        )}

        {state.outputs.length > 0 && (
          <div className="space-y-6">
            {/* Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              {OUTPUT_TYPES.map((type) => (
                <button
                  key={type.id}
                  onClick={() => setActiveTab(type.id)}
                  className={`px-4 py-2 rounded-lg whitespace-nowrap text-sm font-medium transition ${
                    activeTab === type.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  <span className="inline-flex items-center justify-center w-5 h-5 bg-background/30 rounded-full text-xs mr-2">
                    {type.num}
                  </span>
                  {type.label}
                </button>
              ))}
            </div>

            {/* Content */}
            {activeOutput && (
              <div className="bg-card rounded-xl border border-border shadow-sm p-6">
                <h2 className="text-xl font-semibold mb-4">{activeOutput.asset_type}</h2>

                <pre className="bg-muted rounded-lg p-4 overflow-auto text-sm text-foreground mb-4 max-h-96">
                  {JSON.stringify(activeOutput.content, null, 2)}
                </pre>

                {activeOutput.wordCounts && (
                  <div className="mb-4">
                    <p className="text-xs text-slate-400 mb-2">Contadores de palabras</p>
                    <div className="grid grid-cols-4 gap-2">
                      {Object.entries(activeOutput.wordCounts).slice(0, 4).map(([key, value]) => (
                        <div key={key} className="bg-muted rounded-lg p-2 text-xs">
                          <p className="text-muted-foreground">{key}</p>
                          <p className="font-bold text-foreground">{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Button variant="outline">
                  <Download className="mr-2" size={16} />
                  Descargar como JSON
                </Button>
              </div>
            )}

            {/* Summary */}
            <div className="bg-card rounded-xl border border-border shadow-sm p-6">
              <h3 className="font-semibold mb-4">Resumen</h3>
              <p className="text-sm text-muted-foreground">
                {state.outputs.length} outputs generados exitosamente. Todos los assets están disponibles para el Visual OS.
              </p>
              <Button
                className="mt-4"
                onClick={() => navigate(`/visual/editor/${semanticMapId}`)}
              >
                <ArrowRight className="mr-2" size={16} />
                Ir al Visual OS
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
