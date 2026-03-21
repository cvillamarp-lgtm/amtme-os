/**
 * useScriptEngineIngesta
 * Fase 1 — Ingesta del Script Engine
 * Maneja: creación de episodio, guardado de raw_input, contadores en tiempo real
 */

import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

function countWords(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

export interface IngestaState {
  episodeId: string | null;
  episodeTitle: string;
  season: number | null;
  episodeNumber: number | null;
  sourceType: "guion" | "transcripcion" | "notas";
  rawText: string;
  wordCount: number;
  characterCount: number;
  estimatedDurationSecs: number | null;
  loading: boolean;
  error: string | null;
}

export function useScriptEngineIngesta() {
  const [state, setState] = useState<IngestaState>({
    episodeId: null,
    episodeTitle: "",
    season: null,
    episodeNumber: null,
    sourceType: "transcripcion",
    rawText: "",
    wordCount: 0,
    characterCount: 0,
    estimatedDurationSecs: null,
    loading: false,
    error: null,
  });

  // Crear o actualizar episodio
  const createEpisode = useCallback(
    async (title: string, season?: number, episodeNumber?: number) => {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const { data, error } = await supabase
          .from("episodes")
          .insert({
            title,
            season,
            episode_number: episodeNumber,
            status: "draft",
          })
          .select("id")
          .single();

        if (error) throw error;

        setState((prev) => ({
          ...prev,
          episodeId: data?.id || null,
          episodeTitle: title,
          season: season || null,
          episodeNumber: episodeNumber || null,
          loading: false,
        }));

        return data?.id;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error creando episodio";
        setState((prev) => ({ ...prev, error: message, loading: false }));
        throw err;
      }
    },
    []
  );

  // Actualizar texto raw y contadores
  const updateRawText = useCallback((text: string) => {
    const wordCount = countWords(text);
    const characterCount = text.length;
    // Estimación: 150 palabras por minuto
    const estimatedDurationSecs = Math.ceil((wordCount / 150) * 60);

    setState((prev) => ({
      ...prev,
      rawText: text,
      wordCount,
      characterCount,
      estimatedDurationSecs,
    }));
  }, []);

  // Guardar raw_input en Supabase
  const saveRawInput = useCallback(
    async (sourceType: "guion" | "transcripcion" | "notas") => {
      if (!state.episodeId) {
        setState((prev) => ({ ...prev, error: "Episode no seleccionado" }));
        return;
      }

      if (state.wordCount < 300) {
        setState((prev) => ({
          ...prev,
          error: "El texto debe tener al menos 300 palabras",
        }));
        return;
      }

      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const { data, error } = await supabase
          .from("raw_inputs")
          .insert({
            episode_id: state.episodeId,
            source_type: sourceType,
            raw_text: state.rawText,
            raw_word_count: state.wordCount,
            raw_character_count: state.characterCount,
            estimated_duration_secs: state.estimatedDurationSecs,
          })
          .select("id")
          .single();

        if (error) throw error;

        setState((prev) => ({
          ...prev,
          sourceType,
          loading: false,
        }));

        return data?.id;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error guardando ingesta";
        setState((prev) => ({ ...prev, error: message, loading: false }));
        throw err;
      }
    },
    [state.episodeId, state.rawText, state.wordCount, state.characterCount, state.estimatedDurationSecs]
  );

  return {
    state,
    createEpisode,
    updateRawText,
    saveRawInput,
  };
}
