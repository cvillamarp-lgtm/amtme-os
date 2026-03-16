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

  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error as string);

  return data as T;
}
