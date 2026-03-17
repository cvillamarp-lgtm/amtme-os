import type {
  RecoveryAutomationLog,
  RecoveryContextSnapshot,
  RecoveryEntityContext,
  RecoveryRouteContext,
} from "./types";

export interface RecoveryContextResolvers {
  getRoute: () => RecoveryRouteContext;
  getBuildId?: () => string | undefined;
  getUserId?: () => string | null | undefined;
  getEntity?: () => RecoveryEntityContext | null | undefined;
  getQueryKeys?: () => string[] | undefined;
  getRecentAutomationLogs?: () => Promise<RecoveryAutomationLog[]>;
  getExtra?: () => Record<string, unknown> | undefined;
}

export async function buildRecoveryContext(
  resolvers: RecoveryContextResolvers
): Promise<RecoveryContextSnapshot> {
  return {
    route: resolvers.getRoute(),
    buildId: resolvers.getBuildId?.(),
    userId: resolvers.getUserId?.() ?? null,
    entity: resolvers.getEntity?.() ?? null,
    queryKeys: resolvers.getQueryKeys?.() ?? [],
    recentAutomationLogs: (await resolvers.getRecentAutomationLogs?.()) ?? [],
    extra: resolvers.getExtra?.() ?? {},
  };
}
