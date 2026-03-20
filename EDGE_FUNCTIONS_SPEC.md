# Edge Functions Implementation Spec

This document provides detailed specifications for the three Edge Functions that power the Script Engine.

---

## 1. Clean Text Function

**File:** `supabase/functions/clean-text/index.ts`

**Purpose:** Automatically clean podcast transcripts/scripts using Claude, removing filler words while preserving meaning.

**HTTP Details:**
- **Method:** POST
- **Endpoint:** `/functions/v1/clean-text`
- **Auth:** Requires Bearer token (checked via RLS)

### Request Body

```typescript
interface CleanTextRequest {
  raw_text: string; // Raw podcast content (300–15,000 words)
}
```

### Response

```typescript
interface CleanTextResponse {
  cleaned_text: string;
  original_word_count: number;
  cleaned_word_count: number;
  reduction_percentage: number; // 0–100, must be ≤ 35%
}
```

### Implementation

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const anthropic = new Anthropic({ // Use env var
  apiKey: Deno.env.get("ANTHROPIC_API_KEY"),
});

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const { raw_text } = await req.json();

  if (!raw_text || raw_text.length < 50) {
    return new Response(
      JSON.stringify({ error: "raw_text required and must be > 50 chars" }),
      { status: 400 }
    );
  }

  const originalWordCount = raw_text.split(/\s+/).length;

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4000,
    system: `You are a podcast text editor. Your job is to clean up raw podcast transcripts by:
1. Removing filler words (um, uh, like, you know, etc.)
2. Fixing repeated phrases
3. Removing tangential rambling
4. Keeping all meaningful content and exact quotes
5. Maintaining the speaker's voice and emotional tone

Output ONLY the cleaned text, nothing else.`,
    messages: [
      {
        role: "user",
        content: `Clean this podcast transcript:\n\n${raw_text}`,
      },
    ],
  });

  const cleanedText = message.content[0].type === "text" 
    ? message.content[0].text 
    : "";

  const cleanedWordCount = cleanedText.split(/\s+/).length;
  const reductionPercentage = Math.round(
    ((originalWordCount - cleanedWordCount) / originalWordCount) * 10000
  ) / 100;

  // Validate constraints
  if (reductionPercentage > 35) {
    return new Response(
      JSON.stringify({
        error: `Reduction too high (${reductionPercentage}% > 35%)`,
      }),
      { status: 400 }
    );
  }

  if (cleanedWordCount < 250) {
    return new Response(
      JSON.stringify({
        error: `Cleaned text too short (${cleanedWordCount} < 250 words)`,
      }),
      { status: 400 }
    );
  }

  return new Response(
    JSON.stringify({
      cleaned_text: cleanedText,
      original_word_count: originalWordCount,
      cleaned_word_count: cleanedWordCount,
      reduction_percentage: reductionPercentage,
    }),
    {
      headers: { "Content-Type": "application/json" },
    }
  );
});
```

---

## 2. Semantic Map Function

**File:** `supabase/functions/semantic-map/index.ts`

**Purpose:** Extract semantic structure from cleaned text (thesis, conflict, promise, emotional tone, etc.).

**HTTP Details:**
- **Method:** POST
- **Endpoint:** `/functions/v1/semantic-map`
- **Auth:** Requires Bearer token

### Request Body

```typescript
interface SemanticMapRequest {
  cleaned_text: string; // Already-cleaned podcast content
}
```

### Response

```typescript
interface SemanticMapResponse {
  semantic_json: {
    central_thesis: string; // Main argument (15–80 words)
    central_conflict: string; // Central tension (10–60 words)
    episode_promise: string; // What listener learns (10–50 words)
    narrative_arc: string; // Story structure
    emotional_journey: string; // How listener feels over time
    dominant_emotional_tone: 
      | "vulnerable"
      | "duelo"
      | "ruptura"
      | "nostálgico"
      | "alegría"
      | "esperanza"
      | "confianza"; // Single dominant tone
    intensity_level: "low" | "medium" | "high";
    word_counts: {
      central_thesis: number;
      central_conflict: number;
      episode_promise: number;
    };
  };
}
```

### Implementation

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const anthropic = new Anthropic({
  apiKey: Deno.env.get("ANTHROPIC_API_KEY"),
});

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const { cleaned_text } = await req.json();

  if (!cleaned_text || cleaned_text.length < 100) {
    return new Response(
      JSON.stringify({ error: "cleaned_text required and must be > 100 chars" }),
      { status: 400 }
    );
  }

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2000,
    system: `You are a podcast semantics analyst. Extract the core structure of a podcast episode:
1. central_thesis: What's the main argument/idea? (15–80 words)
2. central_conflict: What's the core tension/problem? (10–60 words)
3. episode_promise: What will the listener learn/gain? (10–50 words)
4. narrative_arc: How does the story unfold?
5. emotional_journey: How does the listener's emotional state change?
6. dominant_emotional_tone: Pick ONE: vulnerable, duelo, ruptura, nostálgico, alegría, esperanza, confianza
7. intensity_level: Overall intensity (low/medium/high)

Return JSON ONLY, no other text.`,
    messages: [
      {
        role: "user",
        content: `Analyze this podcast episode:\n\n${cleaned_text}

Return valid JSON with the keys above.`,
      },
    ],
  });

  const textContent = message.content.find((c) => c.type === "text");
  const jsonText = textContent?.type === "text" ? textContent.text : "{}";

  // Parse JSON from Claude response (may have markdown backticks)
  const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
  const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

  // Validate emotional tone
  const validTones = [
    "vulnerable",
    "duelo",
    "ruptura",
    "nostálgico",
    "alegría",
    "esperanza",
    "confianza",
  ];
  if (!validTones.includes(parsed.dominant_emotional_tone)) {
    parsed.dominant_emotional_tone = "confianza"; // Default
  }

  // Validate intensity
  const validIntensities = ["low", "medium", "high"];
  if (!validIntensities.includes(parsed.intensity_level)) {
    parsed.intensity_level = "medium"; // Default
  }

  return new Response(
    JSON.stringify({
      semantic_json: {
        central_thesis: parsed.central_thesis || "",
        central_conflict: parsed.central_conflict || "",
        episode_promise: parsed.episode_promise || "",
        narrative_arc: parsed.narrative_arc || "",
        emotional_journey: parsed.emotional_journey || "",
        dominant_emotional_tone: parsed.dominant_emotional_tone,
        intensity_level: parsed.intensity_level,
        word_counts: {
          central_thesis: (parsed.central_thesis || "").split(/\s+/).length,
          central_conflict: (parsed.central_conflict || "").split(/\s+/).length,
          episode_promise: (parsed.episode_promise || "").split(/\s+/).length,
        },
      },
    }),
    {
      headers: { "Content-Type": "application/json" },
    }
  );
});
```

**Palette Auto-Suggestion Logic:**

After returning semantic_json, the frontend will auto-suggest palette based on tone:
- `duelo`, `ruptura` → P2 (Dorado + Marrón — warm + grounding)
- `vulnerable`, `nostálgico` → P3 (Celeste + Azul marino — calm + introspective)
- `high intensity` + (`alegría`, `esperanza`) → P4 (Rosa + Borgoña — bold + energetic)
- Default → P1 (Lima + Azul noche — fresh + professional)

---

## 3. Generate Outputs Function

**File:** `supabase/functions/generate-outputs/index.ts`

**Purpose:** Generate 10 types of content in parallel for social media distribution.

**HTTP Details:**
- **Method:** POST
- **Endpoint:** `/functions/v1/generate-outputs`
- **Auth:** Requires Bearer token

### Request Body

```typescript
interface GenerateOutputsRequest {
  semantic_json: {
    central_thesis: string;
    central_conflict: string;
    episode_promise: string;
    dominant_emotional_tone: string;
    intensity_level: string;
    [key: string]: unknown;
  };
}
```

### Response

```typescript
interface GenerateOutputsResponse {
  outputs: Array<{
    output_number: number; // 1–10
    asset_type: string; // editorial_summary, visual_copy, etc.
    asset_key: string; // Unique identifier
    content: {
      text: string;
      word_count: number;
      // Type-specific fields
    };
  }>;
  status: "complete" | "partial" | "failed";
  error?: string;
}
```

### Implementation

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const anthropic = new Anthropic({
  apiKey: Deno.env.get("ANTHROPIC_API_KEY"),
});

// Define 10 output generators
const outputTypes = [
  {
    number: 1,
    name: "editorial_summary",
    minWords: 100,
    maxWords: 200,
    prompt: (json: any) =>
      `Write a compelling editorial summary of this podcast episode. Main thesis: "${json.central_thesis}". Word limit: 150–200.`,
  },
  {
    number: 2,
    name: "visual_copy",
    minWords: 20,
    maxWords: 50,
    prompt: (json: any) =>
      `Write a short, punchy visual caption for Instagram posts. Max 50 words. Tone: ${json.dominant_emotional_tone}. Hook with: "${json.episode_promise}"`,
  },
  {
    number: 3,
    name: "captions",
    minWords: 30,
    maxWords: 80,
    prompt: (json: any) =>
      `Generate 3 different Instagram caption options (each 30–80 words). Based on: "${json.central_thesis}"`,
  },
  {
    number: 4,
    name: "hooks",
    minWords: 20,
    maxWords: 60,
    prompt: (json: any) =>
      `Create 5 attention-grabbing hooks for TikTok Reels/Stories (each 20–40 words). Theme: ${json.dominant_emotional_tone}`,
  },
  {
    number: 5,
    name: "quotes",
    minWords: 40,
    maxWords: 120,
    prompt: (json: any) =>
      `Extract 3 the most quotable lines from this episode (40–120 words total). Make them standalone quotes suitable for social media.`,
  },
  {
    number: 6,
    name: "carousel",
    minWords: 80,
    maxWords: 200,
    prompt: (json: any) =>
      `Write content for a 5-slide Instagram carousel. Slide 1: Hook (15 words). Slides 2–5: Key insights (15–30 words each). Total: 100–150 words.`,
  },
  {
    number: 7,
    name: "stories",
    minWords: 30,
    maxWords: 100,
    prompt: (json: any) =>
      `Create text for 3 Instagram Stories (sticker-friendly, 20–40 words each). Tone: ${json.dominant_emotional_tone}. Reflect: "${json.episode_promise}"`,
  },
  {
    number: 8,
    name: "reels",
    minWords: 60,
    maxWords: 150,
    prompt: (json: any) =>
      `Write a 60–120 second vertical video script (Reels/TikTok). Hook: 10 words. Body: 50–80 words. CTA: 10 words. Topic: "${json.central_thesis}"`,
  },
  {
    number: 9,
    name: "descriptions",
    minWords: 50,
    maxWords: 150,
    prompt: (json: any) =>
      `Write platform-specific descriptions. Include versions for: YouTube (100–150 words), Spotify (50–100 words), Apple Podcasts (50–100 words). Promise: "${json.episode_promise}"`,
  },
  {
    number: 10,
    name: "distribution",
    minWords: 80,
    maxWords: 200,
    prompt: (json: any) =>
      `Create a distribution strategy email (100–150 words) for podcast team. Include: platforms to post on, optimal posting times, hashtags, CTA alignment.`,
  },
];

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const { semantic_json } = await req.json();

  if (!semantic_json) {
    return new Response(
      JSON.stringify({ error: "semantic_json required" }),
      { status: 400 }
    );
  }

  // Generate all 10 in parallel
  const promises = outputTypes.map(async (output) => {
    try {
      const message = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [
          {
            role: "user",
            content: output.prompt(semantic_json),
          },
        ],
      });

      const content =
        message.content[0].type === "text" ? message.content[0].text : "";
      const wordCount = content.split(/\s+/).length;

      return {
        output_number: output.number,
        asset_type: output.name,
        asset_key: `${output.name}_${Date.now()}`,
        content: {
          text: content,
          word_count: wordCount,
        },
      };
    } catch (error) {
      console.error(`Error generating ${output.name}:`, error);
      return {
        output_number: output.number,
        asset_type: output.name,
        asset_key: `${output.name}_error`,
        content: {
          text: `Error generating ${output.name}`,
          word_count: 0,
        },
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  });

  const outputs = await Promise.all(promises);

  return new Response(
    JSON.stringify({
      outputs,
      status: outputs.every((o) => !o.error) ? "complete" : "partial",
    }),
    {
      headers: { "Content-Type": "application/json" },
    }
  );
});
```

---

## Deployment Instructions

### 1. Supabase CLI Setup

```bash
supabase functions deploy clean-text
supabase functions deploy semantic-map
supabase functions deploy generate-outputs
```

### 2. Set Environment Variables

In Supabase Dashboard > Project Settings > Functions > Secrets:

```
ANTHROPIC_API_KEY = sk-ant-...
```

### 3. Enable CORS

In Supabase Dashboard > Project Settings > API:

```json
{
  "key": "api",
  "allowed_origins": ["https://your-domain.com", "http://localhost:5173"]
}
```

### 4. Test Functions

```bash
curl -X POST https://your-project.supabase.co/functions/v1/clean-text \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"raw_text":"Um, like, we should, you know, talk about..."}'
```

---

## Performance Targets

- **clean-text:** < 5 seconds
- **semantic-map:** < 3 seconds
- **generate-outputs:** < 30 seconds (parallel)

Use caching or Redis for repeated semantic maps to improve performance.

---

## Error Handling

All functions should return:

```json
{
  "error": "Human-readable error message",
  "code": "ERROR_CODE"
}
```

Common error codes:
- `INVALID_INPUT`
- `VALIDATION_FAILED`
- `ANTHROPIC_ERROR`
- `UNAUTHORIZED`

---

**Maintained by:** AMTME Engineering  
**Last Updated:** March 20, 2025
