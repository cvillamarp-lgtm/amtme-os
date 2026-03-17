import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

/** Fetch export packages, optionally scoped to a single episode. */
export function useExportPackages(episodeId?: string) {
  return useQuery({
    queryKey: ["export-packages", episodeId ?? "all"],
    queryFn: async () => {
      let q = supabase
        .from("export_packages")
        .select("*")
        .order("created_at", { ascending: false });
      if (episodeId) q = q.eq("episode_id", episodeId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as Tables<"export_packages">[];
    },
  });
}

/** Fetch publication queue entries, optionally scoped to a single episode. */
export function usePublicationQueue(episodeId?: string) {
  return useQuery({
    queryKey: ["publication-queue", episodeId ?? "all"],
    queryFn: async () => {
      let q = supabase
        .from("publication_queue")
        .select("*")
        .order("scheduled_at", { ascending: true });
      if (episodeId) q = q.eq("episode_id", episodeId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as Tables<"publication_queue">[];
    },
  });
}

/** Create a new export package and refresh relevant caches. */
export function useCreateExportPackage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: TablesInsert<"export_packages">) => {
      const { data, error } = await supabase
        .from("export_packages")
        .insert(payload)
        .select("*")
        .single();
      if (error) throw error;
      return data as Tables<"export_packages">;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["export-packages"] });
      if (data.episode_id) {
        qc.invalidateQueries({ queryKey: ["episode", data.episode_id] });
      }
    },
  });
}

/** Add an entry to the publication queue and refresh relevant caches. */
export function useAddToPublicationQueue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: TablesInsert<"publication_queue">) => {
      const { data, error } = await supabase
        .from("publication_queue")
        .insert(payload)
        .select("*")
        .single();
      if (error) throw error;
      return data as Tables<"publication_queue">;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["publication-queue"] });
      if (data.episode_id) {
        qc.invalidateQueries({ queryKey: ["episode", data.episode_id] });
      }
    },
  });
}