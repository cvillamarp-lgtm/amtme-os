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
//   - FunctionsHttpError (non-2xx) → extracts real message from response JSON body
//   - data?.error pattern → functions that return { error: "..." } with 2xx status
//   - No dependency on VITE_SUPABASE_URL at call time
// ============================================================

import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export async function invokeEdgeFunction<T = unknown>(
  name: string,
  body?: Record<string, unknown>,
): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, {
    body: body ?? {},
  });

  if (error) {
    // FunctionsHttpError carries the raw Response — extract the real JSON message
    if (error instanceof FunctionsHttpError) {
      try {
        const errBody = (await error.context.clone().json()) as { error?: string };
        if (errBody?.error) throw new Error(errBody.error);
      } catch (inner) {
        // Re-throw only if we created the error above, not a JSON-parse failure
        if (inner instanceof Error && inner !== error) throw inner;
      }
    }
    throw new Error(error.message);
  }

  // Some functions return 2xx but embed { error: "..." } in the body
  if (data?.error) throw new Error(data.error as string);

  return data as T;
}
