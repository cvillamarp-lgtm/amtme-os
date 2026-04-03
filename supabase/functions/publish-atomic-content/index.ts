/**
 * Edge Function: publish-atomic-content
 *
 * Consumes distribution_queue and publishes atomic content to target platforms:
 * - YouTube Shorts (requires video asset)
 * - TikTok (requires video asset)
 * - Instagram Reels (requires video asset)
 * - LinkedIn (image + text)
 * - Email (newsletter)
 *
 * Triggered by:
 *   1. Scheduled cron (hourly check for pending items)
 *   2. Direct invocation from distribution queue automation
 *
 * Output: Updates distribution_queue with published URLs and metrics
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { errorResponse } from "../_shared/response.ts";
import { publishToLinkedIn, publishToLinkedInWithImage } from "../_shared/linkedin.ts";
import { publishToInstagramReel, publishToInstagramFeed } from "../_shared/instagram.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface PublishRequest {
  batch_size?: number;
  platform_filter?: string;
}

async function publishToLinkedInHandler(
  piece: { headline: string; body_copy: string; cta: string },
  imageUrl?: string
): Promise<{ status: string; url?: string; error?: string }> {
  try {
    let result;

    if (imageUrl) {
      result = await publishToLinkedInWithImage(
        piece.headline,
        piece.body_copy,
        piece.cta,
        imageUrl
      );
    } else {
      result = await publishToLinkedIn(
        piece.headline,
        piece.body_copy,
        piece.cta
      );
    }

    if (result.status === "published" && result.postId) {
      return {
        status: "published",
        url: `https://www.linkedin.com/feed/update/${result.postId}`
      };
    }

    return {
      status: "failed",
      error: result.error || "Publication failed"
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[publish] LinkedIn error:", message);
    return {
      status: "failed",
      error: message
    };
  }
}

async function publishToEmail(
  episodeId: string,
  piece: { headline: string; body_copy: string; cta: string },
  subscribers?: string[]
): Promise<{ status: string; sent_count?: number; error?: string }> {
  // Email publication via Resend or similar
  // For MVP, just log intent
  console.log(`[publish] Email queued for ${subscribers?.length || 0} subscribers`);
  return {
    status: "queued",
    sent_count: subscribers?.length || 0
  };
}

async function publishToYouTubeShorts(
  pieceId: string,
  videoUrl: string,
  metadata: { headline: string; cta: string }
): Promise<{ status: string; url?: string; error?: string }> {
  // YouTube Shorts requires OAuth + YouTube Data API
  // For MVP: queue for async processing
  console.log("[publish] YouTube Shorts queued (requires OAuth integration)");
  return {
    status: "queued",
    error: "YouTube OAuth integration pending"
  };
}

serve(async (req) => {
  const cors = getCorsHeaders(req);

  try {
    const body: PublishRequest = await req.json();
    const { batch_size = 10, platform_filter } = body;

    console.log(`[publish] Processing distribution queue (batch=${batch_size})...`);

    // Fetch pending distribution items
    let query = supabase
      .from("distribution_queue")
      .select(
        `
        id,
        atomic_content_id,
        episode_id,
        piece_id,
        platforms,
        status,
        scheduled_for,
        atomic_content!inner(
          headline,
          body_copy,
          cta,
          content_type,
          dimensions
        )
      `
      )
      .eq("status", "pending")
      .lt("scheduled_for", new Date().toISOString())
      .limit(batch_size);

    if (platform_filter) {
      query = query.contains("platforms", [platform_filter]);
    }

    const { data: queueItems, error: fetchError } = await query;

    if (fetchError) {
      throw new Error(`Failed to fetch queue: ${fetchError.message}`);
    }

    if (!queueItems || queueItems.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          published: 0,
          message: "No pending items to publish"
        }),
        {
          headers: { ...cors, "Content-Type": "application/json" },
          status: 200
        }
      );
    }

    const publishedUrls: Record<string, { [key: string]: string }> = {};
    const failedItems: string[] = [];

    // Process each queue item
    for (const item of queueItems) {
      const atomicContent = item.atomic_content as {
        headline: string;
        body_copy: string;
        cta: string;
        content_type: string;
      };

      console.log(`[publish] Publishing ${item.piece_id}...`);

      const itemPublishedUrls: { [key: string]: string } = {};

      // Route to appropriate platform handlers
      for (const platform of item.platforms) {
        try {
          if (platform === "linkedin") {
            const linkedInResult = await publishToLinkedInHandler(atomicContent);
            if (linkedInResult.status === "published" && linkedInResult.url) {
              itemPublishedUrls[platform] = linkedInResult.url;
            } else if (linkedInResult.error) {
              console.warn(`LinkedIn error: ${linkedInResult.error}`);
              failedItems.push(item.piece_id);
            }
          } else if (platform === "email") {
            const emailResult = await publishToEmail(item.episode_id, atomicContent);
            if (emailResult.error) {
              console.warn(`Email error: ${emailResult.error}`);
            }
          } else if (platform === "instagram_reel") {
            // Instagram Reels require video URL from atomic_content.video_url
            const videoUrl = (item.atomic_content as any).video_url;
            if (videoUrl) {
              const instagramResult = await publishToInstagramReel(
                videoUrl,
                atomicContent.headline,
                atomicContent.body_copy,
                atomicContent.cta
              );
              if (instagramResult.status === "published" && instagramResult.mediaId) {
                itemPublishedUrls.instagram_reel = `https://www.instagram.com/reel/${instagramResult.mediaId}`;
              } else if (instagramResult.error) {
                console.warn(`Instagram Reel error: ${instagramResult.error}`);
                failedItems.push(item.piece_id);
              }
            } else {
              console.warn(`[publish] Instagram Reel requires video_url`);
              failedItems.push(item.piece_id);
            }
          } else if (platform === "instagram_feed") {
            // Instagram Feed posts require image URL
            const imageUrl = (item.atomic_content as any).image_url;
            if (imageUrl) {
              const instagramResult = await publishToInstagramFeed(
                imageUrl,
                atomicContent.headline,
                atomicContent.body_copy,
                atomicContent.cta
              );
              if (instagramResult.status === "published" && instagramResult.mediaId) {
                itemPublishedUrls.instagram_feed = `https://www.instagram.com/p/${instagramResult.mediaId}`;
              } else if (instagramResult.error) {
                console.warn(`Instagram Feed error: ${instagramResult.error}`);
                failedItems.push(item.piece_id);
              }
            } else {
              console.warn(`[publish] Instagram Feed requires image_url`);
              failedItems.push(item.piece_id);
            }
          } else if (platform === "youtube_short" || platform === "tiktok") {
            // Requires video asset; queue for async processing
            console.log(`[publish] ${platform} queued for async video processing`);
          }
        } catch (error) {
          console.error(`Failed to publish to ${platform}:`, error);
          failedItems.push(item.piece_id);
          continue;
        }
      }

      // Update distribution_queue status
      const { error: updateError } = await supabase
        .from("distribution_queue")
        .update({
          status: failedItems.includes(item.piece_id) ? "failed" : "published",
          published_at: new Date().toISOString(),
          published_urls: itemPublishedUrls
        })
        .eq("id", item.id);

      if (updateError) {
        console.error(`Failed to update queue item ${item.id}:`, updateError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        published: queueItems.length - failedItems.length,
        failed: failedItems.length,
        message: `Published ${queueItems.length - failedItems.length}/${queueItems.length} items`
      }),
      {
        headers: { ...cors, "Content-Type": "application/json" },
        status: 200
      }
    );
  } catch (error) {
    console.error("[publish-atomic-content] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return errorResponse(cors, "PUBLICATION_FAILED", message, 500);
  }
});
