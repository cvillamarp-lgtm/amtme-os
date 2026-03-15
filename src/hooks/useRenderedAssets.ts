import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useRenderedAssets(audioTakeId?: string) {
  return useQuery({
    queryKey: ["rendered-assets", audioTakeId],
    enabled: !!audioTakeId,
    queryFn: async () => {
      // Fetch rendered assets for candidates linked to this take
      const { data: candidates, error: ce } = await supabase
        .from("asset_candidates" as any)
        .select("id")
        .eq("audio_take_id", audioTakeId!);
      if (ce) throw ce;
      const ids = (candidates || []).map((c: any) => c.id);
      if (!ids.length) return [];
      const { data, error } = await supabase
        .from("rendered_assets" as any)
        .select("*")
        .in("asset_candidate_id", ids)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}

export function useCreateRenderedAsset(audioTakeId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data, error } = await supabase
        .from("rendered_assets" as any)
        .insert(payload)
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rendered-assets", audioTakeId] });
    },
  });
}
