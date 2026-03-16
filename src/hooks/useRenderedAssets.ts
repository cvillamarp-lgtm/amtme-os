import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert } from "@/integrations/supabase/types";

export function useRenderedAssets(audioTakeId?: string) {
  return useQuery({
    queryKey: ["rendered-assets", audioTakeId],
    enabled: !!audioTakeId,
    queryFn: async () => {
      // Fetch rendered assets for candidates linked to this take
      const { data: candidates, error: ce } = await supabase
        .from("asset_candidates")
        .select("id")
        .eq("audio_take_id", audioTakeId!);
      if (ce) throw ce;
      const ids = (candidates || []).map((c: any) => c.id);
      if (!ids.length) return [];
      const { data, error } = await supabase
        .from("rendered_assets")
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
    mutationFn: async (payload: TablesInsert<"rendered_assets">) => {
      const { data, error } = await supabase
        .from("rendered_assets")
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
