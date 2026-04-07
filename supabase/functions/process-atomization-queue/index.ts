/**
 * Edge Function: process-atomization-queue
 *
 * Scheduled (cron) function that processes pending atomization requests.
 * Invoked hourly to convert episodes in atomization_queue → atomic_content pieces
 *
 * Triggered by: Vercel Cron (0 * * * *)
 * Input: { batch_size?: number }
 * Output: { processed: number, created_pieces: number, failed: string[] }
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { errorResponse } from "../_shared/response.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface ProcessQueueRequest {
  batch_size?: number;
  max_retries?: number;
}

async function invokeAtomizationFunction(
  episodeId: string
): Promise<{ success: boolean; pieces: number }> {
  const atomizeUrl = `${supabaseUrl}/functions/v1/atomize-episode-content`;

  try {
    const response = await fetch(atomizeUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${supabaseKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        episode_id: episodeId,
        source_type: "transcript",
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Atomization failed: ${response.statusText} - ${error}`);
    }

    const result = await response.json();
    return {
      success: true,
      pieces: result.atomic_pieces_created || 0,
    };
  } catch (error) {
    console.error(`[process-queue] Atomization invocation failed for ${episodeId}:`, error);
    throw error;
  }
}

serve(async (req) => {
  const cors = getCorsHeaders(req);

  // Only allow POST from Vercel cron or internal calls
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const body: ProcessQueueRequest = await req.json().catch(() => ({}));
    const { batch_size = 5, max_retries = 3 } = body;

    console.log(`[process-queue] Processing atomization queue (batch=${batch_size})...`);

    // Fetch pending atomization requests
    const { data: queueItems, error: fetchError } = await supabase
      .from("atomization_queue")
      .select("id, episode_id, status, created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(batch_size);

    if (fetchError) {
      throw new Error(`Failed to fetch queue: ${fetchError.message}`);
    }

    if (!queueItems || queueItems.length === 0) {
      console.log("[process-queue] No pending items in queue");
      return new Response(
        JSON.stringify({
          success: true,
          processed: 0,
          created_pieces: 0,
          message: "No pending atomization requests",
        }),
        {
          headers: { ...cors, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    let totalPieces = 0;
    const failedItems: string[] = [];

    // Process each queue item
    for (const item of queueItems) {
      try {
        console.log(`[process-queue] Processing episode ${item.episode_id}...`);

        // Update status to "processing"
        await supabase.from("atomization_queue").update({ status: "processing" }).eq("id", item.id);

        // Invoke atomization with retry
        const result = await invokeAtomizationFunction(item.episode_id, 0, max_retries);

        // Update status to "completed"
        await supabase
          .from("atomization_queue")
          .update({
            status: "completed",
            retry_count: 0,
            updated_at: new Date().toISOString(),
          })
          .eq("id", item.id);

        totalPieces += result.pieces;
        console.log(
          `[process-queue] ✓ Episode ${item.episode_id} atomized (${result.pieces} pieces)`
        );
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`[process-queue] Failed to process ${item.episode_id}:`, errorMsg);

        // Atomically increment retry_count and check if we should requeue
        const { data: updatedItem } = await supabase
          .from("atomization_queue")
          .update({
            retry_count: (item.retry_count || 0) + 1,
            error_message: errorMsg,
            last_retry_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", item.id)
          .select("retry_count")
          .single();

        const newRetryCount = updatedItem?.retry_count || 1;
        const shouldRequeue = newRetryCount < max_retries;

        if (shouldRequeue) {
          console.log(
            `[process-queue] Re-queuing ${item.episode_id} (attempt ${newRetryCount}/${max_retries})`
          );
          await supabase.from("atomization_queue").update({ status: "pending" }).eq("id", item.id);
        } else {
          console.log(`[process-queue] Exhausted retries for ${item.episode_id}`);
          await supabase.from("atomization_queue").update({ status: "failed" }).eq("id", item.id);
          failedItems.push(item.episode_id);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: queueItems.length,
        created_pieces: totalPieces,
        failed: failedItems,
        message: `Processed ${queueItems.length} episodes, created ${totalPieces} atomic pieces`,
      }),
      {
        headers: { ...cors, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("[process-atomization-queue] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return errorResponse(cors, "QUEUE_PROCESSING_FAILED", message, 500);
  }
});
