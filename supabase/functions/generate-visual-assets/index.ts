import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { errorResponse } from "../_shared/response.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const togetherApiKey = Deno.env.get("TOGETHER_API_KEY")!;

const supabase = createClient(supabaseUrl, supabaseKey);

const DEFAULT_TIMEOUT_MS = 60_000; // 60 seconds for image generation

/**
 * Wrap a fetch call with timeout enforcement.
 * Aborts if the request exceeds the timeout.
 */
async function fetchWithTimeout(
  url: string,
  options?: RequestInit,
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

interface GenerateAssetsRequest {
  episode_id: string;
  episode_title: string;
  central_thesis: string;
  theme: string;
}

async function generateImageWithTogether(prompt: string): Promise<string> {
  const response = await fetchWithTimeout(
    "https://api.together.xyz/inference",
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${togetherApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "black-forest-labs/FLUX.1-pro",
        prompt: prompt,
        width: 1080,
        height: 1920,
        steps: 4,
        temperature: 0.7,
      }),
    },
    DEFAULT_TIMEOUT_MS,
  );

  if (!response.ok) {
    throw new Error(`Together API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.output.choices[0].image_url || data.output[0];
}

async function generateAssets(req: GenerateAssetsRequest) {
  const { episode_id, episode_title, central_thesis, theme } = req;

  const assets = {
    reel: {
      prompt: `Modern podcast episode cover, minimalist design. Title: "${episode_title}". Theme: ${theme}. Style: professional, high-contrast, dark blue #020B18 background with lime #E4F542 accent. 1080x1920px vertical.`,
      piece_id: "reel",
      piece_name: "Reel 60s",
    },
    story: {
      prompt: `Instagram story design for podcast episode. Quote: "${central_thesis.substring(0, 100)}...". Theme: ${theme}. Colors: dark blue background, lime highlights. 1080x1920px vertical, minimal text, high impact.`,
      piece_id: "story",
      piece_name: "Story 15s",
    },
    cover: {
      prompt: `Podcast episode cover art. Title: "${episode_title}". Theme: ${theme}. Professional design with AMTME podcast branding. 3000x3000px square, suitable for Spotify/Apple Podcasts.`,
      piece_id: "cover",
      piece_name: "Cover 3000x3000",
    },
    thumbnail: {
      prompt: `YouTube thumbnail for podcast episode. Bold typography: "${episode_title.substring(0, 40)}...". Theme: ${theme}. High contrast colors: dark blue #020B18, lime #E4F542. 1280x720px landscape, attention-grabbing.`,
      piece_id: "thumbnail",
      piece_name: "Thumbnail 1280x720",
    },
  };

  // Generate all assets in parallel
  const generatedAssets = await Promise.allSettled(
    Object.entries(assets).map(async ([key, asset]) => {
      try {
        console.log(`Generating ${key}...`);
        const imageUrl = await generateImageWithTogether(asset.prompt);

        // Download image and upload to Supabase Storage
        const imageResponse = await fetchWithTimeout(imageUrl, undefined, 30_000);
        const imageBlob = await imageResponse.arrayBuffer();
        const fileName = `${episode_id}/${asset.piece_id}_${Date.now()}.png`;

        const { error: uploadError } = await supabase.storage
          .from("episode-assets")
          .upload(fileName, imageBlob, {
            contentType: "image/png",
            upsert: false,
          });

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: publicUrl } = supabase.storage
          .from("episode-assets")
          .getPublicUrl(fileName);

        // Save asset metadata to database
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

        console.log(`✅ Generated ${key}`);
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
  return generatedAssets
    .filter(r => r.status === 'fulfilled')
    .map(r => r.value);
}

serve(async (req) => {
  const cors = getCorsHeaders(req);

  try {
    const body: GenerateAssetsRequest = await req.json();

    console.log(`Generating visual assets for episode ${body.episode_id}...`);

    const assets = await generateAssets(body);

    return new Response(
      JSON.stringify({
        success: true,
        assets,
        message: `Generated ${assets.length} visual assets`,
      }),
      {
        headers: { ...cors, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("[generate-visual-assets] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    const code = message.includes("timeout") ? "TIMEOUT" : "INTERNAL_ERROR";
    return errorResponse(cors, code, message, 500);
  }
});
