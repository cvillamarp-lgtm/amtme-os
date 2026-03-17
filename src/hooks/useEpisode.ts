import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesUpdate } from "@/integrations/supabase/types";

/** Fetches all episodes, ordered by creation date descending. */
export function useEpisodes() {
  return useQuery({
    queryKey: ["episodes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("episodes")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as Tables<"episodes">[];
    },
  });
}

/**
 * Fetches a single episode by ID along with its associated content assets and
 * tasks.  Returns an `updateEpisode` mutation that writes back to the `episodes`
 * table and keeps the query cache consistent.
 */
export function useEpisode(id?: string) {
  const qc = useQueryClient();

  const episodeQuery = useQuery({
    queryKey: ["episode", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("episodes")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data as Tables<"episodes">;
    },
  });

  // Assets produced by the Content Factory and saved to content_assets
  const assetsQuery = useQuery({
    queryKey: ["episode-assets", id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await supabase
        .from("content_assets" as "generated_assets") // table exists but is not yet in the generated types
        .select("id, piece_name, piece_id, image_url, caption, hashtags, status")
        .eq("episode_id", id!)
        .order("piece_id", { ascending: true });
      return (data || []) as Array<{
        id: string;
        piece_name: string;
        piece_id: number;
        image_url: string | null;
        caption: string | null;
        hashtags: string | null;
        status: string | null;
      }>;
    },
  });

  const tasksQuery = useQuery({
    queryKey: ["tasks"],
    queryFn: async () => {
      const { data } = await supabase
        .from("tasks")
        .select("*")
        .order("created_at", { ascending: false });
      return (data || []) as Tables<"tasks">[];
    },
  });

  /** Update episode in DB and refresh the shared episode cache. */
  const updateEpisode = useMutation({
    mutationFn: async (updates: TablesUpdate<"episodes">) => {
      if (!id) throw new Error("No episode ID");
      const { data, error } = await supabase
        .from("episodes")
        .update(updates)
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw error;
      return data as Tables<"episodes">;
    },
    onSuccess: (data) => {
      // Update the per-episode cache so all consumers see the new values immediately
      qc.setQueryData(["episode", id], data);
      // Invalidate the list so the episodes page reflects changes (title, status, etc.)
      qc.invalidateQueries({ queryKey: ["episodes"] });
    },
  });

  return {
    episode: episodeQuery.data,
    isLoading: episodeQuery.isLoading,
    error: episodeQuery.error,
    assets: assetsQuery.data || [],
    tasks: tasksQuery.data || [],
    updateEpisode,
  };
}