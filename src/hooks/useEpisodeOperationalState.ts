import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAssetCandidatesByEpisode } from "@/hooks/useAssetCandidates";
import { useExportPackages, usePublicationQueue } from "@/hooks/useExportPackages";

export function useEpisodeOperationalState(episodeId?: string) {
  const takes = useQuery({
    queryKey: ["op-state-takes", episodeId],
    enabled: !!episodeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audio_takes")
        .select("id, mastering_status")
        .eq("episode_id", episodeId!);
      if (error) throw error;
      return data || [];
    },
  });

  const quotes = useQuery({
    queryKey: ["op-state-quotes", episodeId],
    enabled: !!episodeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quote_candidates")
        .select("id, status")
        .eq("episode_id", episodeId!);
      if (error) throw error;
      return data || [];
    },
  });

  const assetCandidates = useAssetCandidatesByEpisode(episodeId);
  const exportPackages = useExportPackages(episodeId);
  const publicationQueue = usePublicationQueue(episodeId);

  return {
    takes,
    quotes,
    assetCandidates,
    exportPackages,
    publicationQueue,
  };
}

export type EpisodeOperationalState = ReturnType<typeof useEpisodeOperationalState>;
