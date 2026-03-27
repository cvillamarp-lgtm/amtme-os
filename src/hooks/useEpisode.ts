import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type Episode = Tables<"episodes">;

/** Fetch a single episode by id */
async function fetchEpisode(id: string): Promise<Episode | null> {
  const { data, error } = await supabase
    .from("episodes")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Fetch all episodes for the current user */
async function fetchEpisodes(): Promise<Episode[]> {
  const { data, error } = await supabase
    .from("episodes")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export function useEpisode(id?: string) {
  const queryClient = useQueryClient();

  const episodeQuery = useQuery({
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    queryKey: ["episode", id],
    enabled: !!id,
    staleTime: 3_000,
    queryFn: () => fetchEpisode(id!),
  });

  const assetsQuery = useQuery({
    queryKey: ["episode-assets", id],
    enabled: !!id,
    staleTime: 3_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("asset_candidates")
        .select("*")
        .eq("episode_id", id!);
      if (error) throw error;
      return data ?? [];
    },
  });

  const tasksQuery = useQuery({
    queryKey: ["episode-tasks", id],
    enabled: !!id,
    staleTime: 3_000,
    queryFn: async () => {
      const { data, error } = await supabase.from("tasks").select("*").eq("episode_id", id!);
      if (error) throw error;
      return data ?? [];
    },
  });

  const updateEpisode = useMutation({
    mutationFn: async (updates: Partial<Episode>) => {
      if (!id) throw new Error("Episode id required");
      const { error } = await supabase
        .from("episodes")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["episode", id] });
      queryClient.invalidateQueries({ queryKey: ["episodes"] });
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

export function useEpisodes() {
  return useQuery({
    queryKey: ["episodes"],
    staleTime: 3_000,
    queryFn: fetchEpisodes,
  });
}