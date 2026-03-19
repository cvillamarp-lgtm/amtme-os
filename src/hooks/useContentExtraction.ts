import { useState, useCallback } from "react";
import { invokeEdgeFunction } from "@/services/functions/invokeEdgeFunction";
import { SeccionA, SeccionB } from "@/lib/master-template";

export interface ExtractionResult {
  seccionA: SeccionA;
  seccionB: SeccionB;
}

export function useContentExtraction() {
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [editableSeccionB, setEditableSeccionB] = useState<SeccionB | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const extractContent = useCallback(async (script: string) => {
    setIsExtracting(true);
    setError(null);
    setResult(null);
    setEditableSeccionB(null);

    try {
      const extraction = await invokeEdgeFunction<ExtractionResult>("extract-content", { script }, { timeoutMs: 60_000 });
      setResult(extraction);
      setEditableSeccionB(JSON.parse(JSON.stringify(extraction.seccionB)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setIsExtracting(false);
    }
  }, []);

  const updateField = useCallback(
    (piezaId: keyof SeccionB, field: string, value: string) => {
      setEditableSeccionB((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          [piezaId]: {
            ...(prev[piezaId] as Record<string, string>),
            [field]: value,
          },
        };
      });
    },
    []
  );

  const reset = useCallback(() => {
    setResult(null);
    setEditableSeccionB(null);
    setError(null);
  }, []);

  return {
    result,
    editableSeccionB,
    isExtracting,
    error,
    extractContent,
    updateField,
    reset,
  };
}
