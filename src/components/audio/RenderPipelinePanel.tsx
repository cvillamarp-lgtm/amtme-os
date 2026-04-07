import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { renderBasicAssetToPng, getPlatformDimensions } from "@/lib/basic-asset-renderer";
import { buildVisualPrompt } from "@/lib/visual-prompt-builder";
import { useCreateRenderedAsset } from "@/hooks/useRenderedAssets";
import { Layers, Download, Loader2, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { showSessionExpiredToast } from "@/services/functions/edgeFunctionErrors";

interface Props {
  audioTakeId?: string;
  episodeTitle?: string;
  assetCandidates: Array<{
    id: string;
    platform: string;
    asset_type: string;
    body_text?: string | null;
    title: string;
    status: string;
  }>;
  userId?: string;
}

export function RenderPipelinePanel({ audioTakeId, episodeTitle, assetCandidates, userId }: Props) {
  const createRenderedAsset = useCreateRenderedAsset(audioTakeId);
  const [renderingId, setRenderingId] = useState<string | null>(null);
  const [renderedUrls, setRenderedUrls] = useState<Record<string, string>>({});

  const approved = assetCandidates.filter((c) => c.status === "approved");

  const handleRender = async (candidate: Props["assetCandidates"][number]) => {
    if (!userId) { showSessionExpiredToast(); return; }
    if (!audioTakeId) {
      toast.error("Necesitas tener una toma guardada antes de renderizar.");
      return;
    }
    setRenderingId(candidate.id);
    try {
      const { width, height } = getPlatformDimensions(candidate.platform, candidate.asset_type);

      const blob = await renderBasicAssetToPng({
        width,
        height,
        text: candidate.body_text || "",
        title: episodeTitle,
        platform: candidate.platform,
        podcast_name: "AMTME",
        asset_type: candidate.asset_type,
      });

      const fileName = `${userId}/${Date.now()}-${candidate.platform}-${candidate.asset_type}.png`;

      const { error: uploadError } = await supabase.storage
        .from("rendered-assets")
        .upload(fileName, blob, { contentType: "image/png", upsert: false });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("rendered-assets").getPublicUrl(fileName);

      await createRenderedAsset.mutateAsync({
        user_id: userId,
        asset_candidate_id: candidate.id,
        file_path: fileName,
        file_url: publicUrl,
        file_format: "png",
        width,
        height,
        file_size_bytes: blob.size,
        status: "ready",
      });

      setRenderedUrls((prev) => ({ ...prev, [candidate.id]: publicUrl }));
      toast.success(`Asset renderizado: ${candidate.title}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error renderizando asset");
    } finally {
      setRenderingId(null);
    }
  };

  const handleCopyPrompt = (candidate: Props["assetCandidates"][number]) => {
    const prompt = buildVisualPrompt({
      quote_text: candidate.body_text || "",
      platform: candidate.platform,
      asset_type: candidate.asset_type,
      episode_title: episodeTitle,
    });
    navigator.clipboard.writeText(prompt).then(() => toast.success("Prompt copiado al portapapeles"));
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Renderiza assets aprobados localmente y súbelos automáticamente al bucket{" "}
        <code className="text-xs bg-muted px-1 rounded">rendered-assets</code>.
      </p>

      {approved.length === 0 ? (
        <div className="text-sm text-muted-foreground">
          Aprueba assets en el panel anterior para poder renderizarlos aquí.
        </div>
      ) : (
        <div className="space-y-3">
          {approved.map((candidate) => {
            const isRendering = renderingId === candidate.id;
            const renderedUrl = renderedUrls[candidate.id];
            const prompt = buildVisualPrompt({
              quote_text: candidate.body_text || "",
              platform: candidate.platform,
              asset_type: candidate.asset_type,
              episode_title: episodeTitle,
            });

            return (
              <div key={candidate.id} className="rounded-lg border border-border p-3 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-foreground">{candidate.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {candidate.platform} · {candidate.asset_type}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {renderedUrl && (
                      <a
                        href={renderedUrl}
                        download={`${candidate.platform}-${candidate.asset_type}.png`}
                        className="inline-flex items-center text-sm text-primary hover:underline"
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Descargar
                      </a>
                    )}
                    <Button
                      size="sm"
                      onClick={() => handleRender(candidate)}
                      disabled={isRendering}
                    >
                      {isRendering ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <Layers className="h-4 w-4 mr-1" />
                      )}
                      {renderedUrl ? "Re-renderizar" : "Renderizar"}
                    </Button>
                  </div>
                </div>

                {renderedUrl && (
                  <img
                    src={renderedUrl}
                    alt="Asset renderizado"
                    className="w-full max-w-xs rounded border border-border"
                  />
                )}

                {/* Visual prompt for AI tools */}
                <div className="rounded bg-muted/30 p-2 flex items-start gap-2">
                  <p className="text-xs text-muted-foreground font-mono flex-1 break-all line-clamp-3">
                    {prompt}
                  </p>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="shrink-0 h-6 w-6 p-0"
                    onClick={() => handleCopyPrompt(candidate)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
