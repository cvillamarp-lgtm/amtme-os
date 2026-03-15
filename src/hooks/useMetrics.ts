import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useMetricSnapshots(episodeId?: string) {
  return useQuery({
    queryKey: ["metric-snapshots", episodeId ?? "all"],
    queryFn: async () => {
      let q = (supabase as any)
        .from("metric_snapshots")
        .select("*")
        .order("snapshot_date", { ascending: false });
      if (episodeId) q = q.eq("episode_id", episodeId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });
}

export function useCreateMetricSnapshot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data, error } = await supabase
        .from("metric_snapshots" as any)
        .insert(payload)
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["metric-snapshots"] }),
  });
}

export function useLearningInsights(episodeId?: string) {
  return useQuery({
    queryKey: ["learning-insights", episodeId ?? "all"],
    queryFn: async () => {
      let q = (supabase as any)
        .from("learning_insights")
        .select("*")
        .order("created_at", { ascending: false });
      if (episodeId) q = q.eq("episode_id", episodeId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });
}

export function useCreateLearningInsight() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data, error } = await supabase
        .from("learning_insights" as any)
        .insert(payload)
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["learning-insights"] }),
  });
}
