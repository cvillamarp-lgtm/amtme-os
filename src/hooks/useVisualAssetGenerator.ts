import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { invokeEdgeFunction } from "@/services/functions/invokeEdgeFunction";
import { showEdgeFunctionError } from "@/services/functions/edgeFunctionErrors";

interface VisualAsset {
  piece_id: string;
  piece_name: string;
  image_url: string;
  status: "generating" | "generated" | "failed";
}

interface UseVisualAssetGeneratorState {
  isGenerating: boolean;
  assets: VisualAsset[];
  progress: number;
  error: string | null;
}

export function useVisualAssetGenerator() {
  const [state, setState] = useState<UseVisualAssetGeneratorState>({
    isGenerating: false,
    assets: [],
    progress: 0,
    error: null,
  });

  const triggerAssetGeneration = useCallback(
    async (
      episodeId: string,
      episodeTitle: string,
      centralThesis: string,
      theme: string
    ) => {
      setState((prev) => ({
        ...prev,
        isGenerating: true,
        progress: 10,
        error: null,
      }));

      try {
        toast.info("Generando assets visuales... esto puede tardar 2-3 minutos");

        // Use canonical invokeEdgeFunction client (handles token refresh, retry, timeout)
        const data = await invokeEdgeFunction<{ assets?: VisualAsset[] }>(
          "generate-visual-assets",
          {
            episode_id: episodeId,
            episode_title: episodeTitle,
            central_thesis: centralThesis,
            theme: theme,
          },
          { timeoutMs: 90_000 } // image generation needs longer timeout
        );

        // Update state with generated assets
        setState((prev) => ({
          ...prev,
          assets: data.assets || [],
          progress: 100,
          isGenerating: false,
        }));

        toast.success(
          `✅ ${data.assets?.length || 0} assets generados exitosamente`
        );

        // Mark episode as having visual assets
        await supabase
          .from("episodes")
          .update({ visual_status: "generado" })
          .eq("id", episodeId);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Error generando assets";
        setState((prev) => ({
          ...prev,
          isGenerating: false,
          error: message,
        }));
        showEdgeFunctionError(err instanceof Error ? err : new Error(message));
      }
    },
    []
  );

  const fetchAssets = useCallback(async (episodeId: string) => {
    try {
      const { data, error } = await supabase
        .from("generated_assets")
        .select("*")
        .eq("episode_id", episodeId);

      if (error) throw error;

      setState((prev) => ({
        ...prev,
        assets: data || [],
      }));
    } catch (err) {
      // Error fetching assets - will retry on next request
    }
  }, []);

  return {
    state,
    triggerAssetGeneration,
    fetchAssets,
  };
}
