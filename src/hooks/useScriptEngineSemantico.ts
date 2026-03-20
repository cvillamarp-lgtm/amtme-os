/**
 * useScriptEngineSemantico
 * Fase 3 — Mapa Semántico del Script Engine
 * Maneja: generación del mapa semántico, sugerencias de paleta/imagen, aprobación
 */

import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { callSemanticMap } from "@/lib/edge-function-proxy";
import {
  suggestPaletteBasedOnTone,
  suggestHostImageBasedOnTone,
} from "@/lib/design-utils";

export interface SemanticMapData {
  episode_metadata: {
    working_title?: string;
    central_theme?: string;
    central_thesis: string;
    episode_promise: string;
    central_conflict: string;
    main_question?: string;
    dominant_emotional_tone: string;
    emotional_intensity_level: "bajo" | "medio" | "alto";
    predominant_narrative_stage?: string;
    implicit_cta?: string;
    explicit_cta?: string;
    keywords?: string[];
    psychological_concepts?: string[];
  };
  narrative_arc?: Record<string, string>;
  semantic_blocks?: string[];
  key_phrases?: string[];
  short_quotes?: string[];
  long_quotes?: string[];
  reel_hooks?: string[];
  carousel_ideas?: string[];
  story_prompts?: string[];
  cta_lines?: string[];
  memorable_lines?: string[];
  shareable_phrases?: string[];
  polarizing_concepts?: string[];
}

export interface SemanticState {
  episodeId: string | null;
  rawInputId: string | null;
  cleanedTextId: string | null;
  cleanedText: string;
  semanticJson: SemanticMapData | null;
  dominantEmotionalTone: string;
  emotionalIntensityLevel: "bajo" | "medio" | "alto" | null;
  suggestedPaletteId: 1 | 2 | 3 | 4;
  suggestedHostImage: "REF_1" | "REF_2";
  semanticMapId: string | null;
  approved: boolean;
  wordCountsValidation: { valid: boolean; warnings: string[] };
  loading: boolean;
  error: string | null;
}

export function useScriptEngineSemantico() {
  const [state, setState] = useState<SemanticState>({
    episodeId: null,
    rawInputId: null,
    cleanedTextId: null,
    cleanedText: "",
    semanticJson: null,
    dominantEmotionalTone: "",
    emotionalIntensityLevel: null,
    suggestedPaletteId: 1,
    suggestedHostImage: "REF_2",
    semanticMapId: null,
    approved: false,
    wordCountsValidation: { valid: true, warnings: [] },
    loading: false,
    error: null,
  });

  function countWords(text: string): number {
    return text.trim() ? text.trim().split(/\s+/).length : 0;
  }

  function normalizeIntensity(level: string): "bajo" | "medio" | "alto" {
    const l = (level || "").toLowerCase();
    if (l === "high" || l === "alto") return "alto";
    if (l === "low" || l === "bajo") return "bajo";
    return "medio";
  }

  // Cargar cleaned_text
  const loadCleanedText = useCallback(
    async (cleanedTextId: string) => {
      if (!supabase) return;

      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const { data, error } = await supabase
          .from("cleaned_texts")
          .select("id, raw_input_id, cleaned_text")
          .eq("id", cleanedTextId)
          .single();

        if (error) throw error;

        let episodeId: string | null = null;
        if (data?.raw_input_id) {
          const { data: rawInputData, error: rawInputError } = await supabase
            .from("raw_inputs")
            .select("episode_id")
            .eq("id", data.raw_input_id)
            .single();
          if (rawInputError) throw rawInputError;
          episodeId = rawInputData?.episode_id ?? null;
        }

        setState((prev) => ({
          ...prev,
          episodeId,
          rawInputId: data?.raw_input_id ?? null,
          cleanedTextId,
          cleanedText: data?.cleaned_text || "",
          loading: false,
        }));
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error cargando texto limpio";
        setState((prev) => ({ ...prev, error: message, loading: false }));
      }
    },
    [supabase]
  );

  // Generar mapa semántico vía edge function
  const generateSemanticMap = useCallback(
    async (cleanedText: string) => {
      if (!supabase || !state.episodeId || !state.cleanedTextId) return;

      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const result = await callSemanticMap(cleanedText);
        const semanticJson = result.semantic_json as SemanticMapData;

        const meta =
          ((semanticJson as Record<string, unknown>).episode_metadata as Record<string, string> | undefined) ??
          (semanticJson as unknown as Record<string, string>);

        const dominantTone = meta?.dominant_emotional_tone || "";
        const intensity = normalizeIntensity(
          meta?.emotional_intensity_level || (meta?.intensity_level as string) || "medio"
        );

        const thesisWords = countWords(meta?.central_thesis || "");
        const conflictWords = countWords(meta?.central_conflict || "");
        const promiseWords = countWords(meta?.episode_promise || "");

        const warnings: string[] = [...(result.range_warnings ?? [])];
        if (thesisWords < 15 || thesisWords > 80) {
          warnings.push(`central_thesis fuera de rango (${thesisWords} palabras, esperado 15–80)`);
        }
        if (conflictWords < 10 || conflictWords > 60) {
          warnings.push(`central_conflict fuera de rango (${conflictWords} palabras, esperado 10–60)`);
        }
        if (promiseWords < 10 || promiseWords > 50) {
          warnings.push(`episode_promise fuera de rango (${promiseWords} palabras, esperado 10–50)`);
        }

        const suggestedPaletteId =
          (result.suggested_palette_id as 1 | 2 | 3 | 4 | undefined) ??
          (suggestPaletteBasedOnTone(dominantTone, intensity) as 1 | 2 | 3 | 4);
        const suggestedHostImage =
          result.suggested_host_image ?? suggestHostImageBasedOnTone(dominantTone, intensity);

        let semanticMapId = result.semantic_map_id ?? null;

        if (!semanticMapId) {
          const { data: saved, error: saveError } = await supabase
            .from("semantic_maps")
            .insert({
              episode_id: state.episodeId,
              raw_input_id: state.rawInputId,
              cleaned_text_id: state.cleanedTextId,
              semantic_json: semanticJson,
              dominant_emotional_tone: dominantTone,
              emotional_intensity_level: intensity,
              suggested_palette_id: suggestedPaletteId,
              suggested_host_image: suggestedHostImage,
              word_counts_json: {
                central_thesis: thesisWords,
                central_conflict: conflictWords,
                episode_promise: promiseWords,
              },
            })
            .select("id")
            .single();

          if (saveError) throw saveError;
          semanticMapId = saved?.id ?? null;
        }

        setState((prev) => ({
          ...prev,
          episodeId: state.episodeId,
          rawInputId: state.rawInputId,
          cleanedTextId: state.cleanedTextId,
          cleanedText,
          semanticJson,
          dominantEmotionalTone: dominantTone,
          emotionalIntensityLevel: intensity,
          suggestedPaletteId,
          suggestedHostImage,
          semanticMapId,
          wordCountsValidation: {
            valid: warnings.length === 0,
            warnings,
          },
          loading: false,
        }));
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error en análisis semántico";
        setState((prev) => ({ ...prev, error: message, loading: false }));
        throw err;
      }
    },
    [supabase, state.episodeId, state.rawInputId, state.cleanedTextId]
  );

  // Aprobar mapa semántico
  const approveSemanticMap = useCallback(async () => {
    if (!supabase || !state.semanticMapId) return false;

      // Validar que no haya warnings críticos
      if (!state.wordCountsValidation.valid) {
        setState((prev) => ({
          ...prev,
          error: `Hay campos fuera de rango. Corrígelos primero:\\n${state.wordCountsValidation.warnings.join("\\n")}`,
        }));
        return false;
      }

      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const { error } = await supabase
          .from("semantic_maps")
          .update({
            approved: true,
            approved_at: new Date().toISOString(),
          })
          .eq("id", state.semanticMapId);

        if (error) throw error;

        setState((prev) => ({
          ...prev,
          approved: true,
          loading: false,
        }));
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error aprobando mapa";
        setState((prev) => ({ ...prev, error: message, loading: false }));
        throw err;
      }
  }, [supabase, state.semanticMapId, state.wordCountsValidation]);

  return {
    state,
    loadCleanedText,
    generateSemanticMap,
    approveSemanticMap,
  };
}
