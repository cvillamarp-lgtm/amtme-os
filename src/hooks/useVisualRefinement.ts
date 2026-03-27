import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface RefinementRequest {
  imageUrl: string;
  intensity: "sutil" | "media" | "alta";
  focus: "fondo" | "composicion" | "legibilidad" | "acabado" | "integral";
  episodeId: string;
}

export interface RefinementResult {
  original: string;
  refined: string;
  analysis: {
    hostDetected: boolean;
    hostBounds?: { x: number; y: number; width: number; height: number };
    improvements: string[];
    restrictions: string[];
  };
}

export function useVisualRefinement() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<RefinementResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refine = useCallback(
    async (request: RefinementRequest): Promise<RefinementResult | null> => {
      setIsProcessing(true);
      setError(null);

      try {
        const { data, error: invokeError } = await supabase.functions.invoke(
          "refine-visual-composition",
          {
            body: request,
          }
        );

        if (invokeError) throw invokeError;

        setResult(data);
        return data;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Error refining composition";
        setError(message);
        return null;
      } finally {
        setIsProcessing(false);
      }
    },
    []
  );

  const saveRefinement = useCallback(
    async (episodeId: string, result: RefinementResult, intensity: string, focus: string) => {
      try {
        const { error: insertError } = await supabase
          .from("visual_refinements")
          .insert({
            episode_id: episodeId,
            original_image_url: result.original,
            refined_image_url: result.refined,
            intensity,
            focus,
            analysis: result.analysis,
            status: "completed",
          });

        if (insertError) throw insertError;
        return true;
      } catch (err) {
        console.error("Error saving refinement:", err);
        return false;
      }
    },
    []
  );

  const fetchRefinements = useCallback(async (episodeId: string) => {
    try {
      const { data, error } = await supabase
        .from("visual_refinements")
        .select("*")
        .eq("episode_id", episodeId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error("Error fetching refinements:", err);
      return [];
    }
  }, []);

  return {
    isProcessing,
    result,
    error,
    refine,
    saveRefinement,
    fetchRefinements,
  };
}
