import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert } from "@/integrations/supabase/types";

export function useExportPackages(episodeId?: string) {
  return useQuery({
    queryKey: ["export-packages", episodeId ?? "all"],
    queryFn: async () => {
      let q = supabase
        .from("export_packages")
        .select("*, export_package_items(*)")
        .order("created_at", { ascending: false });
      if (episodeId) q = q.eq("episode_id", episodeId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });
}

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
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["export-packages"] }),
  });
}

export function useUpdateExportPackageStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("export_packages")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["export-packages"] }),
  });
}

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
      return data || [];
    },
  });
}

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
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["publication-queue"] }),
  });
}

/**
 * Updates publication queue item status.
 * Automation (metric snapshot + episode evaluation) is triggered automatically
 * by the backend SQL trigger trg_publication_status_changed.
 * Delayed cache invalidation picks up state changes written by the trigger.
 */
export function useUpdatePublicationQueueStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data: item } = await supabase
        .from("publication_queue")
        .select("episode_id")
        .eq("id", id)
        .single();

      const { error } = await supabase
        .from("publication_queue")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;

      // Delayed cache refresh to pick up trigger-written state changes
      if (item?.episode_id) {
        const episodeId = item.episode_id;
        setTimeout(() => {
          qc.invalidateQueries({ queryKey: ["episode", episodeId] });
          qc.invalidateQueries({ queryKey: ["metric-snapshots", episodeId] });
        }, 2000);
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["publication-queue"] }),
  });
}
