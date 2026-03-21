// ============================================================
// Shared response helpers for AMTME Edge Functions
// ============================================================
// Provides a normalized error envelope used by every function.
// ============================================================

/** Normalized error envelope — every edge function returns this on failure. */
export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

/**
 * Build a Response with a normalized JSON error body.
 *
 * @param cors    CORS headers from getCorsHeaders()
 * @param code    Machine-readable error code (e.g. "UNAUTHORIZED")
 * @param message Human-readable error message
 * @param status  HTTP status code
 * @param details Optional extra context (validation errors, upstream body, …)
 */
export function errorResponse(
  cors: Record<string, string>,
  code: string,
  message: string,
  status: number,
  details?: unknown,
): Response {
  const body: ApiError = details !== undefined
    ? { code, message, details }
    : { code, message };
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}
