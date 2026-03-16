// ============================================================
// Supabase Edge Functions — Unified invocation wrapper
// ============================================================
// Usage:
//   import { invokeFunction } from "@/lib/supabase-functions";
//   const result = await invokeFunction<{ success: boolean }>("my-function", { foo: "bar" });
//
// Handles:
//   - FunctionsHttpError  → thrown as Error with message
//   - data?.error pattern → functions return { error: "..." } with status 200
// ============================================================

import { supabase } from "@/integrations/supabase/client";

export async function invokeFunction<T = unknown>(
  name: string,
  body?: Record<string, unknown>,
): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, {
    body: body ?? {},
  });

  if (error) {
    // For HTTP errors (non-2xx), try to extract the actual message from the
    // function's JSON response body (e.g. { error: "Límite de uso alcanzado" })
    const httpErr = error as { context?: Response };
    if (httpErr.context) {
      try {
        const errBody = await httpErr.context.clone().json() as { error?: string };
        if (errBody?.error) throw new Error(errBody.error);
      } catch (innerErr) {
        // Re-throw only if this is the error we created above, not a JSON parse error
        if (innerErr instanceof Error && innerErr !== error) throw innerErr;
      }
    }
    throw new Error(error.message);
  }

  // Functions that return 2xx but include { error: "..." } in the body
  if (data?.error) throw new Error(data.error as string);

  return data as T;
}
