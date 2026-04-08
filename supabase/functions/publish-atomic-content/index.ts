import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { getCorsHeaders } from "../_shared/cors.ts";
import { errorResponse } from "../_shared/response.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Platform-specific publishing helpers
const publishToInstagram = async (atomicContent: any, token: string) => {
  const businessAccountId = Deno.env.get("INSTAGRAM_BUSINESS_ACCOUNT_ID");
  const videoUrl = atomicContent.video_url;
  const caption = `${atomicContent.headline}\n\n${atomicContent.body_copy}\n\n${atomicContent.cta}`;

  try {
    // Step 1: Create media container
    const containerResponse = await fetch(
      `https://graph.instagram.com/v18.0/${businessAccountId}/media?media_type=REELS&video_url=${encodeURIComponent(videoUrl)}&caption=${encodeURIComponent(caption)}&access_token=${token}`,
      { method: "POST" }
    );

    if (!containerResponse.ok) {
      throw new Error(`Failed to create media container: ${await containerResponse.text()}`);
    }

    const containerData = await containerResponse.json();
    const mediaContainerId = containerData.id;

    // Step 2: Publish media
    const publishResponse = await fetch(
      `https://graph.instagram.com/v18.0/${businessAccountId}/media_publish?creation_id=${mediaContainerId}&access_token=${token}`,
      { method: "POST" }
    );

    if (!publishResponse.ok) {
      throw new Error(`Failed to publish media: ${await publishResponse.text()}`);
    }

    return {
      success: true,
      mediaId: (await publishResponse.json()).id,
      platform: "instagram_reel",
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      platform: "instagram_reel",
    };
  }
};

// Main handler
Deno.serve(async (req) => {
  const cors = getCorsHeaders(req);

  if (req.method !== "POST") {
    return errorResponse(cors, "METHOD_NOT_ALLOWED", "Method not allowed", 405);
  }

  try {
    // Get pending distribution queue items
    const { data: queueItems, error: queueError } = await supabase
      .from("distribution_queue")
      .select("*, atomic_content(*)")
      .eq("status", "pending")
      .lt("scheduled_for", new Date().toISOString())
      .limit(10);

    if (queueError) throw queueError;

    if (!queueItems || queueItems.length === 0) {
      return new Response(
        JSON.stringify({ message: "No pending items to publish", published: 0 }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    const instagramToken = Deno.env.get("INSTAGRAM_ACCESS_TOKEN");
    const results = [];

    // Process each queue item
    for (const item of queueItems) {
      const atomicContent = item.atomic_content;

      // Route to appropriate platform handler
      let publishResult = null;

      if (item.platforms.includes("instagram_reel")) {
        publishResult = await publishToInstagram(atomicContent, instagramToken);
      }

      if (publishResult?.success) {
        // Update queue item to published
        await supabase
          .from("distribution_queue")
          .update({
            status: "published",
            published_at: new Date().toISOString(),
          })
          .eq("id", item.id);

        results.push({
          id: item.id,
          status: "published",
          platform: publishResult.platform,
          mediaId: publishResult.mediaId,
        });
      } else {
        // Update queue item to failed
        await supabase
          .from("distribution_queue")
          .update({
            status: "failed",
            last_error: publishResult?.error || "Unknown error",
          })
          .eq("id", item.id);

        results.push({
          id: item.id,
          status: "failed",
          platform: publishResult?.platform,
          error: publishResult?.error,
        });
      }
    }

    return new Response(JSON.stringify({ published: results.length, results }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error publishing atomic content:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return errorResponse(cors, "PUBLISH_FAILED", message, 500);
  }
});
