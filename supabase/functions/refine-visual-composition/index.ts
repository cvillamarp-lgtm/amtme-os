import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { errorResponse } from "../_shared/response.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const togetherApiKey = Deno.env.get("TOGETHER_API_KEY")!;
const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY")!;

const supabase = createClient(supabaseUrl, supabaseKey);

interface RefineRequest {
  imageUrl: string;
  intensity: "sutil" | "media" | "alta";
  focus: "fondo" | "composicion" | "legibilidad" | "acabado" | "integral";
  layout: Record<string, unknown>;
  episodeId: string;
}

interface RefinementAnalysis {
  hostDetected: boolean;
  hostBounds?: { x: number; y: number; width: number; height: number };
  improvements: string[];
  prompt: string;
  restrictions: string[];
}

async function analyzeWithClaude(
  imageUrl: string,
  focus: string,
  intensity: string
): Promise<RefinementAnalysis> {
  const analysisPrompt = `Analyze this visual composition for editorial refinement.

CRITICAL RULE: Identify the human subject (host) in the image. DO NOT SUGGEST ANY CHANGES to:
- The person's face, features, proportions, pose, expression
- Their clothing, hands, body, anatomy
- The location or enclosure of the subject
- The overall subject composition

ANALYZE ONLY:
- Background quality and optimization
- Texture and visual depth
- Contrast and visual separation (figure-ground)
- Compositional balance and visual hierarchy
- Negative space and breathing room
- Visual tension and psychological impact
- Color harmony and mood
- Editorial refinement opportunities

FOCUS AREA: ${focus}
INTENSITY LEVEL: ${intensity}

Return as JSON:
{
  "hostDetected": boolean,
  "hostBounds": { "x": number, "y": number, "width": number, "height": number },
  "improvements": ["improvement 1", "improvement 2", ...],
  "prompt": "precise image generation prompt that respects host protection",
  "restrictions": ["restriction 1", ...]
}`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": anthropicKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "url",
                url: imageUrl,
              },
            },
            {
              type: "text",
              text: analysisPrompt,
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Claude API error: ${response.statusText}`);
  }

  const data = await response.json();
  const analysisText =
    data.content[0].type === "text" ? data.content[0].text : "";

  try {
    const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found in response");
    return JSON.parse(jsonMatch[0]);
  } catch (e) {
    throw new Error(`Failed to parse analysis: ${e}`);
  }
}

async function generateRefinedImage(
  imageUrl: string,
  analysis: RefinementAnalysis,
  intensity: string
): Promise<string> {
  const intensityMultipliers = {
    sutil: 0.3,
    media: 0.6,
    alta: 0.9,
  };

  const multiplier = intensityMultipliers[intensity as keyof typeof intensityMultipliers];

  const refinementPrompt = `Take this reference image and create an optimized editorial version.

HOST PROTECTION - ABSOLUTELY CRITICAL:
${analysis.restrictions.map((r) => `- ${r}`).join("\n")}

You MUST preserve:
- The human subject completely unchanged
- Their position, pose, and appearance
- All elements within bounds: x=${analysis.hostBounds?.x}, y=${analysis.hostBounds?.y}, width=${analysis.hostBounds?.width}, height=${analysis.hostBounds?.height}

OPTIMIZE ONLY EVERYTHING OUTSIDE THE HOST BOUNDS:
${analysis.improvements.join("\n")}

Optimization Intensity: ${intensity} (apply ${(multiplier * 100).toFixed(0)}% of suggested changes)

Principles to apply:
- Gestalt theory (proximity, similarity, continuity, closure, figure-ground)
- Visual hierarchy (clear dominance, correct visual path)
- Editorial refinement (premium, intimate, psychological)
- Contrast and separation
- Breathing room and negative space
- Coherence with dark aesthetic (#020B18) and lime accents (#E4F542)

The refinement should feel like a director of art improved the background while the subject remains perfectly preserved.

Reference image:
${imageUrl}`;

  const response = await fetch("https://api.together.xyz/inference", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${togetherApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "black-forest-labs/FLUX.1-pro",
      prompt: refinementPrompt,
      image_url: imageUrl,
      steps: 8,
      temperature: 0.5,
    }),
  });

  if (!response.ok) {
    throw new Error(`Together API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.output.choices?.[0]?.image_url || data.output?.[0];
}

serve(async (req) => {
  const cors = getCorsHeaders(req);

  try {
    const body: RefineRequest = await req.json();
    const { imageUrl, intensity, focus, episodeId } = body;

    console.log(`Refining visual composition for episode ${episodeId}...`);
    console.log(`Intensity: ${intensity}, Focus: ${focus}`);

    // Step 1: Analyze with Claude Vision
    const analysis = await analyzeWithClaude(imageUrl, focus, intensity);

    if (!analysis.hostDetected) {
      console.warn("Host not detected - proceeding with caution");
    }

    // Step 2: Generate refined image
    const refinedImageUrl = await generateRefinedImage(
      imageUrl,
      analysis,
      intensity
    );

    // Save refinement record
    const { error: saveError } = await supabase.from("visual_refinements").insert({
      episode_id: episodeId,
      original_image_url: imageUrl,
      refined_image_url: refinedImageUrl,
      intensity,
      focus,
      analysis: analysis,
      status: "completed",
    });

    if (saveError) throw saveError;

    return new Response(
      JSON.stringify({
        success: true,
        original: imageUrl,
        refined: refinedImageUrl,
        analysis: analysis,
        message: "Visual composition refined successfully",
      }),
      {
        headers: { ...cors, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("[refine-visual-composition] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    const code = message.includes("timeout") ? "TIMEOUT" : "INTERNAL_ERROR";
    return errorResponse(cors, code, message, 500);
  }
});
