/**
 * Vercel Cron: Process atomization queue
 * Route: /api/cron/process-atomization-queue
 * Schedule: Hourly (0 * * * *)
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";

export const config = {
  maxDuration: 300 // 5 minutes
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
    const response = await fetch(`${supabaseUrl}/functions/v1/process-atomization-queue`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${supabaseKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        batch_size: 10,
        max_retries: 3
      })
    });

    const result = await response.json();

    console.log("[cron:atomize] Result:", {
      processed: result.processed,
      created_pieces: result.created_pieces,
      failed: result.failed?.length || 0
    });

    return res.status(response.status).json(result);
  } catch (error) {
    console.error("[cron:atomize] Error:", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
}
