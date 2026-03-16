import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert } from "@/integrations/supabase/types";

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
 * When status → "approved": the SQL trigger trg_asset_approved fires automatically,
 * calling automation-asset-publication (creates publication draft) from backend.
 * Frontend only applies the DB update and refreshes cache.
 */
export function useUpdateAssetCandidateStatus(audioTakeId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data: candidate } = await supabase
        .from("asset_candidates")
        .select("episode_id")
        .eq("id", id)
        .single();

      const { error } = await supabase
        .from("asset_candidates")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;

      // Delayed refresh picks up publication draft created by backend trigger (~1-2s).
      if (status === "approved" && candidate?.episode_id) {
        const episodeId = candidate.episode_id;
        setTimeout(() => {
          qc.invalidateQueries({ queryKey: ["publication-queue"] });
          qc.invalidateQueries({ queryKey: ["op-state-quotes", episodeId] });
          qc.invalidateQueries({ queryKey: ["episode", episodeId] });
        }, 2000);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["asset-candidates", audioTakeId] });
      qc.invalidateQueries({ queryKey: ["asset-candidates-episode"] });
    },
  });
}
