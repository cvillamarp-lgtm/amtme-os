/**
 * Vercel Cron: Process atomization queue
 * Route: /api/cron/process-atomization-queue
 * Schedule: Hourly (0 * * * *)
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";

export const config = {
  maxDuration: 300, // 5 minutes
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Verify cron signature
  const authHeader = req.headers.authorization;
  const secret = process.env.VERCEL_CRON_SECRET;

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: "Missing Supabase credentials" });
  }

  let attempt = 0;
  const maxAttempts = 3;
  const timeout = 280000; // 4m 40s (leaving 20s buffer for Vercel 5m limit)

  async function executeWithTimeout(): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/process-atomization-queue`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${supabaseKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          batch_size: 10,
          max_retries: 3,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  while (attempt < maxAttempts) {
    try {
      const response = await executeWithTimeout();
      const result = await response.json();

      console.log("[cron:atomize] Result:", {
        processed: result.processed,
        created_pieces: result.created_pieces,
        failed: result.failed?.length || 0,
      });

      return res.status(response.status).json(result);
    } catch (error) {
      attempt++;
      const isTimeout = error instanceof Error && error.message.includes("abort");
      const errorMsg = error instanceof Error ? error.message : "Unknown error";

      console.error(`[cron:atomize] Attempt ${attempt}/${maxAttempts} failed:`, {
        error: errorMsg,
        isTimeout,
      });

      if (attempt >= maxAttempts) {
        return res.status(500).json({
          error: `Failed after ${maxAttempts} attempts: ${errorMsg}`,
          isTimeout,
        });
      }

      // Exponential backoff: 1s, 2s, 4s
      const delayMs = 1000 * Math.pow(2, attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return res.status(500).json({ error: "Exhausted retry attempts" });
}
