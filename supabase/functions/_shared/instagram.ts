/**
 * Instagram Graph API Helper
 * Handles Reel publishing and metrics collection
 */

interface InstagramMediaPayload {
  media_type: "REELS" | "CAROUSEL";
  video_url?: string;
  image_url?: string;
  caption: string;
  thumb_offset?: number;
}

interface InstagramMediaContainer {
  media_type: string;
  video_url?: string;
  image_url?: string;
  caption: string;
}

export async function publishToInstagramReel(
  videoUrl: string,
  headline: string,
  bodyText: string,
  cta: string
): Promise<{ status: string; mediaId?: string; error?: string }> {
  try {
    const accessToken = Deno.env.get("INSTAGRAM_ACCESS_TOKEN");
    const businessAccountId = Deno.env.get("INSTAGRAM_BUSINESS_ACCOUNT_ID");

    if (!accessToken || !businessAccountId) {
      throw new Error("Instagram credentials not configured");
    }

    const caption = `${headline}\n\n${bodyText}\n\n${cta}`;

    // Step 1: Create a media container (upload request)
    const containerPayload: InstagramMediaContainer = {
      media_type: "REELS",
      video_url: videoUrl,
      caption: caption
    };

    const containerResponse = await fetch(
      `https://graph.instagram.com/v18.0/${businessAccountId}/media`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ...containerPayload,
          access_token: accessToken
        })
      }
    );

    if (!containerResponse.ok) {
      const error = await containerResponse.json();
      throw new Error(`Instagram API error: ${JSON.stringify(error)}`);
    }

    const mediaData = await containerResponse.json() as { id: string };
    const mediaId = mediaData.id;

    // Step 2: Publish the media container
    const publishResponse = await fetch(
      `https://graph.instagram.com/v18.0/${businessAccountId}/media_publish`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          creation_id: mediaId,
          access_token: accessToken
        })
      }
    );

    if (!publishResponse.ok) {
      const error = await publishResponse.json();
      throw new Error(`Failed to publish media: ${JSON.stringify(error)}`);
    }

    const publishData = await publishResponse.json() as { id: string };

    return {
      status: "published",
      mediaId: publishData.id
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[instagram] Reel publication error:", message);
    return {
      status: "failed",
      error: message
    };
  }
}

export async function getInstagramMetrics(
  mediaId: string
): Promise<{ views: number; engagement: number; shares: number }> {
  try {
    const accessToken = Deno.env.get("INSTAGRAM_ACCESS_TOKEN");

    if (!accessToken) {
      throw new Error("Instagram access token not configured");
    }

    // Fetch insights for the media
    const insightsResponse = await fetch(
      `https://graph.instagram.com/v18.0/${mediaId}/insights?metric=engagement,impressions,reach,saved,shares&access_token=${accessToken}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json"
        }
      }
    );

    if (!insightsResponse.ok) {
      console.warn("Failed to fetch Instagram metrics");
      return {
        views: 0,
        engagement: 0,
        shares: 0
      };
    }

    const insightsData = await insightsResponse.json() as {
      data: Array<{ name: string; period: string; values: Array<{ value: number }> }>;
    };

    const metricsMap: Record<string, number> = {};

    for (const metric of insightsData.data) {
      const value = metric.values[0]?.value || 0;
      metricsMap[metric.name] = value;
    }

    return {
      views: metricsMap.impressions || 0,
      engagement: metricsMap.engagement || 0,
      shares: metricsMap.shares || 0
    };
  } catch (error) {
    console.error("[instagram] Metrics error:", error);
    return {
      views: 0,
      engagement: 0,
      shares: 0
    };
  }
}

export async function publishToInstagramFeed(
  imageUrl: string,
  headline: string,
  bodyText: string,
  cta: string
): Promise<{ status: string; mediaId?: string; error?: string }> {
  try {
    const accessToken = Deno.env.get("INSTAGRAM_ACCESS_TOKEN");
    const businessAccountId = Deno.env.get("INSTAGRAM_BUSINESS_ACCOUNT_ID");

    if (!accessToken || !businessAccountId) {
      throw new Error("Instagram credentials not configured");
    }

    const caption = `${headline}\n\n${bodyText}\n\n${cta}`;

    // Create carousel or image post
    const containerPayload: InstagramMediaContainer = {
      media_type: "CAROUSEL",
      image_url: imageUrl,
      caption: caption
    };

    const containerResponse = await fetch(
      `https://graph.instagram.com/v18.0/${businessAccountId}/media`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ...containerPayload,
          access_token: accessToken
        })
      }
    );

    if (!containerResponse.ok) {
      const error = await containerResponse.json();
      throw new Error(`Instagram API error: ${JSON.stringify(error)}`);
    }

    const mediaData = await containerResponse.json() as { id: string };
    const mediaId = mediaData.id;

    // Publish
    const publishResponse = await fetch(
      `https://graph.instagram.com/v18.0/${businessAccountId}/media_publish`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          creation_id: mediaId,
          access_token: accessToken
        })
      }
    );

    if (!publishResponse.ok) {
      const error = await publishResponse.json();
      throw new Error(`Failed to publish media: ${JSON.stringify(error)}`);
    }

    const publishData = await publishResponse.json() as { id: string };

    return {
      status: "published",
      mediaId: publishData.id
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[instagram] Feed publication error:", message);
    return {
      status: "failed",
      error: message
    };
  }
}
