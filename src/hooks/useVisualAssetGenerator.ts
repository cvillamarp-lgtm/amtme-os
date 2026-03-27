import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

        // Call the generate-visual-assets Edge Function
        const { data, error } = await supabase.functions.invoke(
          "generate-visual-assets",
          {
            body: {
              episode_id: episodeId,
              episode_title: episodeTitle,
              central_thesis: centralThesis,
              theme: theme,
            },
          }
        );

        if (error) throw error;

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
          err instanceof Error ? err.message : "Error generating assets";
        setState((prev) => ({
          ...prev,
          isGenerating: false,
          error: message,
        }));
        toast.error(`Error: ${message}`);
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
      console.error("Error fetching assets:", err);
    }
  }, []);

  return {
    state,
    triggerAssetGeneration,
    fetchAssets,
  };
}
