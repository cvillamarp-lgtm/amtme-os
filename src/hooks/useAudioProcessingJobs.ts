import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useAudioProcessingJobs(audioTakeId?: string) {
  return useQuery({
    queryKey: ["audio-processing-jobs", audioTakeId],
    enabled: Boolean(audioTakeId),
    refetchInterval: 3000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audio_processing_jobs" as any)
        .select("*")
        .eq("audio_take_id", audioTakeId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });
}

export function useQueueAudioMasterJob() {
  return useMutation({
    mutationFn: async ({
      audioTakeId,
      preset,
    }: {
      audioTakeId: string;
      preset: "voice_solo" | "voice_music" | "interview";
    }) => {
      const { data, error } = await supabase.functions.invoke("queue-audio-master", {
        body: {
          audioTakeId,
          preset,
        },
      });

      if (error) throw error;
      return data;
    },
  });
}
