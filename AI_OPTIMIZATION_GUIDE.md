# AI Optimization Implementation Guide
**Quick-start fixes for timeout, token tracking, and resilience**

---

## Fix #1: Add Timeout Handler (2 hours)

**File:** `supabase/functions/_shared/ai.ts`

Add this helper at the top:

```typescript
/**
 * Wraps a fetch promise with a timeout.
 * Throws DOMException if timeout exceeded.
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit & { timeout?: number },
): Promise<Response> {
  const { timeout = 10000, ...fetchOptions } = options;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    return await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}
```

**Usage in `callClaude()`:**

```typescript
// OLD (lines 35-48):
const res = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: { ... },
  body: JSON.stringify({ ... }),
});

// NEW:
const res = await fetchWithTimeout("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: { ... },
  body: JSON.stringify({ ... }),
  timeout: 15000, // 15 seconds for Claude
});
```

**Usage in `callAI()` fallback loop:**

```typescript
// OLD (lines 116-120):
const res = await fetch(provider.url, {
  method: "POST",
  headers: { ... },
  body: JSON.stringify({ ... }),
});

// NEW:
const res = await fetchWithTimeout(provider.url, {
  method: "POST",
  headers: { ... },
  body: JSON.stringify({ ... }),
  timeout: 5000, // 5 seconds per fallback provider
});
```

**Error handling:**

```typescript
try {
  const res = await fetchWithTimeout(url, options);
  // ... existing logic
} catch (e) {
  if (e instanceof DOMException && e.name === 'AbortError') {
    throw new Error(`Request timeout (${options.timeout || 10000}ms) — ${provider.name || 'API'}`);
  }
  throw e;
}
```

---

## Fix #2: Add Token Tracking (1 hour)

**File:** `supabase/functions/_shared/ai.ts`

Add logging utility:

```typescript
interface AICallMetrics {
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costUsd: number;
  durationMs: number;
  provider: string;
}

export function logAIMetrics(
  metrics: AICallMetrics,
  context: string = 'AI call',
): void {
  const logEntry = {
    timestamp: new Date().toISOString(),
    context,
    model: metrics.model,
    input_tokens: metrics.inputTokens,
    output_tokens: metrics.outputTokens,
    total_tokens: metrics.totalTokens,
    cost_usd: metrics.costUsd.toFixed(6),
    duration_ms: metrics.durationMs,
    provider: metrics.provider,
  };
  console.log(JSON.stringify(logEntry));
}

// Price per million tokens (as of 2025)
const PRICING = {
  'claude-sonnet-4-20250514': {
    input: 3,     // $3 per million input tokens
    output: 15,   // $15 per million output tokens
  },
  'gpt-4o-mini': {
    input: 0.15,
    output: 0.6,
  },
  'llama-3.1-8b-instant': {
    input: 0.07,
    output: 0.07,
  },
};
```

**Usage in `callClaude()`:**

```typescript
export async function callClaude(
  systemPrompt: string,
  userPrompt: string,
  maxTokens = 4096,
): Promise<string> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

  const startTime = performance.now();
  const res = await fetchWithTimeout("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { ... },
    body: JSON.stringify({ ... }),
    timeout: 15000,
  });

  if (!res.ok) {
    const status = res.status;
    if (status === 429) throw new Error("Claude rate limit");
    if (status === 401) throw new Error("Invalid ANTHROPIC_API_KEY");
    throw new Error(`Claude API error ${status}`);
  }

  const data = await res.json();
  const text = data.content?.[0]?.text?.trim();
  if (!text) throw new Error("Claude returned empty response");

  // Log metrics
  const usage = data.usage || { input_tokens: 0, output_tokens: 0 };
  const pricing = PRICING['claude-sonnet-4-20250514'];
  const costUsd =
    (usage.input_tokens * pricing.input +
     usage.output_tokens * pricing.output) / 1_000_000;

  logAIMetrics(
    {
      model: CLAUDE_MODEL,
      inputTokens: usage.input_tokens,
      outputTokens: usage.output_tokens,
      totalTokens: usage.input_tokens + usage.output_tokens,
      costUsd,
      durationMs: performance.now() - startTime,
      provider: 'anthropic',
    },
    'callClaude',
  );

  return text;
}
```

---

## Fix #3: Replace Promise.all() with allSettled() (30 minutes)

**File:** `supabase/functions/generate-outputs/index.ts`

**Current code (line 224):**

```typescript
const outputPromises = Array.from({ length: 10 }, (_, i) =>
  callAI([...], 0.4)
    .then(text => ({ outputNumber: i + 1, content: parseJson(text) }))
    .catch(e => ({ outputNumber: i + 1, error: e.message })),
);

const outputs = await Promise.all(outputPromises); // ❌ All fail if one fails
```

**Fixed code:**

```typescript
const outputPromises = Array.from({ length: 10 }, (_, i) =>
  callAI([...], 0.4)
    .then(text => ({ outputNumber: i + 1, content: parseJson(text) }))
    .catch(e => ({ outputNumber: i + 1, error: e.message })),
);

const settled = await Promise.allSettled(outputPromises);
const outputs = settled.map(result => 
  result.status === 'fulfilled' ? result.value : { 
    outputNumber: 0, 
    error: 'Promise rejected',
  }
);
```

---

## Fix #4: Fix Fallback Chain 402 Error (20 minutes)

**File:** `supabase/functions/_shared/ai.ts`

**Current code (lines 122–130):**

```typescript
if (!res.ok) {
  const status = res.status;
  if (status === 429 || (status >= 500 && status <= 599) || status === 401) {
    console.warn(`[AI] ${provider.name} → ${status}, trying next provider`);
    lastError = new Error(`${provider.name} returned ${status}`);
    continue; // ✅ Try next provider
  }
  if (status === 402) throw new Error("Créditos de IA insuficientes."); // ❌ STOPS CHAIN
  throw new Error(`AI error ${status}`);
}
```

**Fixed code:**

```typescript
if (!res.ok) {
  const status = res.status;
  // These status codes warrant fallback to next provider
  if (status === 429 || (status >= 500 && status <= 599) || status === 401 || status === 402) {
    console.warn(`[AI] ${provider.name} → ${status}, trying next provider`);
    lastError = new Error(`${provider.name} returned ${status}`);
    continue;
  }
  throw new Error(`AI error ${status}`);
}
```

---

## Fix #5: Standardize Error Responses (1 hour)

**Files affected:** `generate-visual-assets/index.ts`, `refine-visual-composition/index.ts`

**Current (anti-pattern):**

```typescript
catch (error) {
  console.error("Error:", error);
  return new Response(
    JSON.stringify({
      success: false,
      error: error.message,
    }),
    { status: 500 }
  );
}
```

**Fixed (use error envelope):**

```typescript
import { errorResponse } from "../_shared/response.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  const cors = getCorsHeaders(req);
  
  try {
    // ... your logic
  } catch (error) {
    console.error("[function-name] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    const code = message.includes("timeout") ? "TIMEOUT" : "INTERNAL_ERROR";
    return errorResponse(cors, code, message, 500);
  }
});
```

---

## Fix #6: Make Async Loops Parallel (45 minutes)

**File:** `supabase/functions/generate-visual-assets/index.ts`

**Current (sequential loop, lines 70–117):**

```typescript
const generatedAssets = [];
for (const [key, asset] of Object.entries(assets)) {
  try {
    console.log(`Generating ${key}...`);
    const imageUrl = await generateImageWithTogether(asset.prompt);
    // ... upload logic (sequential)
  } catch (error) {
    console.error(`Error generating ${key}:`, error);
  }
}
```

**Fixed (parallel with allSettled):**

```typescript
const generatedAssets = await Promise.allSettled(
  Object.entries(assets).map(async ([key, asset]) => {
    try {
      console.log(`Generating ${key}...`);
      const imageUrl = await generateImageWithTogether(asset.prompt);
      
      const imageResponse = await fetch(imageUrl, { timeout: 30000 });
      const imageBlob = await imageResponse.arrayBuffer();
      const fileName = `${episode_id}/${asset.piece_id}_${Date.now()}.png`;

      const { error: uploadError } = await supabase.storage
        .from("episode-assets")
        .upload(fileName, imageBlob, { contentType: "image/png", upsert: false });

      if (uploadError) throw uploadError;

      const { data: publicUrl } = supabase.storage
        .from("episode-assets")
        .getPublicUrl(fileName);

      const { error: insertError } = await supabase
        .from("generated_assets")
        .insert({
          episode_id,
          piece_id: asset.piece_id,
          piece_name: asset.piece_name,
          image_url: publicUrl.publicUrl,
          prompt: asset.prompt,
          source: "visual_auto_generator",
        });

      if (insertError) throw insertError;

      return {
        piece_id: asset.piece_id,
        url: publicUrl.publicUrl,
      };
    } catch (error) {
      console.error(`Error generating ${key}:`, error);
      throw error;
    }
  })
);

// Filter successful results
const assets = generatedAssets
  .filter(r => r.status === 'fulfilled')
  .map(r => r.value);

// Log failures
generatedAssets
  .filter(r => r.status === 'rejected')
  .forEach((r, i) => {
    console.warn(`Asset ${i} failed:`, r.reason);
  });
```

**Impact:** Reduce generation time from 60–80s → 20–30s

---

## Testing Checklist

After implementing fixes:

```bash
# Test 1: Timeout triggers correctly
curl -X POST https://your-function/claude-call \
  -H "Authorization: Bearer TOKEN" \
  -d '{"systemPrompt":"test","userPrompt":"test","maxTokens":99999}'
# Should timeout after 15s, not hang

# Test 2: Fallback chain works
# Temporarily disable ANTHROPIC_API_KEY
# Should auto-fallback to GROQ → OpenAI → Lovable
# Check logs: "trying next provider"

# Test 3: Token tracking logs appear
curl generate-outputs
# Check logs for JSON: { timestamp, input_tokens, output_tokens, cost_usd, ... }

# Test 4: Partial success on timeout
curl generate-outputs (with network delay)
# Should return outputs 1–7, log error for 8–10

# Test 5: Cost alerts trigger
# Generate 100 outputs
# Should see warning: "Cost $3.45 exceeds threshold $3.00"
```

---

## Deployment Order

1. **Monday:** Deploy timeout + token tracking (hot reload)
2. **Tuesday:** Deploy allSettled() fix to generate-outputs
3. **Wednesday:** Deploy fallback chain 402 fix + error standardization
4. **Thursday:** Deploy parallel loops in generate-visual-assets
5. **Friday:** Test fallback chain under load, monitor costs

---

## Monitoring Query (Vercel)

Add to your analytics dashboard:

```sql
SELECT 
  context,
  COUNT(*) as calls,
  AVG(CAST(duration_ms AS FLOAT)) as avg_latency_ms,
  SUM(CAST(cost_usd AS FLOAT)) as total_cost,
  MAX(CAST(total_tokens AS INT)) as max_tokens_single_call
FROM ai_metrics
WHERE timestamp > NOW() - INTERVAL '24 hours'
GROUP BY context
ORDER BY total_cost DESC;
```

---

**Estimated Total Effort:** 6–8 hours  
**Expected Outcome:** 
- ✅ No more infinite hangs
- ✅ Full cost visibility  
- ✅ Partial success on failures
- ✅ 2–3x faster parallel operations
- ✅ Better fallback resilience
