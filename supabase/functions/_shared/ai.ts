/**
 * Shared AI helpers for AMTME Edge Functions.
 * callAI() tries providers in order with runtime fallback: GROQ → OpenAI → Lovable.
 */

export interface AIConfig {
  url: string;
  key: string;
  model: string;
}

/** Legacy single-resolve — kept for functions that manage their own fetch */
export function resolveAI(): AIConfig {
  const groqKey = Deno.env.get("GROQ_API_KEY");
  if (groqKey) {
    return {
      url: "https://api.groq.com/openai/v1/chat/completions",
      key: groqKey,
      model: "llama-3.1-8b-instant",
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
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  if (lovableKey) {
    return {
      url: "https://ai.gateway.lovable.dev/v1/chat/completions",
      key: lovableKey,
      model: "openai/gpt-4o-mini",
    };
  }
  throw new Error(
    "No AI API key configured. Set GROQ_API_KEY, OPENAI_API_KEY or LOVABLE_API_KEY.",
  );
}

/** Builds the ordered list of providers available in this invocation */
function getProviders(): (AIConfig & { name: string })[] {
  const list: (AIConfig & { name: string })[] = [];
  const groqKey = Deno.env.get("GROQ_API_KEY");
  if (groqKey) list.push({ name: "groq", url: "https://api.groq.com/openai/v1/chat/completions", key: groqKey, model: "llama-3.1-8b-instant" });
  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  if (openaiKey) list.push({ name: "openai", url: "https://api.openai.com/v1/chat/completions", key: openaiKey, model: "gpt-4o-mini" });
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  if (lovableKey) list.push({ name: "lovable", url: "https://ai.gateway.lovable.dev/v1/chat/completions", key: lovableKey, model: "openai/gpt-4o-mini" });
  if (list.length === 0) throw new Error("No AI API key configured.");
  return list;
}

/**
 * Call AI with automatic runtime fallback across providers.
 * GROQ → OpenAI → Lovable. On 429 / 5xx / bad key, tries the next one.
 * Returns the raw text content from the model.
 */
export async function callAI(
  messages: { role: "system" | "user" | "assistant"; content: string }[],
  temperature = 0.7,
): Promise<string> {
  const providers = getProviders();
  let lastError: Error = new Error("All AI providers failed");

  for (const provider of providers) {
    try {
      const res = await fetch(provider.url, {
        method: "POST",
        headers: { Authorization: `Bearer ${provider.key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: provider.model, messages, temperature }),
      });

      if (!res.ok) {
        const status = res.status;
        // Retriable: rate limit or server error → try next provider
        if (status === 429 || (status >= 500 && status <= 599) || status === 401) {
          console.warn(`[AI] ${provider.name} → ${status}, trying next provider`);
          lastError = new Error(`${provider.name} returned ${status}`);
          continue;
        }
        if (status === 402) throw new Error("Créditos de IA insuficientes.");
        throw new Error(`AI error ${status}`);
      }

      const data = await res.json();
      const content = data.choices?.[0]?.message?.content?.trim();
      if (!content) throw new Error("Empty response from AI");
      return content;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      // Re-throw non-retriable errors immediately
      if (msg.includes("Créditos") || msg.includes("Empty response")) throw e;
      lastError = e instanceof Error ? e : new Error(msg);
      console.warn(`[AI] ${provider.name} failed: ${msg}`);
    }
  }

  throw lastError;
}
