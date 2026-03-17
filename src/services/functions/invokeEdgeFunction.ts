// ============================================================
// Supabase Edge Functions — Canonical unified invocation client
// ============================================================
// Single entry point for every Edge Function call in the app.
//
// Usage:
//   import { invokeEdgeFunction } from "@/services/functions/invokeEdgeFunction";
//   const result = await invokeEdgeFunction<{ success: boolean }>("my-function", { foo: "bar" });
//
// What this handles uniformly:
//   - Auth bearer token injection (via Supabase client session)
//   - FunctionsHttpError (non-2xx) → extracts real message + real status code
//   - data?.error pattern → functions that return { error: "..." } with 2xx status
//   - No dependency on VITE_SUPABASE_URL at call time
//   - Automatic retry with exponential backoff + jitter for 429 / 5xx / network errors
//   - Configurable timeout (default 30 s); network timeouts are also retried
//   - Real HTTP status code exposed on thrown EdgeFunctionError
// ============================================================

import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { EdgeFunctionError } from "./edgeFunctionErrors";

// ── Options ──────────────────────────────────────────────────────────────────

export interface InvokeOptions {
  /** Maximum number of retry attempts after the first failure (default: 3) */
  maxRetries?: number;
  /** Per-attempt timeout in milliseconds (default: 30 000) */
  timeoutMs?: number;
  /** Base delay for exponential backoff in milliseconds (default: 1 000) */
  baseDelayMs?: number;
  /** Maximum random jitter added to each delay in milliseconds (default: 500) */
  jitterMs?: number;
}

// ── Internal helpers ─────────────────────────────────────────────────────────

function isRetryableStatus(status: number): boolean {
  return status === 429 || (status >= 500 && status <= 599);
}

function makeError(
  message: string,
  statusCode: number | undefined,
  isRetryable: boolean,
  attempt: number,
): EdgeFunctionError {
  const err = new Error(message) as EdgeFunctionError;
  err.statusCode = statusCode;
  err.isRetryable = isRetryable;
  err.attempt = attempt;
  return err;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function invokeEdgeFunction<T = unknown>(
  name: string,
  body?: Record<string, unknown>,
  options?: InvokeOptions,
): Promise<T> {
  const {
    maxRetries = 3,
    timeoutMs = 30_000,
    baseDelayMs = 1_000,
    jitterMs = 500,
  } = options ?? {};

  let lastError: EdgeFunctionError | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    // Exponential backoff with jitter before every retry
    if (attempt > 0) {
      const delay = baseDelayMs * Math.pow(2, attempt) + Math.random() * jitterMs;
      await sleep(delay);
    }

    try {
      // Race the invocation against a timeout promise
      const invokePromise = supabase.functions.invoke(name, { body: body ?? {} });
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(makeError(`Edge Function "${name}" timed out after ${timeoutMs}ms`, undefined, true, attempt)),
          timeoutMs,
        ),
      );

      const { data, error } = await Promise.race([invokePromise, timeoutPromise]);

      if (error) {
        let statusCode: number | undefined;
        let message = error.message;
        let isRetryable = false;

        if (error instanceof FunctionsHttpError) {
          statusCode = (error.context as Response)?.status;
          isRetryable = statusCode !== undefined && isRetryableStatus(statusCode);
          try {
            const errBody = (await (error.context as Response).clone().json()) as { error?: string };
            if (errBody?.error) message = errBody.error;
          } catch {
            // JSON parse failed — keep the default message
          }
        }

        lastError = makeError(message, statusCode, isRetryable, attempt);

        if (isRetryable && attempt < maxRetries) {
          console.warn(`[invokeEdgeFunction] "${name}" failed with ${statusCode ?? "error"}, retrying (attempt ${attempt + 1}/${maxRetries})…`);
          continue;
        }
        throw lastError;
      }

      // Some functions return 2xx but embed { error: "..." } in the body
      if (data?.error) throw makeError(data.error as string, undefined, false, attempt);

      return data as T;
    } catch (e: unknown) {
      // Timeout or network error — check if already a retryable EdgeFunctionError
      if (e instanceof Error) {
        const edgeErr = e as EdgeFunctionError;
        if (edgeErr.isRetryable) {
          lastError = edgeErr.attempt === attempt
            ? edgeErr
            : makeError(edgeErr.message, edgeErr.statusCode, true, attempt);
          if (attempt < maxRetries) {
            console.warn(`[invokeEdgeFunction] "${name}" retryable error, retrying (attempt ${attempt + 1}/${maxRetries})…`);
            continue;
          }
          throw lastError;
        }
        // Non-retryable network error (e.g. "Failed to fetch")
        if (
          e.name === "AbortError" ||
          e.message.toLowerCase().includes("failed to fetch") ||
          e.message.toLowerCase().includes("networkerror")
        ) {
          lastError = makeError(e.message, undefined, true, attempt);
          if (attempt < maxRetries) {
            console.warn(`[invokeEdgeFunction] "${name}" network error, retrying (attempt ${attempt + 1}/${maxRetries})…`);
            continue;
          }
          throw lastError;
        }
      }
      // Re-throw non-retriable errors as-is
      throw e;
    }
  }
}
