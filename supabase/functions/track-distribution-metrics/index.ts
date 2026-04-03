/**
 * Edge Function: track-distribution-metrics
 *
 * Monitors performance of published atomic content across platforms.
 * Fetches views, engagement, saves, shares from platform APIs and stores in database.
 *
 * Triggered by: Cron (every 6 hours) or manual invocation
 * Supports: LinkedIn, YouTube Shorts, TikTok stubs
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { errorResponse } from "../_shared/response.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface MetricsRequest {
  lookback_hours?: number;
}

interface PlatformMetrics {
  views: number;
  engagement: number;
  saves: number;
  shares: number;
  clicks: number;
}

async function fetchLinkedInMetrics(postUrl: string): Promise<Partial<PlatformMetrics>> {
  // LinkedIn metrics require OAuth + LinkedIn Share API
  // For MVP: return placeholder
  console.log(`[metrics] LinkedIn metrics stub for ${postUrl}`);
  return {
    views: 0,
    engagement: 0
  };
}

async function fetchYouTubeMetrics(videoId: string): Promise<Partial<PlatformMetrics>> {
  // YouTube Shorts metrics require OAuth + YouTube Analytics API
  // For MVP: return placeholder
  console.log(`[metrics] YouTube metrics stub for ${videoId}`);
  return {
    views: 0,
    engagement: 0
  };
}

async function fetchTikTokMetrics(videoUrl: string): Promise<Partial<PlatformMetrics>> {
  // TikTok metrics require OAuth + TikTok Analytics API
  // For MVP: return placeholder
  console.log(`[metrics] TikTok metrics stub for ${videoUrl}`);
  return {
    views: 0,
    engagement: 0
  };
}

serve(async (req) => {
  const cors = getCorsHeaders(req);

  try {
    const body: MetricsRequest = await req.json().catch(() => ({}));
    const { lookback_hours = 24 } = body;

    console.log(`[metrics] Tracking distribution metrics (lookback=${lookback_hours}h)...`);

    // Fetch recently published atomic content
    const lookbackTime = new Date(Date.now() - lookback_hours * 3600000).toISOString();

    const { data: publishedContent, error: fetchError } = await supabase
      .from("atomic_content")
      .select(
        `
        id,
        episode_id,
        piece_id,
        content_type,
        published_urls,
        platforms,
        performance_metrics,
        updated_at
      `
      )
      .eq("status", "published")
      .gte("updated_at", lookbackTime);

    if (fetchError) {
      throw new Error(`Failed to fetch published content: ${fetchError.message}`);
    }

    if (!publishedContent || publishedContent.length === 0) {
      console.log("[metrics] No recently published content to track");
      return new Response(
        JSON.stringify({
          success: true,
          tracked: 0,
          message: "No published content in lookback period"
        }),
        {
          headers: { ...cors, "Content-Type": "application/json" },
          status: 200
        }
      );
    }

    let tracked = 0;
    const updates: Array<{ id: string; metrics: PlatformMetrics }> = [];

    // Fetch metrics for each published piece
    for (const piece of publishedContent) {
      const publishedUrls = piece.published_urls || {};
      const aggregatedMetrics: PlatformMetrics = {
        views: 0,
        engagement: 0,
        saves: 0,
        shares: 0,
        clicks: 0
      };

      // Fetch metrics by platform
      for (const platform of piece.platforms) {
        const url = publishedUrls[platform as keyof typeof publishedUrls];
        if (!url) continue;

        try {
          let metrics: Partial<PlatformMetrics> = {};

          if (platform === "linkedin") {
            metrics = await fetchLinkedInMetrics(url);
          } else if (platform === "youtube_short") {
            // Extract video ID from URL
            const videoId = new URL(url).searchParams.get("v") || "";
            metrics = await fetchYouTubeMetrics(videoId);
          } else if (platform === "tiktok") {
            metrics = await fetchTikTokMetrics(url);
          } else if (platform === "instagram_reel") {
            // Instagram requires graph API
            console.log("[metrics] Instagram metrics stub");
            metrics = { views: 0, engagement: 0 };
          }

          // Aggregate metrics
          aggregatedMetrics.views += metrics.views || 0;
          aggregatedMetrics.engagement += metrics.engagement || 0;
          aggregatedMetrics.saves += metrics.saves || 0;
          aggregatedMetrics.shares += metrics.shares || 0;
          aggregatedMetrics.clicks += metrics.clicks || 0;
        } catch (error) {
          console.error(`[metrics] Failed to fetch ${platform} metrics:`, error);
        }
      }

      updates.push({
        id: piece.id,
        metrics: aggregatedMetrics
      });
      tracked++;
    }

    // Batch update performance metrics
    for (const update of updates) {
      await supabase
        .from("atomic_content")
        .update({
          performance_metrics: update.metrics,
          updated_at: new Date().toISOString()
        })
        .eq("id", update.id);
    }

    console.log(`[metrics] Tracked ${tracked} pieces`);

    return new Response(
      JSON.stringify({
        success: true,
        tracked,
        message: `Tracked metrics for ${tracked} published pieces`
      }),
      {
        headers: { ...cors, "Content-Type": "application/json" },
        status: 200
      }
    );
  } catch (error) {
    console.error("[track-distribution-metrics] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return errorResponse(cors, "METRICS_TRACKING_FAILED", message, 500);
  }
});
