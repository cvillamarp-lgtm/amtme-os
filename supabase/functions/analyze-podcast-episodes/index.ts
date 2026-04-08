/**
 * Edge Function: analyze-podcast-episodes
 *
 * Finds podcast episodes ready for atomization and queues them.
 * Invoked by: Vercel Cron (hourly)
 * Input: { batch_size?: number }
 * Output: { queued: number, skipped: number, failed: string[] }
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { errorResponse } from "../_shared/response.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface AnalyzeRequest {
  batch_size?: number;
}

async function queueEpisodeForAtomization(episodeId: string): Promise<boolean> {
  try {
    // Check if already queued
    const { data: existing, error: checkError } = await supabase
      .from("atomization_queue")
      .select("id")
      .eq("episode_id", episodeId)
      .maybeSingle();

    if (checkError && checkError.code !== "PGRST116") {
      throw checkError;
    }

    if (existing) {
      console.log(`[analyze-episodes] Episode ${episodeId} already queued`);
      return false;
    }

    // Insert into atomization_queue
    const { error: insertError } = await supabase.from("atomization_queue").insert({
      episode_id: episodeId,
      status: "pending",
      retry_count: 0,
      max_retries: 3,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (insertError) {
      throw insertError;
    }

    console.log(`[analyze-episodes] Queued episode ${episodeId}`);
    return true;
  } catch (error) {
    console.error(`[analyze-episodes] Failed to queue episode ${episodeId}:`, error);
    throw error;
  }
}

serve(async (req) => {
  const cors = getCorsHeaders(req);

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const body: AnalyzeRequest = await req.json().catch(() => ({}));
    const { batch_size = 10 } = body;

    console.log(`[analyze-episodes] Analyzing podcast episodes (batch=${batch_size})...`);

    // Fetch episodes ready for atomization (status: approved, no atomization_queue entry)
    const { data: readyEpisodes, error: fetchError } = await supabase
      .from("episodes")
      .select("id, title")
      .eq("status", "approved")
      .not("id", "in", `(select episode_id from atomization_queue where episode_id is not null)`)
      .order("created_at", { ascending: true })
      .limit(batch_size);

    if (fetchError) {
      throw new Error(`Failed to fetch episodes: ${fetchError.message}`);
    }

    if (!readyEpisodes || readyEpisodes.length === 0) {
      console.log("[analyze-episodes] No new episodes ready for atomization");
      return new Response(
        JSON.stringify({
          success: true,
          queued: 0,
          skipped: 0,
          failed: [],
          message: "No episodes ready for atomization",
        }),
        {
          headers: { ...cors, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    let queued = 0;
    const failedItems: string[] = [];

    // Queue each episode for atomization
    for (const episode of readyEpisodes) {
      try {
        const success = await queueEpisodeForAtomization(episode.id);
        if (success) {
          queued++;
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`[analyze-episodes] Failed to queue ${episode.id}:`, errorMsg);
        failedItems.push(episode.id);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        queued,
        skipped: readyEpisodes.length - queued - failedItems.length,
        failed: failedItems,
        message: `Queued ${queued} episodes, skipped ${readyEpisodes.length - queued - failedItems.length}, failed ${failedItems.length}`,
      }),
      {
        headers: { ...cors, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("[analyze-episodes] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return errorResponse(cors, "ANALYSIS_FAILED", message, 500);
  }
});
