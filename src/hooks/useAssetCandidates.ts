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
      const { error } = await supabase
        .from("asset_candidates")
        .insert(items);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["asset-candidates", audioTakeId] });
    },
  });
}

export function useUpdateAssetCandidateStatus(audioTakeId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("asset_candidates")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["asset-candidates", audioTakeId] });
      qc.invalidateQueries({ queryKey: ["asset-candidates-episode"] });
    },
  });
}
