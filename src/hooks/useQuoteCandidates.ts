import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert } from "@/integrations/supabase/types";

export function useQuoteCandidates(audioTakeId?: string) {
  return useQuery({
    queryKey: ["quote-candidates", audioTakeId],
    enabled: Boolean(audioTakeId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quote_candidates")
        .select("*")
        .eq("audio_take_id", audioTakeId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });
}

export function useCreateQuoteCandidate(audioTakeId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: TablesInsert<"quote_candidates">) => {
      const { data, error } = await supabase
        .from("quote_candidates")
        .insert(payload)
        .select("*")
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quote-candidates", audioTakeId] });
    },
  });
}
