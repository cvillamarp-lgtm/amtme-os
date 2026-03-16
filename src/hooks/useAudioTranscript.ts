import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useAudioTranscript(audioTakeId?: string) {
  return useQuery({
    queryKey: ["audio-transcript", audioTakeId],
    enabled: Boolean(audioTakeId),
    refetchInterval: 3000,
    queryFn: async () => {
      const { data: transcript, error: transcriptError } = await supabase
        .from("audio_transcripts")
        .select("*")
        .eq("audio_take_id", audioTakeId)
        .maybeSingle();

      if (transcriptError) throw transcriptError;

      if (!transcript) {
        return { transcript: null, segments: [] };
      }

      const { data: segments, error: segmentsError } = await supabase
        .from("audio_transcript_segments")
        .select("*")
        .eq("audio_take_id", audioTakeId)
        .order("segment_index", { ascending: true });

      if (segmentsError) throw segmentsError;

      return {
        transcript,
        segments: segments || [],
      };
    },
  });
}

export function useQueueAudioTranscript() {
  return useMutation({
    mutationFn: async ({
      audioTakeId,
      language = "es",
    }: {
      audioTakeId: string;
      language?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke("queue-audio-transcript", {
        body: { audioTakeId, language },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error as string);
      return data;
    },
  });
}
