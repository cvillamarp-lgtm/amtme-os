import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useQueueAudioClipExport() {
  return useMutation({
    mutationFn: async ({
      audioTakeId,
      startSeconds,
      endSeconds,
      label,
    }: {
      audioTakeId: string;
      startSeconds: number;
      endSeconds: number;
      label: string;
    }) => {
      const { data, error } = await supabase.functions.invoke("queue-audio-clip-export", {
        body: {
          audioTakeId,
          startSeconds,
          endSeconds,
          label,
        },
      });

      if (error) throw error;
      return data;
    },
  });
}
