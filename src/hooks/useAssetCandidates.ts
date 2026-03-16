import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert } from "@/integrations/supabase/types";
import { onAssetApproved } from "@/services/automation/onAssetApproved";

export function useAssetCandidates(audioTakeId?: string) {
  return useQuery({
    queryKey: ["asset-candidates", audioTakeId],
    enabled: !!audioTakeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("asset_candidates")
        .select("*")
        .eq("audio_take_id", audioTakeId!)
        .order("score", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}

export function useAssetCandidatesByEpisode(episodeId?: string) {
  return useQuery({
    queryKey: ["asset-candidates-episode", episodeId],
    enabled: !!episodeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("asset_candidates")
        .select("*")
        .eq("episode_id", episodeId!)
        .order("score", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}

export function useCreateAssetCandidates(audioTakeId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (items: TablesInsert<"asset_candidates">[]) => {
      const { error } = await supabase.from("asset_candidates").insert(items);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["asset-candidates", audioTakeId] });
    },
  });
}

/**
 * Updates asset candidate status.
 * When status → "approved": fires onAssetApproved automation (creates publication draft).
 * The automation is fire-and-forget; it never blocks the status update.
 */
export function useUpdateAssetCandidateStatus(audioTakeId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      // Fetch full candidate data before the update (needed for automation params)
      const { data: candidate } = await supabase
        .from("asset_candidates")
        .select("episode_id, platform, body_text, title")
        .eq("id", id)
        .single();

      // Apply status update
      const { error } = await supabase
        .from("asset_candidates")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;

      // Fire automation when asset is approved (non-blocking)
      if (status === "approved" && candidate?.episode_id) {
        onAssetApproved({
          assetCandidateId: id,
          episodeId: candidate.episode_id,
          platform: candidate.platform,
          bodyText: candidate.body_text,
          title: candidate.title,
        }).then(() => {
          // Refresh publication queue in UI after automation runs
          qc.invalidateQueries({ queryKey: ["publication-queue"] });
          qc.invalidateQueries({ queryKey: ["op-state-quotes", candidate.episode_id] });
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["asset-candidates", audioTakeId] });
      qc.invalidateQueries({ queryKey: ["asset-candidates-episode"] });
    },
  });
}
