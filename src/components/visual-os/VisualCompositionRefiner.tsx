import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, Wand2, Copy, Save, X } from "lucide-react";
import { toast } from "sonner";

type Intensity = "sutil" | "media" | "alta";
type Focus = "fondo" | "composicion" | "legibilidad" | "acabado" | "integral";

interface VisualCompositionRefinerProps {
  episodeId: string;
  canvasImageUrl: string;
  pieceId: string;
  onApply: (refinedImageUrl: string) => void;
}

export function VisualCompositionRefiner({
  episodeId,
  canvasImageUrl,
  pieceId,
  onApply,
}: VisualCompositionRefinerProps) {
  const [intensity, setIntensity] = useState<Intensity>("media");
  const [focus, setFocus] = useState<Focus>("integral");
  const [isProcessing, setIsProcessing] = useState(false);
  const [refinedUrl, setRefinedUrl] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [showComparison, setShowComparison] = useState(false);

  const handleRefine = async () => {
    if (!canvasImageUrl) {
      toast.error("No hay imagen para refinar");
      return;
    }

    setIsProcessing(true);
    toast.info("Analizando composición visual...");

    try {
      const { data, error } = await supabase.functions.invoke(
        "refine-visual-composition",
        {
          body: {
            imageUrl: canvasImageUrl,
            intensity,
            focus,
            episodeId,
            layout: { pieceId },
          },
        }
      );

      if (error) throw error;

      setRefinedUrl(data.refined);
      setAnalysis(data.analysis);
      setShowComparison(true);
      toast.success("✅ Composición refinada exitosamente");
    } catch (err) {
      toast.error(
        `Error: ${err instanceof Error ? err.message : "Error refining"}`
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApply = () => {
    if (refinedUrl) {
      onApply(refinedUrl);
      setShowComparison(false);
      setRefinedUrl(null);
      toast.success("Imagen optimizada aplicada");
    }
  };

  const handleSaveVariant = async () => {
    if (!refinedUrl) return;

    try {
      // Save as new version in database
      const { error } = await supabase.from("visual_refinements").insert({
        episode_id: episodeId,
        original_image_url: canvasImageUrl,
        refined_image_url: refinedUrl,
        intensity,
        focus,
        analysis,
        status: "completed",
      });

      if (error) throw error;
      toast.success("Variante guardada exitosamente");
    } catch (err) {
      toast.error("Error guardando variante");
    }
  };

  return (
    <div className="space-y-4">
      {!showComparison ? (
        <Card className="p-4 bg-card/50">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Intensidad</label>
              <div className="flex gap-2 mt-2">
                {(["sutil", "media", "alta"] as Intensity[]).map((level) => (
                  <button
                    key={level}
                    onClick={() => setIntensity(level)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                      intensity === level
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {level.charAt(0).toUpperCase() + level.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Enfoque</label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {(
                  [
                    "fondo",
                    "composicion",
                    "legibilidad",
                    "acabado",
                    "integral",
                  ] as Focus[]
                ).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFocus(f)}
                    className={`px-2 py-2 rounded-lg text-xs font-medium transition ${
                      focus === f
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <Button
              onClick={handleRefine}
              disabled={isProcessing || !canvasImageUrl}
              className="w-full"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Optimizando...
                </>
              ) : (
                <>
                  <Wand2 className="mr-2 h-4 w-4" />
                  Optimizar con IA
                </>
              )}
            </Button>
          </div>
        </Card>
      ) : refinedUrl ? (
        <Card className="p-4 bg-card/50">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-2">Original</p>
                <img
                  src={canvasImageUrl}
                  alt="Original"
                  className="w-full rounded-lg border border-border"
                />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-2">Optimizada</p>
                <img
                  src={refinedUrl}
                  alt="Refined"
                  className="w-full rounded-lg border border-primary/50"
                />
              </div>
            </div>

            {analysis?.improvements && (
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs font-semibold mb-2">Mejoras aplicadas:</p>
                <ul className="text-xs space-y-1 text-muted-foreground">
                  {analysis.improvements.slice(0, 4).map((imp: string, i: number) => (
                    <li key={i}>• {imp}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={handleApply} className="flex-1" variant="default">
                <Copy className="mr-2 h-4 w-4" />
                Aplicar cambios
              </Button>
              <Button onClick={handleSaveVariant} variant="outline" className="flex-1">
                <Save className="mr-2 h-4 w-4" />
                Guardar variante
              </Button>
              <Button
                onClick={() => setShowComparison(false)}
                variant="outline"
                size="icon"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
