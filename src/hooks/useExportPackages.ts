import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert } from "@/integrations/supabase/types";
import { onPublicationStateChanged } from "@/services/automation/onPublicationStateChanged";

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
 * When status → "scheduled" | "published": fires onPublicationStateChanged
 * automation to capture a metric snapshot. Fire-and-forget; never blocks the update.
 */
export function useUpdatePublicationQueueStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      // Fetch item data needed for automation before updating
      const { data: item } = await supabase
        .from("publication_queue")
        .select("episode_id, platform")
        .eq("id", id)
        .single();

      // Apply status update
      const { error } = await supabase
        .from("publication_queue")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;

      // Fire automation for triggering statuses (non-blocking)
      if (status === "scheduled" || status === "published") {
        onPublicationStateChanged({
          publicationQueueId: id,
          newStatus: status,
          episodeId: item?.episode_id,
          platform: item?.platform,
        }).then(() => {
          if (item?.episode_id) {
            qc.invalidateQueries({ queryKey: ["metric-snapshots", item.episode_id] });
          }
        });
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["publication-queue"] }),
  });
}
