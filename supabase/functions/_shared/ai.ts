import "./deno-shims.d.ts";

/**
 * Shared AI helpers for AMTME Edge Functions.
 * Primary: Anthropic Claude (claude-sonnet-4-20250514) via native API.
 * Fallback: GROQ → OpenAI — for non-critical or high-volume calls.
 *
 * ⚠️ SECURITY: ANTHROPIC_API_KEY is NEVER exposed to the frontend.
 *    All Claude calls go exclusively through Supabase Edge Functions.
 */

export interface AIConfig {
  url: string;
  key: string;
  model: string;
}

// ─── Claude (Anthropic native API) ───────────────────────────────────────────

const CLAUDE_MODEL = "claude-sonnet-4-20250514";

/**
 * Call Claude directly via the Anthropic Messages API.
 * Requires ANTHROPIC_API_KEY set in Edge Function secrets.
 * Returns the raw text from the first content block.
 */
export async function callClaude(
  systemPrompt: string,
  userPrompt: string,
  maxTokens = 4096,
): Promise<string> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured in Edge Function secrets.");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!res.ok) {
    const status = res.status;
    if (status === 429) throw new Error("Claude rate limit — retry later.");
    if (status === 401) throw new Error("Invalid ANTHROPIC_API_KEY.");
    const body = await res.text().catch(() => "");
    throw new Error(`Claude API error ${status}: ${body}`);
  }

  const data = await res.json();
  const text = data.content?.[0]?.text?.trim();
  if (!text) throw new Error("Claude returned an empty response.");
  return text;
}

// ─── Legacy OpenAI-compatible fallback ───────────────────────────────────────

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
  throw new Error(
    "No fallback AI key configured. Set GROQ_API_KEY or OPENAI_API_KEY.",
  );
}

/** Builds the ordered list of OpenAI-compatible providers available */
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
 * Call AI with automatic runtime fallback across OpenAI-compatible providers.
 * GROQ → OpenAI → Lovable. On 429 / 5xx / bad key, tries the next one.
 * Use callClaude() for Script Engine pipeline calls (Claude is primary).
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
      if (msg.includes("Créditos") || msg.includes("Empty response")) throw e;
      lastError = e instanceof Error ? e : new Error(msg);
      console.warn(`[AI] ${provider.name} failed: ${msg}`);
    }
  }

  throw lastError;
}
