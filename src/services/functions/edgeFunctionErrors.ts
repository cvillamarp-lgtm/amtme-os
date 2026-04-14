// ============================================================
// Edge Function Error Utilities
// ============================================================
// Provides typed error interface and UI-friendly message helper
// for errors thrown by invokeEdgeFunction.
// ============================================================

import { toast } from "sonner";
export type { EdgeFunctionApiError } from "@/integrations/supabase/edge-function-types";

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
 * Single source of truth for detecting auth/session errors across the app.
 * Covers: 401 HTTP status, JWT expired, token invalid, "No autenticado", etc.
 * Use this before any generic error handler to route auth errors consistently.
 */
export function isAuthError(e: unknown): boolean {
  if (!(e instanceof Error)) return false;
  const err = e as EdgeFunctionError;
  if (err.statusCode === 401) return true;
  const msg = err.message.toLowerCase();
  return (
    msg.includes("sesión expirada") ||
    msg.includes("session expired") ||
    msg.includes("jwt expired") ||
    msg.includes("invalid jwt") ||
    msg.includes("invalid token") ||
    msg.includes("token expired") ||
    msg.includes("no autenticado") ||
    msg.includes("not authenticated") ||
    msg.includes("unauthorized")
  );
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
      return "Sesión expirada — haz clic en 'Iniciar sesión'";
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
 * Convenience: shows the canonical session-expired toast without an error object.
 * Use when a manual session guard detects no session (pre-flight check).
 */
export function showSessionExpiredToast(): void {
  const err = Object.assign(new Error("Sesión expirada, inicia sesión nuevamente"), {
    statusCode: 401,
    isRetryable: false,
    attempt: 0,
  }) as EdgeFunctionError;
  showEdgeFunctionError(err);
}

/**
 * Show a toast.error deduped by message key.
 * If the same message was shown within DEDUPE_TTL_MS, it is suppressed.
 */
export function showEdgeFunctionError(e: unknown): void {
  const err = e as EdgeFunctionError;
  const msg = getEdgeFunctionErrorMessage(e);
  const now = Date.now();

  if (err instanceof Error && err.statusCode === 401) {
    const key = "auth-expired";
    const last = _shownAt.get(key);
    if (last !== undefined && now - last < DEDUPE_TTL_MS) return;
    _shownAt.set(key, now);
    toast.error(msg, {
      duration: 10_000,
      action: {
        label: "Iniciar sesión",
        onClick: () => window.location.assign("/auth"),
      },
    });
    return;
  }

  const key = msg.slice(0, 120);
  const last = _shownAt.get(key);
  if (last !== undefined && now - last < DEDUPE_TTL_MS) return;
  _shownAt.set(key, now);

  toast.error(msg);
}
