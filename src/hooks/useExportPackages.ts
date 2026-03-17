import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type ExportPackage = Tables<"export_packages">;
type PublicationQueue = Tables<"publication_queue">;

// ── useExportPackages ─────────────────────────────────────────────────────────

export function useExportPackages(episodeId?: string) {
  return useQuery({
    queryKey: ["export-packages", episodeId],
    enabled: !!episodeId,
    staleTime: 1000 * 60 * 2,
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

// ── useCreateExportPackage ────────────────────────────────────────────────────

export function useCreateExportPackage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      user_id: string;
      title: string;
      episode_id?: string | null;
      status?: string;
      notes?: string | null;
    }) => {
      const { data, error } = await supabase
        .from("export_packages")
        .insert({
          user_id: input.user_id,
          title: input.title,
          episode_id: input.episode_id ?? null,
          status: input.status ?? "draft",
          notes: input.notes ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as ExportPackage;
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ["export-packages", data.episode_id] });
      void queryClient.invalidateQueries({ queryKey: ["export-packages"] });
    },
    onError: (err: Error) => {
      console.error("Error creating export package:", err);
    },
  });
}

// ── useAddToPublicationQueue ──────────────────────────────────────────────────

export function useAddToPublicationQueue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      user_id: string;
      platform: string;
      export_package_id?: string | null;
      episode_id?: string | null;
      status?: string;
      asset_candidate_id?: string | null;
      checklist?: Record<string, unknown> | null;
      notes?: string | null;
      scheduled_at?: string | null;
    }) => {
      const { data, error } = await supabase
        .from("publication_queue")
        .insert({
          user_id: input.user_id,
          platform: input.platform,
          export_package_id: input.export_package_id ?? null,
          episode_id: input.episode_id ?? null,
          status: input.status ?? "scheduled",
          asset_candidate_id: input.asset_candidate_id ?? null,
          checklist: input.checklist ?? null,
          notes: input.notes ?? null,
          scheduled_at: input.scheduled_at ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as PublicationQueue;
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ["publication-queue", data.episode_id] });
      void queryClient.invalidateQueries({ queryKey: ["publication-queue"] });
    },
    onError: (err: Error) => {
      console.error("Error adding to publication queue:", err);
    },
  });
}

// ── usePublicationQueue ───────────────────────────────────────────────────────

export function usePublicationQueue(episodeId?: string) {
  return useQuery({
    queryKey: ["publication-queue", episodeId],
    enabled: !!episodeId,
    staleTime: 1000 * 60 * 2,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("publication_queue")
        .select("*")
        .eq("episode_id", episodeId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as PublicationQueue[];
    },
  });
}