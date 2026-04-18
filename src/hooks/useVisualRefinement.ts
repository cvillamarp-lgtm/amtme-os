import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface HostBounds {
  detected: boolean;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

export interface AnalysisResult {
  hostDetected: boolean;
  hostBounds: HostBounds;
  improvements: string[];
  restrictions: string[];
}

export interface RefinementResult {
  originalImageUrl: string;
  refinedImageUrl: string;
  analysis: AnalysisResult;
}

export interface RefinementRequest {
  imageUrl: string;
  intensity: "sutil" | "media" | "alta";
  focus: "fondo" | "composicion" | "legibilidad" | "acabado" | "integral";
  episodeId?: string;
}

interface RefinementHistory {
  id: string;
  episodeId: string;
  originalImageUrl: string;
  refinedImageUrl: string;
  intensity: "sutil" | "media" | "alta";
  focus:
    | "fondo"
    | "composicion"
    | "legibilidad"
    | "acabado"
    | "integral";
  analysis: AnalysisResult;
  createdAt: string;
}

export function useVisualRefinement() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<RefinementResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refinementHistory, setRefinementHistory] = useState<
    RefinementHistory[]
  >([]);

  /**
   * Refine a visual composition using Claude Vision analysis and FLUX.1-pro generation
   */
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

  /**
   * Save a refinement to the database for version control
   */
  const saveRefinement = useCallback(
    async (
      episodeId: string,
      refinement: RefinementResult & {
        intensity: "sutil" | "media" | "alta";
        focus:
          | "fondo"
          | "composicion"
          | "legibilidad"
          | "acabado"
          | "integral";
      }
    ): Promise<boolean> => {
      try {
        const { error: dbError } = await supabase
          .from("visual_refinements")
          .insert({
            episode_id: episodeId,
            original_image_url: refinement.originalImageUrl,
            refined_image_url: refinement.refinedImageUrl,
            intensity: refinement.intensity,
            focus: refinement.focus,
            analysis: refinement.analysis,
            status: "completed",
          });

        if (dbError) throw dbError;
        return true;
      } catch (err) {
        return false;
      }
    },
    []
  );

  /**
   * Fetch refinement history for an episode
   */
  const fetchRefinements = useCallback(
    async (episodeId: string): Promise<RefinementHistory[]> => {
      try {
        const { data, error } = await supabase
          .from("visual_refinements")
          .select("*")
          .eq("episode_id", episodeId)
          .order("created_at", { ascending: false });

        if (error) throw error;

        const history = (data || []) as RefinementHistory[];
        setRefinementHistory(history);
        return history;
      } catch (err) {
        return [];
      }
    },
    []
  );

  /**
   * Clear current refinement result
   */
  const clearResult = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return {
    // State
    isProcessing,
    result,
    error,
    refinementHistory,

    // Methods
    refine,
    saveRefinement,
    fetchRefinements,
    clearResult,

    // Setters
    setResult,
    setError,
  };
}
