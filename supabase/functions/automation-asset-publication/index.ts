/**
 * Edge Function: automation-asset-publication
 *
 * Creates a draft publication_queue entry when an asset is approved.
 * Idempotent: skips if a publication already exists for this asset.
 *
 * Accepts:
 *   - User JWT (called from frontend)
 *   - Service Role Key (called from SQL trigger)
 *
 * Body: { asset_candidate_id, episode_id, platform?, body_text?, title?, run_id?, source? }
 * Returns: { ok, publicationId, skipped, runId }
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

function json(data: unknown, status: number, cors: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

function inferPlatform(platform?: string | null): string {
  if (!platform) return "instagram_feed";
  const lc = platform.toLowerCase();
  if (lc.includes("reel")) return "instagram_reel";
  if (lc.includes("story")) return "instagram_story";
  if (lc.includes("tiktok")) return "tiktok";
  if (lc.includes("youtube") || lc.includes("yt")) return "youtube";
  if (lc.includes("twitter")) return "twitter";
  if (lc.includes("linkedin")) return "linkedin";
  return platform;
}

function buildCaptionBase(title?: string | null, bodyText?: string | null): string {
  const parts: string[] = [];
  if (title) parts.push(title);
  if (bodyText && bodyText !== title) parts.push(bodyText);
  if (parts.length === 0) return "Auto-draft generado al aprobar asset";
  return parts.join("\n\n") + "\n\n#podcast [editar hashtags]";
}

serve(async (req: Request) => {
  const cors = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  try {
    const body = await req.json();
    const {
      asset_candidate_id,
      episode_id,
      platform,
      body_text,
      title,
      run_id: providedRunId,
      source = "frontend",
    } = body as {
      asset_candidate_id: string;
      episode_id: string;
      platform?: string;
      body_text?: string;
      title?: string;
      run_id?: string;
      source?: string;
    };

    if (!asset_candidate_id || !episode_id) {
      return json({ error: "asset_candidate_id and episode_id required" }, 400, cors);
    }

    // ── Auth resolution ────────────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization") ?? "";
    let userId: string;

    const isServiceRole = authHeader === `Bearer ${SERVICE_ROLE_KEY}`;
    if (isServiceRole) {
      const { data: ep } = await adminClient
        .from("episodes")
        .select("user_id")
        .eq("id", episode_id)
        .single();
      if (!ep?.user_id) return json({ error: "Episode not found" }, 404, cors);
      userId = ep.user_id;
    } else {
      const userClient = createClient(SUPABASE_URL, ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
      });
      const {
        data: { user },
      } = await userClient.auth.getUser();
      if (!user) return json({ error: "Unauthorized" }, 401, cors);
      userId = user.id;
    }

    const runId = providedRunId ?? crypto.randomUUID();
    const started = Date.now();

    // Log: started
    await adminClient.from("automation_logs").insert({
      user_id: userId,
      run_id: runId,
      event_type: "asset_approved",
      entity_type: "asset_candidate",
      entity_id: asset_candidate_id,
      episode_id,
      status: "started",
      metadata: { source, platform, hasBodyText: !!body_text },
    });

    // ── Idempotency check ──────────────────────────────────────────────────────
    const { data: existing } = await adminClient
      .from("publication_queue")
      .select("id")
      .eq("asset_candidate_id", asset_candidate_id)
      .maybeSingle();

    if (existing) {
      await adminClient.from("automation_logs").insert({
        user_id: userId,
        run_id: runId,
        event_type: "asset_approved",
        entity_type: "asset_candidate",
        entity_id: asset_candidate_id,
        episode_id,
        status: "skipped",
        skip_reason: "Draft publication already exists for this asset",
        duration_ms: Date.now() - started,
        metadata: { source, existingPublicationId: existing.id },
      });
      return json({ ok: true, publicationId: existing.id, skipped: true, runId }, 200, cors);
    }

    // ── Create draft publication ───────────────────────────────────────────────
    const resolvedPlatform = inferPlatform(platform);
    const captionBase = buildCaptionBase(title, body_text);

    const { data: newPub, error } = await adminClient
      .from("publication_queue")
      .insert({
        user_id: userId,
        episode_id,
        asset_candidate_id,
        platform: resolvedPlatform,
        status: "draft",
        notes: captionBase,
        checklist: [],
      })
      .select("id")
      .single();

    if (error) throw error;

    const durationMs = Date.now() - started;

    await adminClient.from("automation_logs").insert({
      user_id: userId,
      run_id: runId,
      event_type: "asset_approved",
      entity_type: "asset_candidate",
      entity_id: asset_candidate_id,
      episode_id,
      status: "success",
      result_summary: `Draft creado: ${newPub.id} (${resolvedPlatform}) · caption base incluido`,
      duration_ms: durationMs,
      metadata: { source, publicationId: newPub.id, platform: resolvedPlatform },
    });

    // Fire-and-forget episode evaluation
    fetch(`${SUPABASE_URL}/functions/v1/automation-episode-evaluate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ episode_id, source: "automation-asset-publication" }),
    }).catch(() => {});

    return json({ ok: true, publicationId: newPub.id, skipped: false, runId }, 200, cors);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return json({ ok: false, publicationId: null, skipped: false, error: message }, 500, cors);
  }
});
