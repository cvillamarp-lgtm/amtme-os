import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// ── useExportPackages ─────────────────────────────────────────────────────────

export function useExportPackages(episodeId?: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["export-packages", episodeId],
    enabled: !!episodeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("export_packages")
        .select("*")
        .eq("episode_id", episodeId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 30_000,
  });

  const createPackage = useMutation({
    mutationFn: async (params: { episodeId: string; status?: string }) => {
      const validStatuses = ["pending", "building", "ready", "delivered", "failed"] as const;
      const status = validStatuses.includes(params.status as typeof validStatuses[number])
        ? params.status
        : "pending";

      const { data, error } = await supabase
        .from("export_packages")
        .insert({ episode_id: params.episodeId, status })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["export-packages", vars.episodeId] });
      queryClient.invalidateQueries({ queryKey: ["episode", vars.episodeId] });
    },
    onError: (err) => {
      console.error("Error creating export package:", err);
    },
  });

  return { ...query, createPackage };
}

// ── useCreateExportPackage ────────────────────────────────────────────────────

export function useCreateExportPackage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      user_id: string;
      episode_id?: string | null;
      title?: string | null;
      status?: string | null;
      [key: string]: unknown;
    }) => {
      const { data, error } = await supabase
        .from("export_packages")
        .insert(params as any)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (_data, vars) => {
      if (vars.episode_id) {
        queryClient.invalidateQueries({ queryKey: ["export-packages", vars.episode_id] });
        queryClient.invalidateQueries({ queryKey: ["episode", vars.episode_id] });
      }
      queryClient.invalidateQueries({ queryKey: ["export-packages"] });
    },
    onError: (err) => {
      console.error("Error creating export package:", err);
    },
  });
}

// ── usePublicationQueue ───────────────────────────────────────────────────────

export function usePublicationQueue(episodeId?: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["publication-queue", episodeId],
    enabled: !!episodeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("publication_queue")
        .select("*")
        .eq("episode_id", episodeId!)
        .order("scheduled_for", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 30_000,
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("publication_queue")
        .update({ status })
        .eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["publication-queue", episodeId] });
    },
    onError: (err) => {
      console.error("Error updating publication queue status:", err);
    },
  });

  return { ...query, updateStatus };
}

// ── useAddToPublicationQueue ──────────────────────────────────────────────────

export function useAddToPublicationQueue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      user_id: string;
      export_package_id?: string | null;
      episode_id?: string | null;
      platform?: string | null;
      status?: string | null;
      checklist?: unknown;
      [key: string]: unknown;
    }) => {
      const { data, error } = await supabase
        .from("publication_queue")
        .insert(params as any)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (_data, vars) => {
      if (vars.episode_id) {
        queryClient.invalidateQueries({ queryKey: ["publication-queue", vars.episode_id] });
      }
      queryClient.invalidateQueries({ queryKey: ["publication-queue"] });
    },
    onError: (err) => {
      console.error("Error adding to publication queue:", err);
    },
  });
}

export default useExportPackages;

