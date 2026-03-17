import type { SupabaseClient } from "@supabase/supabase-js";
import type { RecoveryIncident } from "./types";

export async function escalateIncidentToSupabase(
  supabase: SupabaseClient,
  incident: RecoveryIncident
) {
  const payload = {
    incident_id: incident.id,
    kind: incident.kind,
    severity: incident.severity,
    status: incident.status,
    title: incident.title,
    message: incident.message,
    error_name: incident.errorName ?? null,
    stack: incident.stack ?? null,
    route_pathname: incident.route.pathname,
    route_search: incident.route.search ?? null,
    build_id: incident.context.buildId ?? null,
    user_id: incident.context.userId ?? null,
    entity_type: incident.context.entity?.type ?? null,
    entity_id: incident.context.entity?.id ?? null,
    entity_title: incident.context.entity?.title ?? null,
    query_keys: incident.context.queryKeys ?? [],
    automation_logs: incident.context.recentAutomationLogs ?? [],
    extra_context: incident.context.extra ?? {},
    executed_actions: incident.executedActions,
    fingerprint: incident.fingerprint,
  };

  const { error } = await supabase.from("app_incidents").insert(payload);
  if (error) throw error;
}
