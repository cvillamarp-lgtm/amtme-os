import { useMutation } from "@tanstack/react-query";
import { invokeEdgeFunction } from "@/services/functions/invokeEdgeFunction";

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
      return invokeEdgeFunction("queue-audio-clip-export", {
        audioTakeId,
        startSeconds,
        endSeconds,
        label,
      });
    },
  });
}
