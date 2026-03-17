import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type Episode = Tables<"episodes">;
type AssetCandidate = Tables<"asset_candidates">;
type Task = Tables<"tasks">;

// ── useEpisodes ───────────────────────────────────────────────────────────────

export function useEpisodes() {
  return useQuery({
    queryKey: ["episodes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("episodes")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Episode[];
    },
    staleTime: 1000 * 60 * 2, // 2 min
  });
}

// ── useEpisode ────────────────────────────────────────────────────────────────

export function useEpisode(id: string | undefined) {
  const queryClient = useQueryClient();

  const episodeQuery = useQuery({
    queryKey: ["episode", id],
    enabled: !!id,
    staleTime: 1000 * 60 * 2, // 2 min
    queryFn: async () => {
      const { data, error } = await supabase
        .from("episodes")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data as Episode;
    },
  });

  const assetsQuery = useQuery({
    queryKey: ["episode-assets", id],
    enabled: !!id,
    staleTime: 1000 * 60 * 2,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("asset_candidates")
        .select("*")
        .eq("episode_id", id!);
      if (error) throw error;
      return (data ?? []) as AssetCandidate[];
    },
  });

  const tasksQuery = useQuery({
    queryKey: ["episode-tasks", id],
    enabled: !!id,
    staleTime: 1000 * 60 * 2,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("category", id!);
      if (error) throw error;
      return (data ?? []) as Task[];
    },
  });

  const updateEpisode = useMutation({
    mutationFn: async (updates: Partial<Episode>) => {
      if (!id) throw new Error("No episode id");
      const { data, error } = await supabase
        .from("episodes")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as Episode;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(["episode", id], updated);
      void queryClient.invalidateQueries({ queryKey: ["episodes"] });
    },
    onError: (error: Error) => {
      console.error("Error updating episode:", error);
    },
  });

  return {
    episode: episodeQuery.data ?? null,
    isLoading: episodeQuery.isLoading,
    isError: episodeQuery.isError,
    error: episodeQuery.error,
    assets: assetsQuery.data ?? [],
    tasks: tasksQuery.data ?? [],
    updateEpisode,
  };
}