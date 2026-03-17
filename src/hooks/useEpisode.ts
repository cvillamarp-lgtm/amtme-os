import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// ── useEpisodes: fetch all episodes list ─────────────────────────────────────
export function useEpisodes() {
  return useQuery({
    queryKey: ["episodes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("episodes")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 30_000,
  });
}

// ── useEpisode: fetch a single episode with assets & tasks ───────────────────
export function useEpisode(id: string | undefined) {
  const queryClient = useQueryClient();

  const { data: episode, isLoading } = useQuery({
    queryKey: ["episode", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("episodes")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
    staleTime: 30_000,
  });

  const { data: assets = [] } = useQuery({
    queryKey: ["episode-assets", id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase
        .from("content_assets")
        .select("*")
        .eq("episode_id", id)
        .order("created_at", { ascending: false });
      if (error) {
        console.error("Error fetching episode assets:", error);
        return [];
      }
      return data ?? [];
    },
    enabled: !!id,
    staleTime: 30_000,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["episode-tasks", id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("episode_id", id)
        .order("created_at", { ascending: false });
      if (error) {
        console.error("Error fetching episode tasks:", error);
        return [];
      }
      return data ?? [];
    },
    enabled: !!id,
    staleTime: 30_000,
  });

  const updateEpisode = useMutation({
    mutationFn: async (updates: Record<string, unknown>) => {
      if (!id) throw new Error("No episode id");
      const { error } = await supabase
        .from("episodes")
        .update(updates as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["episode", id] });
      queryClient.invalidateQueries({ queryKey: ["episodes"] });
    },
    onError: (error) => {
      console.error("Error updating episode:", error);
    },
  });

  return { episode, isLoading, assets, tasks, updateEpisode };
}