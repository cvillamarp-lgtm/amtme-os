/**
 * Fase 1 — Ingesta
 * Recibe guion/transcripción bruto y prepara para el pipeline
 */

import { useState } from "react";
import { useScriptEngineIngesta } from "@/hooks/useScriptEngineIngesta";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

export default function ScriptEngineIngesta() {
  const navigate = useNavigate();
  const { state, createEpisode, updateRawText, saveRawInput } = useScriptEngineIngesta();
  const [step, setStep] = useState<"episode" | "content">("episode");
  const [episodeTitle, setEpisodeTitle] = useState("");
  const [season, setSeason] = useState<number | null>(null);
  const [episodeNumber, setEpisodeNumber] = useState<number | null>(null);
  const [sourceType, setSourceType] = useState<"guion" | "transcripcion" | "notas">("transcripcion");

  const wordCountStatus = () => {
    if (state.wordCount < 300) return "rojo";
    if (state.wordCount > 15000) return "naranja";
    return "verde";
  };

  const handleCreateEpisode = async (e: React.FormEvent) => {
    e.preventDefault();
    await createEpisode(episodeTitle, season || undefined, episodeNumber || undefined);
    if (!state.error) {
      setStep("content");
    }
  };

  const handleSaveAndContinue = async (sourceType: "guion" | "transcripcion" | "notas") => {
    try {
      const rawInputId = await saveRawInput(sourceType);
      if (rawInputId) {
        navigate(`/script-engine/clean/${rawInputId}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="page-container animate-fade-in">
      <div className="max-w-4xl">
        <PageHeader
          title="Script Engine"
          subtitle="Fase 1: Ingesta de contenido"
          actions={
            <div className="flex gap-2">
              {(["Ingesta", "Limpieza", "Semántico", "Outputs"] as const).map((label, i) => (
                <span
                  key={label}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                    i === 0
                      ? "bg-primary/15 text-primary"
                      : "bg-muted text-muted-foreground opacity-40"
                  }`}
                >
                  {i === 0 && <CheckCircle2 size={12} />}
                  {label}
                </span>
              ))}
            </div>
          }
        />

        {step === "episode" ? (
          // Step 1: Episode metadata
          <form onSubmit={handleCreateEpisode} className="space-y-6 bg-card p-8 rounded-xl border border-border shadow-sm">
            <div>
              <label className="block text-sm font-medium mb-2">Título del episodio</label>
              <Input
                value={episodeTitle}
                onChange={(e) => setEpisodeTitle(e.target.value)}
                placeholder="Ej: La importancia del duelo"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Temporada (opcional)</label>
                <Input
                  type="number"
                  value={season || ""}
                  onChange={(e) => setSeason(e.target.value ? parseInt(e.target.value) : null)}
                  placeholder="Ej: 1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Número (opcional)</label>
                <Input
                  type="number"
                  value={episodeNumber || ""}
                  onChange={(e) => setEpisodeNumber(e.target.value ? parseInt(e.target.value) : null)}
                  placeholder="Ej: 42"
                />
              </div>
            </div>

            {state.error && (
              <div className="flex gap-2 p-4 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive">
                <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
                <p>{state.error}</p>
              </div>
            )}

            <Button type="submit" disabled={state.loading || !episodeTitle} className="w-full">
              {state.loading ? <Loader2 className="mr-2 animate-spin" size={16} /> : <ArrowRight className="mr-2" size={16} />}
              Siguiente paso
            </Button>
          </form>
        ) : (
          // Step 2: Raw text input
          <div className="space-y-6">
            <div className="bg-card p-8 rounded-xl border border-border shadow-sm">
              <h2 className="text-xl font-semibold mb-4">Episodio: {state.episodeTitle}</h2>

              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">Tipo de contenido</label>
                <div className="flex gap-3">
                  {(["guion", "transcripcion", "notas"] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setSourceType(type)}
                      className={`px-4 py-2 rounded border transition ${
                        sourceType === type
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted border-border hover:border-primary/50 text-muted-foreground"
                      }`}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Pega el texto aquí</label>
                <Textarea
                  value={state.rawText}
                  onChange={(e) => updateRawText(e.target.value)}
                  placeholder="Pega tu guion, transcripción o notas..."
                  className="min-h-96 font-mono text-sm"
                />
              </div>

              {/* Word count display */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Palabras</p>
                  <p className={`text-2xl font-bold ${wordCountStatus() === "verde" ? "text-green-600 dark:text-green-400" : wordCountStatus() === "naranja" ? "text-amber-500" : "text-destructive"}`}>
                    {state.wordCount.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {state.wordCount < 300 && "Mínimo 300"}
                    {state.wordCount >= 300 && state.wordCount <= 15000 && "Rango ideal"}
                    {state.wordCount > 15000 && "Muy largo"}
                  </p>
                </div>

                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Caracteres</p>
                  <p className="text-2xl font-bold text-foreground">{state.characterCount.toLocaleString()}</p>
                </div>

                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Duración estimada</p>
                  <p className="text-2xl font-bold text-foreground">
                    {state.estimatedDurationSecs ? `${Math.ceil(state.estimatedDurationSecs / 60)} min` : "—"}
                  </p>
                </div>
              </div>

              {state.error && (
                <div className="flex gap-2 p-4 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive mb-6">
                  <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
                  <p>{state.error}</p>
                </div>
              )}

              <Button
                onClick={() => handleSaveAndContinue(sourceType)}
                disabled={state.loading || state.wordCount < 300}
                className="w-full"
              >
                {state.loading ? <Loader2 className="mr-2 animate-spin" size={16} /> : <ArrowRight className="mr-2" size={16} />}
                Procesar texto
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
