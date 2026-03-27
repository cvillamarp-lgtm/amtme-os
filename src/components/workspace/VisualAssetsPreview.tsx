import { useEffect } from "react";
import { useVisualAssetGenerator } from "@/hooks/useVisualAssetGenerator";
import { Button } from "@/components/ui/button";
import { Loader2, Download, Zap, ImageIcon } from "lucide-react";

interface VisualAssetsPreviewProps {
  episodeId: string;
  episodeTitle: string;
  centralThesis?: string;
  theme?: string;
  autoGenerate?: boolean;
}

export function VisualAssetsPreview({
  episodeId,
  episodeTitle,
  centralThesis,
  theme,
  autoGenerate = true,
}: VisualAssetsPreviewProps) {
  const { state, triggerAssetGeneration, fetchAssets } = useVisualAssetGenerator();

  useEffect(() => {
    // Fetch existing assets
    fetchAssets(episodeId);

    // Auto-trigger if conditions are met
    if (
      autoGenerate &&
      !state.isGenerating &&
      state.assets.length === 0 &&
      centralThesis &&
      theme
    ) {
      triggerAssetGeneration(episodeId, episodeTitle, centralThesis, theme);
    }
  }, [episodeId]);

  if (state.isGenerating) {
    return (
      <div className="bg-primary/10 border border-primary/20 rounded-xl p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <Loader2 className="animate-spin text-primary" size={20} />
          <h3 className="font-semibold">Generando Visual Assets...</h3>
        </div>
        <div className="w-full bg-muted rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full transition-all"
            style={{ width: `${state.progress}%` }}
          />
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          Generando: Reel, Story, Cover, Thumbnail ({state.progress}%)
        </p>
      </div>
    );
  }

  if (!state.assets || state.assets.length === 0) {
    return (
      <div className="bg-muted rounded-xl p-6 mb-6">
        <p className="text-sm text-muted-foreground">
          No hay assets generados aún
        </p>
        <Button
          onClick={() =>
            triggerAssetGeneration(
              episodeId,
              episodeTitle,
              centralThesis || "",
              theme || "General"
            )
          }
          className="mt-4"
          disabled={!centralThesis || !theme}
        >
          <Zap className="mr-2" size={16} />
          Generar Assets Visuales
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <ImageIcon size={18} className="text-primary" />
        <h3 className="font-semibold">Visual Assets Generados</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {state.assets.map((asset) => (
          <div
            key={asset.piece_id}
            className="bg-card rounded-lg border border-border overflow-hidden hover:border-primary/50 transition-colors"
          >
            <img
              src={asset.url}
              alt={asset.piece_name}
              className="w-full h-40 object-cover"
            />
            <div className="p-3">
              <p className="text-sm font-medium">{asset.piece_name}</p>
              <a
                href={asset.url}
                download
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 w-full"
                >
                  <Download size={14} className="mr-1" />
                  Descargar
                </Button>
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
