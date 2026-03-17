import { useSyncExternalStore } from "react";
import { recoveryStore } from "./store";
import { useRecoveryAgentContext } from "./provider";
import { runRecoveryAction } from "./actions";
import type { RecoveryActionType, RecoveryIncident } from "./types";

export function useRecoveryAgent() {
  const snapshot = useSyncExternalStore(recoveryStore.subscribe, recoveryStore.getState);
  const ctx = useRecoveryAgentContext();

  const runAction = async (incident: RecoveryIncident, action: RecoveryActionType) => {
    return runRecoveryAction(incident, action, {
      queryClient: ctx.queryClient,
      supabase: ctx.supabase,
      retryAutomation: ctx.retryAutomation,
      getAutomationLogId: (item) => item.context.recentAutomationLogs?.[0]?.id,
      getEntityQueryKeys: (item) => {
        const entity = item.context.entity;
        return ctx.getEntityQueryKeys?.(entity) ?? [];
      },
      resyncEntity: async (item) => {
        const entity = item.context.entity;
        await ctx.resyncEntity?.(entity);
      },
    });
  };

  return {
    incidents: snapshot.incidents,
    isOpen: snapshot.isOpen,
    setOpen: recoveryStore.setOpen,
    clearFixed: recoveryStore.clearFixed,
    dismissIncident: recoveryStore.dismissIncident,
    runAction,
    reportManualIssue: ctx.reportManualIssue,
  };
}
