import "./deno-shims.d.ts";

/**
 * Shared AI helpers for AMTME Edge Functions.
 * Primary: Anthropic Claude (claude-sonnet-4-20250514) via native API.
 * Fallback: GROQ → OpenAI — for non-critical or high-volume calls.
 *
 * ⚠️ SECURITY: ANTHROPIC_API_KEY is NEVER exposed to the frontend.
 *    All Claude calls go exclusively through Supabase Edge Functions.
 */

// ─── Timeout & Resilience Helpers ────────────────────────────────────────────

const DEFAULT_TIMEOUT_MS = 30_000; // 30 seconds for AI calls
const EXPONENTIAL_BACKOFF_BASE_MS = 500;
const MAX_RETRIES = 2;

/**
 * Wrap a fetch call with timeout enforcement.
 * Aborts if the request exceeds the timeout.
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Request timeout after ${timeoutMs}ms`);
    }
    throw error;
  }
}

/**
 * Calculate exponential backoff delay in milliseconds.
 * For attempt 0: 500ms, attempt 1: 1000ms, attempt 2: 2000ms, etc.
 */
function getBackoffDelayMs(attempt: number): number {
  return EXPONENTIAL_BACKOFF_BASE_MS * Math.pow(2, attempt);
}

/**
 * Log token usage for cost tracking (currently logs to Deno stdout).
 * TODO: integrate with Supabase analytics or a cost-tracking service.
 */
function logTokenUsage(
  provider: string,
  inputTokens: number,
  outputTokens: number,
  model: string,
): void {
  const costUSD = calculateCostUSD(provider, inputTokens, outputTokens, model);
  console.log(`[TOKEN_USAGE] provider=${provider} model=${model} in=${inputTokens} out=${outputTokens} cost=$${costUSD.toFixed(4)}`);
}

/**
 * Estimate cost in USD based on token counts and provider.
 * Rates based on 2024 pricing.
 */
function calculateCostUSD(
  provider: string,
  inputTokens: number,
  outputTokens: number,
  model: string,
): number {
  // Claude Sonnet 4 pricing: $3 per 1M input, $15 per 1M output
  if (provider === "claude" && model === "claude-sonnet-4-20250514") {
    return (inputTokens * 3 + outputTokens * 15) / 1_000_000;
  }
  // GROQ Llama pricing: ~free tier, $0.35 per 1M input, $0.35 per 1M output
  if (provider === "groq") {
    return (inputTokens * 0.35 + outputTokens * 0.35) / 1_000_000;
  }
  // OpenAI GPT-4o mini pricing: $0.15 per 1M input, $0.60 per 1M output
  if (provider === "openai" && model === "gpt-4o-mini") {
    return (inputTokens * 0.15 + outputTokens * 0.60) / 1_000_000;
  }
  return 0; // Unknown provider
}

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
 * Enforces timeout and logs token usage for cost tracking.
 */
export async function callClaude(
  systemPrompt: string,
  userPrompt: string,
  maxTokens = 4096,
): Promise<string> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured in Edge Function secrets.");

  const res = await fetchWithTimeout(
    "https://api.anthropic.com/v1/messages",
    {
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
    },
    DEFAULT_TIMEOUT_MS,
  );

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

  // Log token usage for cost tracking
  const inputTokens = data.usage?.input_tokens || 0;
  const outputTokens = data.usage?.output_tokens || 0;
  logTokenUsage("claude", inputTokens, outputTokens, CLAUDE_MODEL);

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
 * GROQ → OpenAI → Lovable. On 429 / 5xx / timeout, tries the next one.
 * Enforces timeout per provider and implements exponential backoff.
 * Use callClaude() for Script Engine pipeline calls (Claude is primary).
 */
export async function callAI(
  messages: { role: "system" | "user" | "assistant"; content: string }[],
  temperature = 0.7,
): Promise<string> {
  const providers = getProviders();
  let lastError: Error = new Error("All AI providers failed");

  for (const provider of providers) {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        // Apply exponential backoff on retry
        if (attempt > 0) {
          const delayMs = getBackoffDelayMs(attempt - 1);
          console.log(`[AI] Retry attempt ${attempt} for ${provider.name} after ${delayMs}ms`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }

        const res = await fetchWithTimeout(
          provider.url,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${provider.key}`, "Content-Type": "application/json" },
            body: JSON.stringify({ model: provider.model, messages, temperature }),
          },
          DEFAULT_TIMEOUT_MS,
        );

        if (!res.ok) {
          const status = res.status;
          // Retry on these status codes
          if (status === 429 || (status >= 500 && status <= 599)) {
            const msg = `${provider.name} returned ${status}`;
            console.warn(`[AI] ${msg}, will retry...`);
            lastError = new Error(msg);
            if (attempt < MAX_RETRIES) continue; // Retry with this provider
            break; // Max retries exhausted, try next provider
          }
          // Move to next provider on insufficient credits or invalid key
          if (status === 401 || status === 402) {
            const msg = status === 401 ? "invalid key" : "insufficient credits";
            console.warn(`[AI] ${provider.name} ${msg}, trying next provider`);
            lastError = new Error(`${provider.name} ${msg}`);
            break;
          }
          throw new Error(`AI error ${status}`);
        }

        const data = await res.json();
        const content = data.choices?.[0]?.message?.content?.trim();
        if (!content) throw new Error("Empty response from AI");

        // Log token usage for cost tracking
        const inputTokens = data.usage?.prompt_tokens || 0;
        const outputTokens = data.usage?.completion_tokens || 0;
        logTokenUsage(provider.name, inputTokens, outputTokens, provider.model);

        return content;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        // Timeout or transient error: retry this provider
        if (msg.includes("timeout") && attempt < MAX_RETRIES) {
          lastError = e instanceof Error ? e : new Error(msg);
          console.warn(`[AI] ${provider.name} timeout, retrying...`);
          continue; // Retry this provider
        }
        // Other errors: try next provider
        lastError = e instanceof Error ? e : new Error(msg);
        console.warn(`[AI] ${provider.name} failed after attempt ${attempt + 1}: ${msg}`);
        break; // Move to next provider
      }
    }
  }

  throw lastError;
}
