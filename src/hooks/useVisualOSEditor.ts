/**
 * useVisualOSEditor
 * Hook para editar piezas visuales con paletas, host image, y validaciones
 */

import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  calculateContrastRatio,
  PALETTE_SYSTEM,
  computeFreePalette,
} from "@/lib/design-utils";

export interface VisualAssetContent {
  keyword: string;
  headline: string;
  subheadline?: string;
  bodyText?: string;
  cta?: string;
  episodeBadge?: string;
}

export interface VisualEditorState {
  pieceNumber: number;
  paletteId: 1 | 2 | 3 | 4 | 5;
  customPalette?: { bg: string; accent: string; text: string };
  hostImage: "REF_1" | "REF_2" | "none";
  content: VisualAssetContent;
  canvasPreview: string | null;
  validations: {
    contrastAccentBg: number | null;
    contrastTextBg: number | null;
    warnings: string[];
    errors: string[];
  };
  loading: boolean;
  error: string | null;
}

export function useVisualOSEditor() {
  const [state, setState] = useState<VisualEditorState>({
    pieceNumber: 1,
    paletteId: 1,
    hostImage: "REF_2",
    content: {
      keyword: "",
      headline: "",
    },
    canvasPreview: null,
    validations: {
      contrastAccentBg: null,
      contrastTextBg: null,
      warnings: [],
      errors: [],
    },
    loading: false,
    error: null,
  });

  // Actualizar contenido
  const updateContent = useCallback((updates: Partial<VisualAssetContent>) => {
    setState((prev) => ({
      ...prev,
      content: { ...prev.content, ...updates },
    }));
  }, []);

  // Cambiar paleta
  const setPalette = useCallback((paletteId: 1 | 2 | 3 | 4 | 5) => {
    setState((prev) => ({
      ...prev,
      paletteId,
      customPalette: undefined,
    }));
  }, []);

  const setHostImage = useCallback((hostImage: "REF_1" | "REF_2" | "none") => {
    setState((prev) => ({
      ...prev,
      hostImage,
    }));
  }, []);

  // Validar contraste
  const validateContrast = useCallback((bg?: string, accent?: string, text?: string) => {
    const palette = state.customPalette || PALETTE_SYSTEM[state.paletteId as 1 | 2 | 3 | 4] || PALETTE_SYSTEM[1];

    const bgColor = bg || palette.bg;
    const accentColor = accent || palette.accent;
    const textColor = text || palette.text;

    const contrastAccent = calculateContrastRatio(accentColor, bgColor);
    const contrastText = calculateContrastRatio(textColor, bgColor);

    const warnings: string[] = [];
    const errors: string[] = [];

    if (contrastAccent < 4.5) {
      warnings.push("⚠️ Contraste bajo entre acento y fondo — puede no verse en miniatura");
    }
    if (contrastText < 4.5) {
      errors.push("🔴 Texto ilegible — contraste insuficiente");
    }
    if (!state.content.keyword) {
      errors.push("🔴 Keyword obligatoria");
    }
    if (!state.content.headline) {
      errors.push("🔴 Headline obligatoria");
    }
    if (!state.hostImage || state.hostImage === "none") {
      warnings.push("ℹ️ Pieza sin figura humana");
    }

    setState((prev) => ({
      ...prev,
      validations: {
        contrastAccentBg: contrastAccent,
        contrastTextBg: contrastText,
        warnings,
        errors,
      },
    }));
  }, [state.paletteId, state.customPalette, state.content.keyword, state.content.headline, state.hostImage]);

  // Actualizar paleta libre (P5)
  const updateCustomPalette = useCallback(
    (bg: string, accent: string, text: string) => {
      const free = computeFreePalette(bg, accent, text);
      setState((prev) => ({
        ...prev,
        paletteId: 5,
        customPalette: free,
      }));
      validateContrast(bg, accent, text);
    },
    [validateContrast]
  );

  // Generar preview en canvas
  const generatePreview = useCallback(async () => {
    // Placeholder: en la práctica, esto llamaría a renderCanvas()
    setState((prev) => ({
      ...prev,
      canvasPreview: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    }));
  }, []);

  // Guardar asset
  const saveAsset = useCallback(
    async (episodeId: string) => {
      if (state.validations.errors.length > 0) {
        setState((prev) => ({
          ...prev,
          error: "Corrige los errores antes de guardar",
        }));
        return;
      }

      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const { data: { user } } = await supabase.auth.getUser();
        const { data, error } = await supabase
          .from("asset_versions")
          .insert({
            episode_id: episodeId,
            created_by: user?.id,
            content_json: state.content,
            status: "draft",
          })
          .select("id")
          .single();

        if (error) throw error;

        setState((prev) => ({
          ...prev,
          loading: false,
        }));

        return data?.id;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error guardando asset";
        setState((prev) => ({ ...prev, error: message, loading: false }));
        throw err;
      }
    },
    [state.content, state.validations]
  );

  return {
    state,
    updateContent,
    setPalette,
    setHostImage,
    updateCustomPalette,
    validateContrast,
    generatePreview,
    saveAsset,
  };
}
