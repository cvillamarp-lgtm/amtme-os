import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useSidebarCounts() {
  return useQuery({
    queryKey: ["sidebar-counts"],
    queryFn: async () => {
      const [tasks, assets] = await Promise.all([
        supabase.from("tasks").select("*", { count: "exact", head: true }).eq("status", "todo"),
        supabase.from("content_assets").select("*", { count: "exact", head: true }).in("status", ["generated", "pending"]),
      ]);
      return {
        pendingTasks: tasks.count || 0,
        pendingAssets: assets.count || 0,
      };
    },
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
}