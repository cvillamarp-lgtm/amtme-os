/**
 * Automation: asset candidate approved.
 *
 * Triggers:
 *   - Create a draft publication in publication_queue if one doesn't exist yet.
 *   - Link asset_candidate_id, episode_id, platform (inferred), and copy/notes.
 *   - Idempotent: skips if a publication already exists for this asset.
 *
 * Called from useUpdateAssetCandidateStatus when status → "approved".
 */
import { supabase } from "@/integrations/supabase/client";
import { logAutomation } from "./logAutomation";

export interface OnAssetApprovedParams {
  assetCandidateId: string;
  episodeId: string;
  platform?: string | null;
  bodyText?: string | null;
  title?: string | null;
}

export interface OnAssetApprovedResult {
  ok: boolean;
  publicationId: string | null;
  skipped: boolean;
  error?: string;
}

function inferPlatformFromAsset(platform?: string | null): string {
  if (!platform) return "instagram_feed";
  const lc = platform.toLowerCase();
  if (lc.includes("reel")) return "instagram_reel";
  if (lc.includes("story")) return "instagram_story";
  if (lc.includes("tiktok")) return "tiktok";
  if (lc.includes("youtube") || lc.includes("yt")) return "youtube";
  if (lc.includes("twitter")) return "twitter";
  if (lc.includes("linkedin")) return "linkedin";
  return platform; // trust the value if already a valid slug
}

export async function onAssetApproved({
  assetCandidateId,
  episodeId,
  platform,
  bodyText,
  title,
}: OnAssetApprovedParams): Promise<OnAssetApprovedResult> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return { ok: false, publicationId: null, skipped: true, error: "No session" };
  }

  try {
    // Idempotency: check if a publication_queue entry already exists for this asset
    const { data: existing } = await supabase
      .from("publication_queue")
      .select("id")
      .eq("asset_candidate_id", assetCandidateId)
      .maybeSingle();

    if (existing) {
      await logAutomation({
        eventType: "asset_approved",
        entityType: "asset_candidate",
        entityId: assetCandidateId,
        episodeId,
        status: "skipped",
        resultSummary: "Draft publication already exists — skipped",
        metadata: { existingPublicationId: existing.id },
      });
      return { ok: true, publicationId: existing.id, skipped: true };
    }

    const resolvedPlatform = inferPlatformFromAsset(platform);

    const { data: newPub, error } = await supabase
      .from("publication_queue")
      .insert({
        user_id: session.user.id,
        episode_id: episodeId,
        asset_candidate_id: assetCandidateId,
        platform: resolvedPlatform,
        status: "draft",
        notes: title ? `Auto-draft: ${title}` : "Auto-draft generado al aprobar asset",
        checklist: [],
      })
      .select("id")
      .single();

    if (error) throw error;

    await logAutomation({
      eventType: "asset_approved",
      entityType: "asset_candidate",
      entityId: assetCandidateId,
      episodeId,
      status: "ok",
      resultSummary: `Draft de publicación creado: ${newPub.id} (${resolvedPlatform})`,
      metadata: { publicationId: newPub.id, platform: resolvedPlatform },
    });

    return { ok: true, publicationId: newPub.id, skipped: false };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";

    await logAutomation({
      eventType: "asset_approved",
      entityType: "asset_candidate",
      entityId: assetCandidateId,
      episodeId,
      status: "error",
      errorMessage: message,
      metadata: {},
    });

    return { ok: false, publicationId: null, skipped: false, error: message };
  }
}
