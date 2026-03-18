// ============================================================
// Supabase Edge Functions — Canonical unified invocation client
// ============================================================
import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { EdgeFunctionError } from "./edgeFunctionErrors";

export interface InvokeOptions {
  maxRetries?: number;
  timeoutMs?: number;
  baseDelayMs?: number;
  jitterMs?: number;
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || (status >= 500 && status <= 599);
  // 401 is NOT retried blindly — it gets special handling below
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

/**
 * Ensures the Supabase session is valid before an Edge Function call.
 * - If the access token expires within 60 s, proactively refreshes.
 * - Returns the current access_token (may be null if not signed in).
 */
async function ensureFreshToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  const now = Math.floor(Date.now() / 1000);
  if (session.expires_at && session.expires_at - now < 60) {
    const { data } = await supabase.auth.refreshSession();
    return data.session?.access_token ?? null;
  }
  return session.access_token;
}

export async function invokeEdgeFunction<T = unknown>(
  name: string,
  body?: Record<string, unknown>,
  options?: InvokeOptions,
): Promise<T> {
  const {
    maxRetries = 2,         // reduced — 401 fails fast now
    timeoutMs = 30_000,
    baseDelayMs = 1_000,
    jitterMs = 500,
  } = options ?? {};

  let lastError: EdgeFunctionError | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) {
      const delay = baseDelayMs * Math.pow(2, attempt) + Math.random() * jitterMs;
      await sleep(delay);
    }

    // ── Ensure fresh token before every attempt ─────────────────────────────
    const accessToken = await ensureFreshToken();

    try {
      const invokePromise = supabase.functions.invoke(name, {
        body: body ?? {},
        // Explicit Authorization overrides the client's cached token, ensuring
        // that a just-refreshed token is always used on the very next request.
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      });

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

        // ── 401 special path: try ONE refresh then retry once ─────────────
        if (statusCode === 401) {
          if (attempt < maxRetries) {
            const { data: refreshData } = await supabase.auth.refreshSession();
            if (!refreshData.session) {
              // Refresh token also expired — no point retrying
              throw makeError("Sesión expirada, inicia sesión nuevamente", 401, false, attempt);
            }
            // Refresh succeeded — loop will re-run with the fresh token
            console.warn(`[invokeEdgeFunction] "${name}" 401, session refreshed — retrying…`);
            continue;
          }
          // Out of retries
          throw makeError("Sesión expirada, inicia sesión nuevamente", 401, false, attempt);
        }

        lastError = makeError(message, statusCode, isRetryable, attempt);

        if (isRetryable && attempt < maxRetries) {
          console.warn(`[invokeEdgeFunction] "${name}" failed with ${statusCode ?? "error"}, retrying (${attempt + 1}/${maxRetries})…`);
          continue;
        }
        throw lastError;
      }

      if (data?.error) throw makeError(data.error as string, undefined, false, attempt);
      return data as T;

    } catch (e: unknown) {
      if (e instanceof Error) {
        const edgeErr = e as EdgeFunctionError;
        if (edgeErr.isRetryable) {
          lastError = edgeErr.attempt === attempt
            ? edgeErr
            : makeError(edgeErr.message, edgeErr.statusCode, true, attempt);
          if (attempt < maxRetries) {
            console.warn(`[invokeEdgeFunction] "${name}" retryable error, retrying (${attempt + 1}/${maxRetries})…`);
            continue;
          }
          throw lastError;
        }
        if (
          e.name === "AbortError" ||
          e.message.toLowerCase().includes("failed to fetch") ||
          e.message.toLowerCase().includes("networkerror")
        ) {
          lastError = makeError(e.message, undefined, true, attempt);
          if (attempt < maxRetries) {
            console.warn(`[invokeEdgeFunction] "${name}" network error, retrying (${attempt + 1}/${maxRetries})…`);
            continue;
          }
          throw lastError;
        }
      }
      throw e;
    }
  }
}
