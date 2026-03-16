/**
 * Hooks for reading automation_logs_view.
 *
 * useAutomationLogs    — paginated list of runs for an episode (for AutomationLogPanel)
 * useLatestAutomationLog — latest log entry for a given event_type (for status badges)
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AutomationEventType } from "@/services/automation/logAutomation";

// Shape returned by automation_logs_view
export interface AutomationLogRow {
  id: string;
  run_id: string | null;
  user_id: string | null;
  event_type: string | null;
  entity_type: string | null;
  entity_id: string | null;
  episode_id: string | null;
  episode_title: string | null;
  episode_number: string | null;
  status: string | null;
  result_summary: string | null;
  skip_reason: string | null;
  error_message: string | null;
  duration_ms: number | null;
  metadata: Record<string, unknown> | null;
  created_at: string | null;
}

const PAGE_SIZE = 30;

/** Paginated automation logs for an episode, newest first. */
export function useAutomationLogs(episodeId?: string, page = 0) {
  return useQuery({
    queryKey: ["automation-logs", episodeId ?? "all", page],
    queryFn: async (): Promise<AutomationLogRow[]> => {
      let q = supabase
        .from("automation_logs_view")
        .select("*")
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (episodeId) q = q.eq("episode_id", episodeId);

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as AutomationLogRow[];
    },
    enabled: true,
    staleTime: 30_000,
  });
}

/** Latest log entry for a specific event_type within an episode. Used by status badges. */
export function useLatestAutomationLog(
  episodeId: string | undefined,
  eventType: AutomationEventType
) {
  return useQuery({
    queryKey: ["automation-log-latest", episodeId, eventType],
    queryFn: async (): Promise<AutomationLogRow | null> => {
      if (!episodeId) return null;
      const { data, error } = await supabase
        .from("automation_logs_view")
        .select("*")
        .eq("episode_id", episodeId)
        .eq("event_type", eventType)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as AutomationLogRow | null;
    },
    enabled: !!episodeId,
    staleTime: 15_000,
  });
}
