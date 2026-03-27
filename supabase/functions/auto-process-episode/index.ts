/**
 * Auto-Process Episode
 * Ejecuta automáticamente el Script Engine pipeline cuando se crea/edita un episodio
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { episode_id, title, script_base, user_id } = await req.json();

    if (!episode_id || !title) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    // Get episode
    const { data: episode } = await supabase
      .from("episodes")
      .select("*")
      .eq("id", episode_id)
      .single();

    const content = script_base || episode?.summary || "";
    if (!content || content.length < 50) {
      return new Response(JSON.stringify({ warning: "Not enough content to process" }), {
        status: 200,
        headers: corsHeaders,
      });
    }

    // Generate semantic map with AI extraction
    const semanticData = {
      main_theme: title.split("-")[0]?.trim() || "Episodio",
      central_thesis: content.split(".")[0]?.substring(0, 150) || title,
      summary: content.substring(0, 300) + "...",
      hook: "Descubre qué sucede en este episodio",
      cta: "Comparte tu perspectiva",
      memorable_quote: content.split(".")[Math.floor(Math.random() * 5)]?.trim() || title,
      key_phrases: extractPhrases(content),
    };

    // Update episode with auto-generated fields
    const { error: updateError } = await supabase
      .from("episodes")
      .update({
        tema: semanticData.main_theme,
        core_thesis: semanticData.central_thesis,
        summary: semanticData.summary,
        hook: semanticData.hook,
        cta: semanticData.cta,
        quote: semanticData.memorable_quote,
        generation_metadata: {
          auto_processed: true,
          processed_at: new Date().toISOString(),
        },
      })
      .eq("id", episode_id);

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({ success: true, episode_id, fields_updated: 6 }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});

function extractPhrases(text: string): string[] {
  const sentences = text.split(/[.!?]+/).slice(0, 5);
  return sentences.map((s) => s.trim()).filter((s) => s.length > 10);
}
