import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type SegmentActionType = "keep" | "remove" | "clip" | "quote";

export function useAudioSegmentSelections(audioTakeId?: string) {
  return useQuery({
    queryKey: ["audio-segment-selections", audioTakeId],
    enabled: Boolean(audioTakeId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audio_segment_selections")
        .select("*")
        .eq("audio_take_id", audioTakeId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });
}

export function useUpsertAudioSegmentSelection(audioTakeId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      transcriptSegmentId,
      actionType,
      label,
      notes,
      userId,
    }: {
      transcriptSegmentId: string;
      actionType: SegmentActionType;
      label?: string | null;
      notes?: string | null;
      userId: string;
    }) => {
      if (!audioTakeId) throw new Error("audioTakeId requerido");

      const payload = {
        user_id: userId,
        audio_take_id: audioTakeId,
        transcript_segment_id: transcriptSegmentId,
        action_type: actionType,
        label: label ?? null,
        notes: notes ?? null,
      };

      const { data, error } = await supabase
        .from("audio_segment_selections")
        .upsert(payload, {
          onConflict: "audio_take_id,transcript_segment_id,action_type",
        })
        .select("*")
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["audio-segment-selections", audioTakeId] });
    },
  });
}

export function useDeleteAudioSegmentSelection(audioTakeId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (selectionId: string) => {
      const { error } = await supabase
        .from("audio_segment_selections")
        .delete()
        .eq("id", selectionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["audio-segment-selections", audioTakeId] });
    },
  });
}
