/**
 * Vercel Cron: Track distribution metrics
 * Route: /api/cron/track-distribution-metrics
 * Schedule: Every 6 hours (0 */6 * * *)
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";

export const config = {
  maxDuration: 120 // 2 minutes
};

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Verify cron signature
  const authHeader = req.headers.authorization;
  const secret = process.env.VERCEL_CRON_SECRET;

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase credentials");
    }

    // Invoke the Edge Function
    const response = await fetch(`${supabaseUrl}/functions/v1/track-distribution-metrics`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${supabaseKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        lookback_hours: 6
      })
    });

    const result = await response.json();

    console.log("[cron:metrics] Tracked:", {
      pieces: result.tracked
    });

    return res.status(response.status).json(result);
  } catch (error) {
    console.error("[cron:metrics] Error:", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
}
