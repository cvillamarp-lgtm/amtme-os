/**
 * Shared AI provider resolution for AMTME Edge Functions.
 * Prefers Lovable gateway (LOVABLE_API_KEY), falls back to OpenAI (OPENAI_API_KEY).
 */
export interface AIConfig {
  url: string;
  key: string;
  model: string;
}

export function resolveAI(): AIConfig {
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  if (lovableKey) {
    return {
      url: "https://ai.gateway.lovable.dev/v1/chat/completions",
      key: lovableKey,
      model: "openai/gpt-4o-mini",
    };
  }
  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  if (openaiKey) {
    return {
      url: "https://api.openai.com/v1/chat/completions",
      key: openaiKey,
      model: "gpt-4o-mini",
    };
  }
  throw new Error(
    "No AI API key configured. Set LOVABLE_API_KEY or OPENAI_API_KEY in Supabase Edge Function secrets."
  );
}
