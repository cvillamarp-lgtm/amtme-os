import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const cors = { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" };
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  const { episodeId } = await req.json();
  if (!episodeId) return new Response(JSON.stringify({ error: "episodeId required" }), { status: 400, headers: cors });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Auto-detect user_id from existing content_assets rows
  const { data: existing } = await supabase.from("content_assets")
    .select("user_id").eq("episode_id", episodeId).limit(1).single();
  const userId = existing?.user_id;
  if (!userId) return new Response(JSON.stringify({ error: "No rows found for this episode — extract content first" }), { status: 404, headers: cors });

  const base = `${Deno.env.get("SUPABASE_URL")}/storage/v1/object/public/generated-images/episodes/${episodeId}/piece_`;
  const rows = [];
  for (let pid = 1; pid <= 15; pid++) {
    rows.push({
      user_id: userId,
      episode_id: episodeId,
      piece_id: pid,
      piece_name: `Pieza ${pid}`,
      image_url: `${base}${pid}.png`,
      status: "generated",
    });
  }

  const { error } = await supabase.from("content_assets")
    .upsert(rows, { onConflict: "user_id,piece_id,episode_id" });

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: cors });
  return new Response(JSON.stringify({ updated: rows.length, userId }), { headers: cors });
});
