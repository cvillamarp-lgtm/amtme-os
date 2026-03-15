import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const workerUrl = Deno.env.get("AUDIO_TRANSCRIPT_WORKER_URL");
    const workerSecret = Deno.env.get("AUDIO_TRANSCRIPT_WORKER_SECRET");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: { user }, error: userError } = await userClient.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { audioTakeId, language = "es" } = body;

    if (!audioTakeId) {
      return new Response(JSON.stringify({ error: "audioTakeId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: take, error: takeError } = await adminClient
      .from("audio_takes")
      .select("*")
      .eq("id", audioTakeId)
      .eq("user_id", user.id)
      .single();

    if (takeError || !take) {
      return new Response(JSON.stringify({ error: "Audio take not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
      return new Response(JSON.stringify({ error: transcriptError?.message || "Failed to queue transcript" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
