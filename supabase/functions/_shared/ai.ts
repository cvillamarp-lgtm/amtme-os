import "./deno-shims.d.ts";

/**
 * Shared AI helpers for AMTME Edge Functions.
 * Primary: Anthropic Claude (claude-sonnet-4-20250514) via native API.
 * Fallback: Grok → GROQ → OpenAI → Lovable — for non-critical or high-volume calls.
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
  timeoutMs: number = DEFAULT_TIMEOUT_MS
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
  model: string
): void {
  const costUSD = calculateCostUSD(provider, inputTokens, outputTokens, model);
  console.log(
    `[TOKEN_USAGE] provider=${provider} model=${model} in=${inputTokens} out=${outputTokens} cost=$${costUSD.toFixed(4)}`
  );
}

/**
 * Estimate cost in USD based on token counts and provider.
 * Rates based on 2024 pricing.
 */
function calculateCostUSD(
  provider: string,
  inputTokens: number,
  outputTokens: number,
  model: string
): number {
  // Claude Sonnet 4 pricing: $3 per 1M input, $15 per 1M output
  if (provider === "claude" && model === "claude-sonnet-4-20250514") {
    return (inputTokens * 3 + outputTokens * 15) / 1_000_000;
  }
  // Grok pricing: $2 per 1M input, $2 per 1M output
  if (provider === "grok") {
    return (inputTokens * 2 + outputTokens * 2) / 1_000_000;
  }
  // GROQ Llama pricing: ~free tier, $0.35 per 1M input, $0.35 per 1M output
  if (provider === "groq") {
    return (inputTokens * 0.35 + outputTokens * 0.35) / 1_000_000;
  }
  // OpenAI GPT-4o mini pricing: $0.15 per 1M input, $0.60 per 1M output
  if (provider === "openai" && model === "gpt-4o-mini") {
    return (inputTokens * 0.15 + outputTokens * 0.6) / 1_000_000;
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
  maxTokens = 4096
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
    DEFAULT_TIMEOUT_MS
  );

  if (!res.ok) {
    const status = res.status;
    if (status === 429) throw new Error("Claude rate limit — retry later.");
    if (status === 402) throw new Error("Claude quota exhausted — check billing at console.anthropic.com.");
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
  throw new Error("No fallback AI key configured. Set GROQ_API_KEY or OPENAI_API_KEY.");
}

type AIProviderName = "grok" | "groq" | "openai" | "lovable";
type MessageRole = "system" | "user" | "assistant";

export type AIErrorCategory =
  | "USER_AUTH_EXPIRED"
  | "USER_AUTH_INVALID"
  | "MISSING_PROVIDER_SECRET"
  | "INVALID_PROVIDER_SECRET"
  | "PROVIDER_401"
  | "PROVIDER_429"
  | "PROVIDER_5XX"
  | "NETWORK_TIMEOUT"
  | "BAD_REQUEST_PAYLOAD"
  | "UNKNOWN_UPSTREAM_ERROR";

export type AIOrchestratorStatus = "success" | "recovered" | "degraded" | "failed";

export interface AIOrchestratorResult {
  request_id: string;
  status: AIOrchestratorStatus;
  message: string;
  error_code?: AIErrorCategory;
  retryable: boolean;
  provider_used: AIProviderName | null;
  fallback_used: boolean;
  session_refresh_status: "not_attempted" | "attempted" | "succeeded" | "failed";
  retry_count: number;
  failover_count: number;
  upstream_status?: number;
  text?: string;
}

interface AIProviderConfig extends AIConfig {
  name: AIProviderName;
}

interface CircuitState {
  failures: number;
  openUntil: number;
}

function envPositiveInt(name: string, fallback: number): number {
  const raw = Deno.env.get(name);
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const circuitByProvider = new Map<AIProviderName, CircuitState>();
const CIRCUIT_BREAKER_FAILURES = envPositiveInt("AI_CIRCUIT_BREAKER_FAILURES", 3);
const CIRCUIT_BREAKER_COOLDOWN_MS = envPositiveInt("AI_CIRCUIT_BREAKER_COOLDOWN_MS", 60_000);

/** Builds the ordered list of OpenAI-compatible providers available */
function getProviders(): AIProviderConfig[] {
  const list: AIProviderConfig[] = [];
  const grokKey = Deno.env.get("GROK_API_KEY");
  if (grokKey)
    list.push({
      name: "grok",
      url: "https://api.x.ai/v1/chat/completions",
      key: grokKey,
      model: "grok-2",
    });
  const groqKey = Deno.env.get("GROQ_API_KEY");
  if (groqKey)
    list.push({
      name: "groq",
      url: "https://api.groq.com/openai/v1/chat/completions",
      key: groqKey,
      model: "llama-3.1-8b-instant",
    });
  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  if (openaiKey)
    list.push({
      name: "openai",
      url: "https://api.openai.com/v1/chat/completions",
      key: openaiKey,
      model: "gpt-4o-mini",
    });
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  if (lovableKey)
    list.push({
      name: "lovable",
      url: "https://ai.gateway.lovable.dev/v1/chat/completions",
      key: lovableKey,
      model: "openai/gpt-4o-mini",
    });
  if (list.length === 0) throw new Error("No AI API key configured.");
  return list;
}

function classifyError(error: unknown, status?: number): AIErrorCategory {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  if (status === 401 && (message.includes("invalid") || message.includes("api key"))) {
    return "INVALID_PROVIDER_SECRET";
  }
  if (status === 401) return "PROVIDER_401";
  if (status === 429) return "PROVIDER_429";
  if (typeof status === "number" && status >= 500 && status <= 599) return "PROVIDER_5XX";
  if (status === 400 || status === 422) return "BAD_REQUEST_PAYLOAD";
  if (message.includes("timeout") || message.includes("abort")) return "NETWORK_TIMEOUT";
  return "UNKNOWN_UPSTREAM_ERROR";
}

function isRetryableCategory(category: AIErrorCategory): boolean {
  return category === "NETWORK_TIMEOUT" || category === "PROVIDER_429" || category === "PROVIDER_5XX";
}

function isValidRole(role: unknown): role is MessageRole {
  return role === "system" || role === "user" || role === "assistant";
}

function isFallbackCategory(category: AIErrorCategory): boolean {
  return category === "PROVIDER_401" || category === "INVALID_PROVIDER_SECRET" || isRetryableCategory(category);
}

function isCircuitOpen(provider: AIProviderName): boolean {
  const state = circuitByProvider.get(provider);
  return Boolean(state && state.openUntil > Date.now());
}

function markProviderSuccess(provider: AIProviderName): void {
  circuitByProvider.set(provider, { failures: 0, openUntil: 0 });
}

function markProviderFailure(provider: AIProviderName): void {
  const current = circuitByProvider.get(provider) ?? { failures: 0, openUntil: 0 };
  const failures = current.failures + 1;
  if (failures >= CIRCUIT_BREAKER_FAILURES) {
    circuitByProvider.set(provider, { failures: 0, openUntil: Date.now() + CIRCUIT_BREAKER_COOLDOWN_MS });
    return;
  }
  circuitByProvider.set(provider, { failures, openUntil: 0 });
}

function logOrchestratorEvent(event: Record<string, unknown>): void {
  console.log(JSON.stringify({ ts: new Date().toISOString(), ...event }));
}

export async function callAIWithResilience(
  messages: { role: MessageRole; content: string }[],
  temperature = 0.7,
  context: { request_id?: string; user_id?: string; action?: string } = {},
): Promise<AIOrchestratorResult> {
  const requestId = context.request_id ?? crypto.randomUUID();
  const userId = context.user_id ?? "unknown";
  const action = context.action ?? "ai_call";
  let providers: AIProviderConfig[] = [];
  try {
    providers = getProviders().filter((provider) => !isCircuitOpen(provider.name));
  } catch {
    return {
      request_id: requestId,
      status: "failed",
      message: "No AI provider secret configured",
      error_code: "MISSING_PROVIDER_SECRET",
      retryable: false,
      provider_used: null,
      fallback_used: false,
      session_refresh_status: "not_attempted",
      retry_count: 0,
      failover_count: 0,
    };
  }

  const aiFeatureEnabled = (Deno.env.get("AI_FEATURE_ENABLED") ?? "true").toLowerCase() !== "false";
  if (!aiFeatureEnabled) {
    return {
      request_id: requestId,
      status: "failed",
      message: "AI feature is disabled by configuration",
      error_code: "BAD_REQUEST_PAYLOAD",
      retryable: false,
      provider_used: null,
      fallback_used: false,
      session_refresh_status: "not_attempted",
      retry_count: 0,
      failover_count: 0,
    };
  }

  if (
    !Array.isArray(messages) ||
    messages.length === 0 ||
    messages.some((m) => !isValidRole(m.role) || !m.content?.trim())
  ) {
    return {
      request_id: requestId,
      status: "failed",
      message: "Invalid AI payload",
      error_code: "BAD_REQUEST_PAYLOAD",
      retryable: false,
      provider_used: null,
      fallback_used: false,
      session_refresh_status: "not_attempted",
      retry_count: 0,
      failover_count: 0,
    };
  }

  if (providers.length === 0) {
    return {
      request_id: requestId,
      status: "degraded",
      message: "No healthy AI providers available",
      error_code: "MISSING_PROVIDER_SECRET",
      retryable: false,
      provider_used: null,
      fallback_used: false,
      session_refresh_status: "not_attempted",
      retry_count: 0,
      failover_count: 0,
    };
  }

  let fallbackUsed = false;
  let failoverCount = 0;
  let totalRetryCount = 0;
  let lastError: { code: AIErrorCategory; message: string; retryable: boolean; upstreamStatus?: number } | null = null;

  for (let providerIndex = 0; providerIndex < providers.length; providerIndex++) {
    const provider = providers[providerIndex];
    if (providerIndex > 0) {
      fallbackUsed = true;
      failoverCount += 1;
    }

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      if (attempt > 0) {
        const delayMs = getBackoffDelayMs(attempt - 1);
        totalRetryCount += 1;
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }

      try {
        const res = await fetchWithTimeout(
          provider.url,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${provider.key}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ model: provider.model, messages, temperature }),
          },
          DEFAULT_TIMEOUT_MS,
        );

        if (!res.ok) {
          const status = res.status;
          const bodyText = await res.text().catch(() => "");
          const category = classifyError(bodyText, status);
          const retryable = isRetryableCategory(category);
          lastError = {
            code: category,
            message: `${provider.name} returned ${status}`,
            retryable,
            upstreamStatus: status,
          };
          logOrchestratorEvent({
            request_id: requestId,
            user_id: userId,
            action,
            primary_provider: providers[0]?.name ?? null,
            provider_used: provider.name,
            fallback_used: fallbackUsed,
            session_refresh_status: "not_attempted",
            retry_attempt: attempt,
            failover_count: failoverCount,
            upstream_status: status,
            final_error_category: category,
            outcome: "provider_error",
          });
          if (retryable && attempt < MAX_RETRIES) continue;
          markProviderFailure(provider.name);
          if (isFallbackCategory(category)) break;
          return {
            request_id: requestId,
            status: "failed",
            message: `${provider.name} failed`,
            error_code: category,
            retryable,
            provider_used: provider.name,
            fallback_used: fallbackUsed,
            session_refresh_status: "not_attempted",
            retry_count: totalRetryCount,
            failover_count: failoverCount,
            upstream_status: status,
          };
        }

        const data = await res.json();
        const content = data.choices?.[0]?.message?.content?.trim();
        if (!content) throw new Error("Empty response from AI");
        const inputTokens = data.usage?.prompt_tokens || 0;
        const outputTokens = data.usage?.completion_tokens || 0;
        logTokenUsage(provider.name, inputTokens, outputTokens, provider.model);
        markProviderSuccess(provider.name);
        const status: AIOrchestratorStatus = fallbackUsed || totalRetryCount > 0 ? "recovered" : "success";
        logOrchestratorEvent({
          request_id: requestId,
          user_id: userId,
          action,
          primary_provider: providers[0]?.name ?? null,
          provider_used: provider.name,
          fallback_provider: fallbackUsed ? provider.name : null,
          fallback_used: fallbackUsed,
          session_refresh_status: "not_attempted",
          retry_count: totalRetryCount,
          failover_count: failoverCount,
          upstream_status: res.status,
          final_error_category: null,
          outcome: status,
        });
        return {
          request_id: requestId,
          status,
          message: "AI response generated",
          retryable: false,
          provider_used: provider.name,
          fallback_used: fallbackUsed,
          session_refresh_status: "not_attempted",
          retry_count: totalRetryCount,
          failover_count: failoverCount,
          upstream_status: res.status,
          text: content,
        };
      } catch (error) {
        const category = classifyError(error);
        const retryable = isRetryableCategory(category);
        lastError = {
          code: category,
          message: error instanceof Error ? error.message : String(error),
          retryable,
        };
        logOrchestratorEvent({
          request_id: requestId,
          user_id: userId,
          action,
          primary_provider: providers[0]?.name ?? null,
          provider_used: provider.name,
          fallback_used: fallbackUsed,
          session_refresh_status: "not_attempted",
          retry_attempt: attempt,
          failover_count: failoverCount,
          upstream_status: null,
          final_error_category: category,
          outcome: "network_or_unknown_error",
        });
        if (retryable && attempt < MAX_RETRIES) continue;
        markProviderFailure(provider.name);
        if (isFallbackCategory(category)) break;
        return {
          request_id: requestId,
          status: "failed",
          message: lastError.message,
          error_code: category,
          retryable,
          provider_used: provider.name,
          fallback_used: fallbackUsed,
          session_refresh_status: "not_attempted",
          retry_count: totalRetryCount,
          failover_count: failoverCount,
        };
      }
    }
  }

  return {
    request_id: requestId,
    status: "degraded",
    message: "All AI providers failed. You can continue manually.",
    error_code: lastError?.code ?? "UNKNOWN_UPSTREAM_ERROR",
    retryable: lastError?.retryable ?? false,
    provider_used: null,
    fallback_used: fallbackUsed,
    session_refresh_status: "not_attempted",
    retry_count: totalRetryCount,
    failover_count: failoverCount,
    upstream_status: lastError?.upstreamStatus,
  };
}

/**
 * Call AI with automatic runtime fallback across OpenAI-compatible providers.
 * Grok → GROQ → OpenAI → Lovable. On 429 / 5xx / timeout, tries the next one.
 * Enforces timeout per provider and implements exponential backoff.
 * Use callClaude() for Script Engine pipeline calls (Claude is primary).
 */
export async function callAI(
  messages: { role: MessageRole; content: string }[],
  temperature = 0.7,
): Promise<string> {
  const result = await callAIWithResilience(messages, temperature);
  if (result.text) return result.text;
  throw new Error(result.message);
}
