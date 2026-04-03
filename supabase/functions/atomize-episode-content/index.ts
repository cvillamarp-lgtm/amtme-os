/**
 * Edge Function: atomize-episode-content (Phase 7 — content multiplication)
 *
 * Converts a fully-produced episode into 10-15 atomic content pieces for
 * multi-channel distribution: YouTube Shorts, TikTok, Instagram Reels, LinkedIn, Email.
 *
 * Input: { episode_id, source_type } where source_type = "transcript" | "video" | "audio"
 * Output: Array of atomic_content items, each formatted for specific platforms
 *
 * Pipeline:
 *   1. Fetch episode + generated_assets (quotes, clips, visuals)
 *   2. Extract key moments using Claude (hooks, quotes, transitions)
 *   3. Generate platform-specific copy + dimensions + durations
 *   4. Create atomic content records in database
 *   5. Queue for distribution automation
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { errorResponse } from "../_shared/response.ts";
import { callAI } from "../_shared/ai.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface AtomizeRequest {
  episode_id: string;
  source_type: "transcript" | "video" | "audio";
}

interface AtomicContent {
  piece_id: string;
  type: "hook" | "quote" | "clip" | "story" | "carousel";
  platforms: ("youtube_short" | "tiktok" | "instagram_reel" | "linkedin" | "email")[];
  headline: string;
  body_copy: string;
  cta: string;
  duration_seconds: number;
  dimensions: { width: number; height: number };
  source_timestamp?: { start: number; end: number };
  asset_references: string[];
}

async function extractAtomicMoments(
  episodeId: string,
  title: string,
  transcript: string,
  quotes: string[]
): Promise<AtomicContent[]> {
  const extractionPrompt = `Analiza esta transcripción de episodio de podcast y extrae 10-15 momentos atómicos para contenido social.

TÍTULO: ${title}

TRANSCRIPCIÓN (primeros 2000 caracteres):
${transcript.substring(0, 2000)}

QUOTES DISPONIBLES:
${quotes.slice(0, 5).join("\n")}

Para cada momento, devuelve ÚNICAMENTE este JSON (sin markdown):
[
  {
    "piece_id": "unique_id",
    "type": "hook|quote|clip|story|carousel",
    "headline": "encabezado corto (max 50 chars)",
    "body_copy": "cuerpo del contenido (max 200 chars)",
    "cta": "call-to-action (2-5 palabras)",
    "duration_seconds": 15,
    "source_timestamp": { "start": 0, "end": 15 }
  },
  ...
]

Criterios:
- Hook: Frases que generan curiosidad inmediata
- Quote: Citas memorables del episodio
- Clip: Momentos de transición o enseñanza
- Story: Narrativas de 3-5 frames
- Carousel: Series de puntos progresivos

Asegura que cada momento es:
- Independiente (comprensible sin contexto)
- Atractivo (hook psicológico o valor inmediato)
- Compartible (generador de impulso)`;

  try {
    const response = await callAI(
      [
        {
          role: "system",
          content: "Eres especialista en atomización de contenido de podcast. Generas únicamente JSON válido sin explicaciones."
        },
        {
          role: "user",
          content: extractionPrompt
        }
      ],
      0.7
    );

    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error("No JSON array found in response");

    const moments = JSON.parse(jsonMatch[0]) as Array<Omit<AtomicContent, "platforms" | "dimensions" | "asset_references">>;

    // Map moments to multi-platform format
    return moments.map((moment, idx) => ({
      ...moment,
      piece_id: `${episodeId}_${moment.type}_${idx + 1}`,
      platforms: determinePlatforms(moment.type, moment.duration_seconds),
      dimensions: getDimensions(moment.type),
      asset_references: []
    }));
  } catch (error) {
    console.error("[atomize] Extraction failed:", error);
    throw new Error(`Failed to extract atomic moments: ${error}`);
  }
}

function determinePlatforms(
  type: string,
  duration: number
): ("youtube_short" | "tiktok" | "instagram_reel" | "linkedin" | "email")[] {
  const platforms: ("youtube_short" | "tiktok" | "instagram_reel" | "linkedin" | "email")[] = [];

  // All types go to email
  platforms.push("email");

  // Duration-based routing
  if (duration <= 60) {
    platforms.push("youtube_short", "tiktok", "instagram_reel");
  }

  // Type-specific routing
  if (type === "quote") {
    platforms.push("linkedin");
  }
  if (type === "carousel") {
    platforms.push("linkedin");
  }

  return [...new Set(platforms)];
}

function getDimensions(type: string): { width: number; height: number } {
  const dimensionsMap: Record<string, { width: number; height: number }> = {
    hook: { width: 1080, height: 1920 }, // Vertical
    quote: { width: 1080, height: 1920 }, // Vertical (social post)
    clip: { width: 1080, height: 1920 }, // Vertical (video)
    story: { width: 1080, height: 1920 }, // Vertical (stories)
    carousel: { width: 1080, height: 1350 } // Square (carousel)
  };

  return dimensionsMap[type] || { width: 1080, height: 1920 };
}

serve(async (req) => {
  const cors = getCorsHeaders(req);

  try {
    const body: AtomizeRequest = await req.json();
    const { episode_id, source_type } = body;

    console.log(`[atomize] Starting content atomization for episode ${episode_id}...`);

    // Fetch episode + related content
    const { data: episode, error: episodeError } = await supabase
      .from("episodes")
      .select("id, title, status, tema, episode_script, audio_transcript, created_at")
      .eq("id", episode_id)
      .single();

    if (episodeError || !episode) {
      throw new Error(`Episode not found: ${episode_id}`);
    }

    // Fetch generated assets (quotes, captions, etc.)
    const { data: assets } = await supabase
      .from("generated_assets")
      .select("asset_key, content_json")
      .eq("episode_id", episode_id)
      .in("asset_type", ["output", "caption"]);

    const quotes = assets
      ?.filter(a => a.asset_key?.includes("quote"))
      .flatMap(a => {
        const content = a.content_json as Record<string, unknown>;
        if (Array.isArray(content.short_quotes)) return content.short_quotes as string[];
        if (Array.isArray(content.high_impact)) return content.high_impact as string[];
        return [];
      }) || [];

    const transcript = episode.audio_transcript || episode.episode_script || "";

    console.log(`[atomize] Extracting atomic moments from ${episode.title}...`);
    const atomicMoments = await extractAtomicMoments(
      episode_id,
      episode.title,
      transcript,
      quotes
    );

    // Save atomic content to database
    const savedPieces = [];
    for (const moment of atomicMoments) {
      const { data, error } = await supabase
        .from("atomic_content")
        .insert({
          episode_id,
          piece_id: moment.piece_id,
          content_type: moment.type,
          platforms: moment.platforms,
          headline: moment.headline,
          body_copy: moment.body_copy,
          cta: moment.cta,
          duration_seconds: moment.duration_seconds,
          dimensions: moment.dimensions,
          source_timestamp: moment.source_timestamp,
          status: "draft",
          created_at: new Date().toISOString()
        })
        .select("id")
        .single();

      if (error) {
        console.error(`[atomize] Failed to save ${moment.piece_id}:`, error);
        continue;
      }

      savedPieces.push({
        piece_id: moment.piece_id,
        type: moment.type,
        platforms: moment.platforms,
        id: data?.id
      });
    }

    // Queue distribution automation
    console.log(`[atomize] Queuing ${savedPieces.length} pieces for distribution...`);
    for (const piece of savedPieces) {
      await supabase
        .from("distribution_queue")
        .insert({
          atomic_content_id: piece.id,
          episode_id,
          piece_id: piece.piece_id,
          platforms: piece.platforms,
          status: "pending",
          priority: "normal",
          scheduled_for: new Date(Date.now() + 3600000).toISOString() // 1 hour from now
        })
        .single();
    }

    return new Response(
      JSON.stringify({
        success: true,
        episode_id,
        atomic_pieces_created: savedPieces.length,
        pieces: savedPieces,
        message: `Created and queued ${savedPieces.length} atomic content pieces for distribution`
      }),
      {
        headers: { ...cors, "Content-Type": "application/json" },
        status: 200
      }
    );
  } catch (error) {
    console.error("[atomize-episode-content] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    const code = message.includes("not found") ? "EPISODE_NOT_FOUND" : "ATOMIZATION_FAILED";
    return errorResponse(cors, code, message, 500);
  }
});
