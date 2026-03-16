/**
 * Automation: asset candidate approved.
 *
 * Triggers:
 *   1. Create a draft publication in publication_queue if one doesn't exist yet.
 *      - Links asset_candidate_id, episode_id, platform (inferred), copy base and notes.
 *      - Idempotent: skips if a publication already exists for this asset.
 *   2. Populate the publication notes with the asset body_text as caption base.
 *   3. Re-evaluate episode completion (hasApprovedAssets criterion updates).
 *
 * Called from useUpdateAssetCandidateStatus when status → "approved".
 */
import { supabase } from "@/integrations/supabase/client";
import { logAutomation } from "./logAutomation";
import { evaluateEpisodeCompletion } from "./evaluateEpisodeCompletion";

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
  return platform;
}

/**
 * Build a lightweight caption base from the asset body text.
 * Formatted as a ready-to-edit social media draft (not AI-generated,
 * just a structured starting point for the creator).
 */
function buildCaptionBase(title: string | null | undefined, bodyText: string | null | undefined): string {
  const parts: string[] = [];
  if (title) parts.push(title);
  if (bodyText && bodyText !== title) parts.push(bodyText);
  if (parts.length === 0) return "Auto-draft generado al aprobar asset";
  return parts.join("\n\n") + "\n\n#podcast [editar hashtags]";
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
    const captionBase = buildCaptionBase(title, bodyText);

    const { data: newPub, error } = await supabase
      .from("publication_queue")
      .insert({
        user_id: session.user.id,
        episode_id: episodeId,
        asset_candidate_id: assetCandidateId,
        platform: resolvedPlatform,
        status: "draft",
        // caption base stored in notes — ready for the creator to refine
        notes: captionBase,
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
      resultSummary: `Draft creado: ${newPub.id} (${resolvedPlatform}) · caption base incluido`,
      metadata: { publicationId: newPub.id, platform: resolvedPlatform, hasCaptionBase: !!bodyText },
    });

    // Re-evaluate completion — hasApprovedAssets and hasPublication criteria may now be true
    evaluateEpisodeCompletion(episodeId).catch(() => {});

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
