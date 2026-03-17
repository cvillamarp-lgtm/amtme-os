import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type ExportPackage = Tables<"export_packages">;
type PublicationQueueItem = Tables<"publication_queue">;

/** Fetch export packages for a given episode. */
export function useExportPackages(episodeId?: string) {
  return useQuery({
    queryKey: ["export-packages", episodeId],
    enabled: !!episodeId,
    staleTime: 3_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("export_packages")
        .select("*")
        .eq("episode_id", episodeId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ExportPackage[];
    },
  });
}

/** Fetch publication queue items for a given episode. */
export function usePublicationQueue(episodeId?: string) {
  return useQuery({
    queryKey: ["publication-queue", episodeId],
    enabled: !!episodeId,
    staleTime: 3_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("publication_queue")
        .select("*")
        .eq("episode_id", episodeId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as PublicationQueueItem[];
    },
  });
}

/** Add an item to the publication queue. */
export function useAddToPublicationQueue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      payload: Omit<Tables<"publication_queue">["Insert"], "id" | "created_at" | "updated_at">
    ) => {
      const { data, error } = await supabase
        .from("publication_queue")
        .insert(payload as any)
        .select()
        .single();
      if (error) throw error;
      return data as PublicationQueueItem;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["publication-queue", data.episode_id ?? undefined],
      });
    },
  });
}

/** Create a new export package for an episode. */
export function useCreateExportPackage(episodeId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { title: string; notes?: string }) => {
      if (!episodeId) throw new Error("episodeId required");
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("export_packages")
        .insert({ ...payload, episode_id: episodeId, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data as ExportPackage;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["export-packages", episodeId] });
    },
  });
}