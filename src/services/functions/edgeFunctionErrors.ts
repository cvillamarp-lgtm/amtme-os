// ============================================================
// Edge Function Error Utilities
// ============================================================
// Provides typed error interface and UI-friendly message helper
// for errors thrown by invokeEdgeFunction.
// ============================================================

/** Typed error thrown by invokeEdgeFunction */
export interface EdgeFunctionError extends Error {
  /** HTTP status code from the Edge Function response, if available */
  statusCode?: number;
  /** Whether the error is eligible for automatic retry */
  isRetryable: boolean;
  /** Zero-based attempt index on which the error occurred */
  attempt: number;
}

/**
 * Returns a human-readable, Spanish UI message for an EdgeFunctionError.
 * Falls back to `error.message` for unknown status codes.
 */
export function getEdgeFunctionErrorMessage(e: unknown): string {
  if (!(e instanceof Error)) return "Error desconocido";

  const err = e as EdgeFunctionError;
  switch (err.statusCode) {
    case 401:
      return "Sesión expirada, por favor inicie sesión nuevamente";
    case 404:
      return "Función no desplegada en Supabase";
    case 429:
      return "Límite de solicitudes alcanzado, reintentando...";
    default:
      return err.message || "Error desconocido";
  }
}
