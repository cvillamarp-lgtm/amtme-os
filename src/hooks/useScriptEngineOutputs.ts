/**
 * useScriptEngineOutputs
 * Fase 4 — Generación de 10 tipos de outputs
 * Maneja: llamadas paralelas, guardado, acceso a assets generados
 */

import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { callGenerateOutputs } from "@/lib/edge-function-proxy";

export type OutputType =
  | "editorial_summary"
  | "visual_copy"
  | "captions"
  | "hooks"
  | "quotes"
  | "carousel"
  | "stories"
  | "reels"
  | "descriptions"
  | "distribution";

export interface GeneratedAsset {
  output_number: number;
  asset_type: string;
  asset_key: string;
  content: Record<string, unknown>;
  wordCounts?: Record<string, number>;
  status: "draft" | "approved" | "rejected";
}

export interface OutputsState {
  semanticMapId: string | null;
  semanticJson: Record<string, unknown> | null;
  outputs: GeneratedAsset[];
  savedAssets: Array<{ outputNumber: number; assetId: string }>;
  outputsByType: Record<OutputType, GeneratedAsset | null>;
  loading: boolean;
  progress: number; // 0–100
  error: string | null;
}

export function useScriptEngineOutputs() {
  const [state, setState] = useState<OutputsState>({
    semanticMapId: null,
    semanticJson: null,
    outputs: [],
    savedAssets: [],
    outputsByType: {
      editorial_summary: null,
      visual_copy: null,
      captions: null,
      hooks: null,
      quotes: null,
      carousel: null,
      stories: null,
      reels: null,
      descriptions: null,
      distribution: null,
    },
    loading: false,
    progress: 0,
    error: null,
  });

  // Cargar mapa semántico
  const loadSemanticMap = useCallback(
    async (semanticMapId: string) => {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const { data, error } = await supabase
          .from("semantic_maps")
          .select("*")
          .eq("id", semanticMapId)
          .single();

        if (error) throw error;

        setState((prev) => ({
          ...prev,
          semanticMapId,
          semanticJson: data?.semantic_json || null,
          loading: false,
        }));
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error cargando mapa semántico";
        setState((prev) => ({ ...prev, error: message, loading: false }));
      }
    },
    []
  );

  // Generar los 10 outputs en paralelo
  const generateOutputs = useCallback(
    async (semanticMapId: string, semanticJson: Record<string, unknown>) => {
      setState((prev) => ({ ...prev, loading: true, error: null, progress: 0 }));

      try {
        // Simular progreso mientras se generan
        const progressInterval = setInterval(() => {
          setState((prev) => ({
            ...prev,
            progress: Math.min(prev.progress + 10, 90),
          }));
        }, 500);

        const result = await callGenerateOutputs(semanticJson);
        clearInterval(progressInterval);

        const mappedOutputs: GeneratedAsset[] = (result.outputs || []).map((output, idx) => {
          const outputNumber = output.output_number ?? idx + 1;
          const typeMap: Record<number, OutputType> = {
            1: "editorial_summary",
            2: "visual_copy",
            3: "captions",
            4: "hooks",
            5: "quotes",
            6: "carousel",
            7: "stories",
            8: "reels",
            9: "descriptions",
            10: "distribution",
          };
          const mappedType = typeMap[outputNumber];
          return {
            output_number: outputNumber,
            asset_type: (output.asset_type || output.type || mappedType || "output") as string,
            asset_key: `output_${String(outputNumber).padStart(2, "0")}`,
            content:
              typeof output.content === "string"
                ? { text: output.content }
                : (output.content as Record<string, unknown>),
            wordCounts: output.word_counts_json,
            status: "draft",
          };
        });

        let savedAssets: Array<{ outputNumber: number; assetId: string }> =
          result.savedAssets || [];

        if (savedAssets.length === 0 && mappedOutputs.length > 0) {
          const payload = mappedOutputs.map((out) => ({
            semantic_map_id: semanticMapId,
            asset_type: "output",
            asset_key: out.asset_key,
            content_json: out.content,
            word_counts_json: out.wordCounts || null,
            status: "draft",
          }));

          const { data: inserted, error: insertError } = await supabase
            .from("generated_assets")
            .insert(payload)
            .select("id, asset_key");

          if (!insertError && inserted) {
            savedAssets = inserted.map((row, idx) => ({
              outputNumber: idx + 1,
              assetId: row.id,
            }));
          }
        }

        // Mapear outputs por tipo
        const outputsByType: Record<OutputType, GeneratedAsset | null> = {
          editorial_summary: null,
          visual_copy: null,
          captions: null,
          hooks: null,
          quotes: null,
          carousel: null,
          stories: null,
          reels: null,
          descriptions: null,
          distribution: null,
        };

        mappedOutputs.forEach((output) => {
          const typeMap: Record<number, OutputType> = {
            1: "editorial_summary",
            2: "visual_copy",
            3: "captions",
            4: "hooks",
            5: "quotes",
            6: "carousel",
            7: "stories",
            8: "reels",
            9: "descriptions",
            10: "distribution",
          };
          const type = typeMap[output.output_number];
          if (type) {
            outputsByType[type] = {
              ...output,
              asset_type: type,
              asset_key: `output_${String(output.output_number).padStart(2, "0")}`,
            };
          }
        });

        setState((prev) => ({
          ...prev,
          semanticMapId,
          semanticJson,
          outputs: mappedOutputs,
          savedAssets,
          outputsByType,
          loading: false,
          progress: 100,
        }));
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error generando outputs";
        setState((prev) => ({ ...prev, error: message, loading: false, progress: 0 }));
        throw err;
      }
    },
    []
  );

  // Obtener un output específico
  const getOutput = useCallback(
    (outputNumber: number) => {
      return state.outputs.find((o) => o.output_number === outputNumber) || null;
    },
    [state.outputs]
  );

  // Obtener output por tipo
  const getOutputByType = useCallback(
    (type: OutputType): GeneratedAsset | null => {
      return state.outputsByType[type] || null;
    },
    [state.outputsByType]
  );

  return {
    state,
    loadSemanticMap,
    generateOutputs,
    getOutput,
    getOutputByType,
  };
}
