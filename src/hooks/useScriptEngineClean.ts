/**
 * useScriptEngineClean
 * Fase 2 — Limpieza automática del Script Engine
 * Maneja: llamada a edge function clean-text, split view, aprobación
 */

import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { callCleanText } from "@/lib/edge-function-proxy";

export interface CleanState {
  rawInputId: string | null;
  rawText: string;
  rawWordCount: number;
  cleanedText: string;
  cleanedWordCount: number;
  reductionPercentage: number | null;
  cleanedTextId: string | null;
  approved: boolean;
  loading: boolean;
  error: string | null;
}

export function useScriptEngineClean() {
  const [state, setState] = useState<CleanState>({
    rawInputId: null,
    rawText: "",
    rawWordCount: 0,
    cleanedText: "",
    cleanedWordCount: 0,
    reductionPercentage: null,
    cleanedTextId: null,
    approved: false,
    loading: false,
    error: null,
  });

  // Cargar raw_input
  const loadRawInput = useCallback(
    async (rawInputId: string) => {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const { data, error } = await supabase
          .from("raw_inputs")
          .select("*")
          .eq("id", rawInputId)
          .single();

        if (error) throw error;

        setState((prev) => ({
          ...prev,
          rawInputId,
          rawText: data?.raw_text || "",
          rawWordCount: data?.raw_word_count || 0,
          loading: false,
        }));
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error cargando raw input";
        setState((prev) => ({ ...prev, error: message, loading: false }));
      }
    },
    []
  );

  // Llamar a edge function para limpiar texto
  const cleanText = useCallback(
    async (rawInputId: string, rawText: string) => {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const result = await callCleanText(rawText);
        const originalWordCount =
          result.original_word_count ?? result.raw_word_count ?? rawText.trim().split(/\s+/).length;

        const reductionPct =
          originalWordCount > 0
            ? Math.round(
                ((originalWordCount - result.cleaned_word_count) /
                  originalWordCount) *
                  10000
              ) / 100
            : 0;

        setState((prev) => ({
          ...prev,
          rawInputId,
          rawText,
          rawWordCount: originalWordCount,
          cleanedText: result.cleaned_text,
          cleanedWordCount: result.cleaned_word_count,
          reductionPercentage: reductionPct,
          cleanedTextId: result.cleaned_text_id ?? null,
          loading: false,
        }));
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error en limpieza";
        setState((prev) => ({ ...prev, error: message, loading: false }));
        throw err;
      }
    },
    []
  );

  // Aprobar texto limpio
  const approveCleaned = useCallback(async () => {
    if (!state.rawInputId) return null;

    // Validaciones
    if (state.cleanedWordCount < 250) {
      setState((prev) => ({
        ...prev,
        error: `Texto limpio muy corto (${state.cleanedWordCount} palabras — mínimo 250)`,
      }));
      return;
    }

    if (state.reductionPercentage && state.reductionPercentage > 35) {
      setState((prev) => ({
        ...prev,
        error: `Reducción demasiado alta (${state.reductionPercentage}% — máximo 35%)`,
      }));
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      let cleanedTextId = state.cleanedTextId;

      if (!cleanedTextId) {
        const { data: inserted, error: insertError } = await supabase
          .from("cleaned_texts")
          .insert({
            raw_input_id: state.rawInputId,
            cleaned_text: state.cleanedText,
            cleaned_word_count: state.cleanedWordCount,
            reduction_percentage: state.reductionPercentage,
            approved: true,
            approved_at: new Date().toISOString(),
          })
          .select("id")
          .single();

        if (insertError) throw insertError;
        cleanedTextId = inserted?.id ?? null;
      } else {
        const { error: updateError } = await supabase
          .from("cleaned_texts")
          .update({
            approved: true,
            approved_at: new Date().toISOString(),
          })
          .eq("id", cleanedTextId);

        if (updateError) throw updateError;
      }

      setState((prev) => ({
        ...prev,
        cleanedTextId,
        approved: true,
        loading: false,
      }));

      return cleanedTextId;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error aprobando limpieza";
      setState((prev) => ({ ...prev, error: message, loading: false }));
      throw err;
    }
  }, [
    state.rawInputId,
    state.cleanedTextId,
    state.cleanedText,
    state.cleanedWordCount,
    state.reductionPercentage,
  ]);

  return {
    state,
    loadRawInput,
    cleanText,
    approveCleaned,
  };
}
