import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { getCorsHeaders } from "../_shared/cors.ts";
import { errorResponse } from "../_shared/response.ts";

serve(async (req) => {
  const cors = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: cors });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const workerUrl = Deno.env.get("AUDIO_TRANSCRIPT_WORKER_URL");
    const workerSecret = Deno.env.get("AUDIO_TRANSCRIPT_WORKER_SECRET");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return errorResponse(cors, "UNAUTHORIZED", "Missing Authorization header", 401);
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: { user }, error: userError } = await userClient.auth.getUser();

    if (userError || !user) {
      return errorResponse(cors, "UNAUTHORIZED", "Unauthorized", 401);
    }

    const body = await req.json();
    const { audioTakeId, language = "es" } = body;

    if (!audioTakeId) {
      return errorResponse(cors, "VALIDATION_ERROR", "audioTakeId is required", 400);
    }

    const { data: take, error: takeError } = await adminClient
      .from("audio_takes")
      .select("*")
      .eq("id", audioTakeId)
      .eq("user_id", user.id)
      .single();

    if (takeError || !take) {
      return errorResponse(cors, "NOT_FOUND", "Audio take not found", 404);
    }

    const upsertPayload = {
      user_id: user.id,
      audio_take_id: take.id,
      status: "queued",
      language,
      provider: "worker",
      source: "server",
      error_message: null,
    };

    const { data: transcript, error: transcriptError } = await adminClient
      .from("audio_transcripts")
      .upsert(upsertPayload, { onConflict: "audio_take_id" })
      .select("*")
      .single();

    if (transcriptError || !transcript) {
      return errorResponse(cors, "INTERNAL_ERROR", transcriptError?.message || "Failed to queue transcript", 500);
    }

    if (workerUrl) {
      fetch(workerUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(workerSecret ? { Authorization: `Bearer ${workerSecret}` } : {}),
        },
        body: JSON.stringify({ transcriptId: transcript.id, audioTakeId: take.id, userId: user.id, language, supabaseUrl, serviceRoleKey }),
      }).catch(() => {});
    }

    return new Response(JSON.stringify({ ok: true, transcript }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (error) {
    return errorResponse(cors, "INTERNAL_ERROR", error instanceof Error ? error.message : "Unknown error", 500);
  }
});
