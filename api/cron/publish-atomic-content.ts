/**
 * Vercel Cron: Publish atomic content to distribution platforms
 * Route: /api/cron/publish-atomic-content
 * Schedule: Every 30 minutes (*/30 * * * *)
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";

export const config = {
  maxDuration: 60 // 60 seconds
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
    const response = await fetch(`${supabaseUrl}/functions/v1/publish-atomic-content`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${supabaseKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        batch_size: 5
      })
    });

    const result = await response.json();

    console.log("[cron:publish] Result:", result);

    return res.status(response.status).json(result);
  } catch (error) {
    console.error("[cron:publish] Error:", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
}
