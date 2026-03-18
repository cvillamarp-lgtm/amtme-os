// ============================================================
// Edge Function Error Utilities
// ============================================================
// Provides typed error interface and UI-friendly message helper
// for errors thrown by invokeEdgeFunction.
// ============================================================

import { toast } from "sonner";

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

// ── Toast dedupe (in-memory, 30s TTL) ────────────────────────────────────────
// Prevents the same error toast from spamming when an Edge Function is down
// or rate-limited and multiple actions fire in quick succession.

const _shownAt = new Map<string, number>();
const DEDUPE_TTL_MS = 30_000;

/**
 * Show a toast.error deduped by message key.
 * If the same message was shown within DEDUPE_TTL_MS, it is suppressed.
 */
export function showEdgeFunctionError(e: unknown): void {
  const err = e as EdgeFunctionError;
  const msg = getEdgeFunctionErrorMessage(e);
  const now = Date.now();
  const key = msg.slice(0, 120);
  const last = _shownAt.get(key);
  if (last !== undefined && now - last < DEDUPE_TTL_MS) return;
  _shownAt.set(key, now);

  if (err instanceof Error && err.statusCode === 401) {
    toast.error(msg, {
      duration: 10_000,
      action: {
        label: "Iniciar sesión",
        onClick: () => window.location.assign("/auth"),
      },
    });
    return;
  }

  toast.error(msg);
}
