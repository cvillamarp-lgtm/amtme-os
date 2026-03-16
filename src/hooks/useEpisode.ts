import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { TablesUpdate } from "@/integrations/supabase/types";
import type { ChangeOrigin } from "./useChangelog";
import { evaluateEpisodeCompletion } from "@/services/automation/evaluateEpisodeCompletion";

/**
 * Hook to fetch a single episode by ID with all its related data.
 * Single source of truth for Episode Workspace.
 * All updates are logged to change_history automatically.
 */
export function useEpisode(id: string | undefined) {
  const queryClient = useQueryClient();

  const episode = useQuery({
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
  });

  const assets = useQuery({
    queryKey: ["episode-assets", id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase
        .from("content_assets")
        .select("*")
        .eq("episode_id", id)
        .order("piece_id", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const tasks = useQuery({
    queryKey: ["episode-tasks", id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("episode_id", id)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const updateEpisode = useMutation({
    mutationFn: async ({
      updates,
      origin = "manual",
    }: {
      updates: TablesUpdate<"episodes">;
      origin?: ChangeOrigin;
    }) => {
      if (!id) throw new Error("No episode ID");

      // 1. Apply the update
      const { error } = await supabase
        .from("episodes")
        .update(updates)
        .eq("id", id);
      if (error) throw error;

      // 2. Log each changed field to change_history (fire-and-forget)
      const current = episode.data as Record<string, unknown> | null | undefined;
      if (current && id) {
        const entries: Array<{
          user_id: string;
          table_name: string;
          record_id: string;
          field_name: string;
          old_value: string | null;
          new_value: string | null;
          change_origin: string;
        }> = [];

        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id;
        if (userId) {
          for (const [field, newVal] of Object.entries(updates as Record<string, unknown>)) {
            const oldStr = current[field] == null ? null : String(current[field]);
            const newStr = newVal == null ? null : String(newVal);
            if (oldStr !== newStr) {
              entries.push({
                user_id: userId,
                table_name: "episodes",
                record_id: id,
                field_name: field,
                old_value: oldStr,
                new_value: newStr,
                change_origin: origin,
              });
            }
          }
          if (entries.length > 0) {
            supabase.from("change_history").insert(entries).then(() => {});
          }
        }
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["episode", id] });
      queryClient.invalidateQueries({ queryKey: ["episodes"] });

      // Fire-and-forget episode completion evaluation after every content update.
      // Skip if the update itself only touched derived state columns to avoid loops.
      if (id) {
        const updatedKeys = Object.keys(variables.updates as Record<string, unknown>);
        const isDerivedOnlyUpdate = updatedKeys.every((k) =>
          ["estado_produccion", "estado_publicacion", "health_score", "nivel_completitud", "script_status"].includes(k)
        );
        if (!isDerivedOnlyUpdate) {
          evaluateEpisodeCompletion(id).then(() => {
            queryClient.invalidateQueries({ queryKey: ["episode", id] });
          });
        }
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  /**
   * Convenience wrapper — same API as before (accepts plain updates object).
   * origin defaults to "manual".
   */
  const updateEpisodeSimple = {
    mutateAsync: (updates: TablesUpdate<"episodes">, origin: ChangeOrigin = "manual") =>
      updateEpisode.mutateAsync({ updates, origin }),
    mutate: (updates: TablesUpdate<"episodes">, origin: ChangeOrigin = "manual") =>
      updateEpisode.mutate({ updates, origin }),
    isPending: updateEpisode.isPending,
    isError: updateEpisode.isError,
    error: updateEpisode.error,
  };

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["episode", id] });
    queryClient.invalidateQueries({ queryKey: ["episode-assets", id] });
    queryClient.invalidateQueries({ queryKey: ["episode-tasks", id] });
  };

  return {
    episode: episode.data,
    isLoading: episode.isLoading,
    assets: assets.data || [],
    tasks: tasks.data || [],
    updateEpisode: updateEpisodeSimple,
    invalidate,
  };
}

/**
 * Hook to fetch all episodes for listing.
 */
export function useEpisodes() {
  return useQuery({
    queryKey: ["episodes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("episodes")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}
