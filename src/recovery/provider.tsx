import React, { createContext, useContext, useEffect, useMemo } from "react";
import type { QueryClient } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";
import { installChunkReloadGuard } from "./chunkGuard";
import { installRuntimeCapture, reportRecoveryIncident } from "./runtimeCapture";
import type { RecoveryAutomationLog, RecoveryActionType, RecoveryEntityContext } from "./types";
import type { RecoveryContextResolvers } from "./context";
import { RecoveryButton } from "./RecoveryButton";
import { RecoveryPanel } from "./RecoveryPanel";
import { escalateIncidentToSupabase } from "./supabaseEscalation";
import { recoveryStore } from "./store";
import { runRecoveryAction } from "./actions";

// Actions that are safe to run automatically (no page reload / navigation)
const AUTO_REPAIR_SAFE: RecoveryActionType[] = [
  "refresh-session",
  "invalidate-query",
  "refetch-query",
  "retry-automation",
  "resync-entity",
];

interface RecoveryAgentProviderProps {
  children: React.ReactNode;
  queryClient: QueryClient;
  supabase?: SupabaseClient;
  retryAutomation?: (logId: string) => Promise<void>;
  getEntity?: () => RecoveryEntityContext | null | undefined;
  getUserId?: () => string | null | undefined;
  getRecentAutomationLogs?: () => Promise<RecoveryAutomationLog[]>;
  getEntityQueryKeys?: (entity: RecoveryEntityContext | null | undefined) => Array<readonly unknown[]>;
  resyncEntity?: (entity: RecoveryEntityContext | null | undefined) => Promise<void>;
}

interface RecoveryAgentContextValue {
  queryClient: QueryClient;
  supabase?: SupabaseClient;
  retryAutomation?: (logId: string) => Promise<void>;
  reportManualIssue: (title: string, message: string, error?: unknown) => Promise<void>;
  getEntityQueryKeys?: (entity: RecoveryEntityContext | null | undefined) => Array<readonly unknown[]>;
  resyncEntity?: (entity: RecoveryEntityContext | null | undefined) => Promise<void>;
}

const RecoveryAgentContext = createContext<RecoveryAgentContextValue | null>(null);

export function RecoveryAgentProvider({
  children,
  queryClient,
  supabase,
  retryAutomation,
  getEntity,
  getUserId,
  getRecentAutomationLogs,
  getEntityQueryKeys,
  resyncEntity,
}: RecoveryAgentProviderProps) {
  const resolvers: RecoveryContextResolvers = useMemo(
    () => ({
      getRoute: () => ({
        pathname: window.location.pathname,
        search: window.location.search,
        hash: window.location.hash,
      }),
      getBuildId: () => (window as Window & { __APP_BUILD_ID__?: string }).__APP_BUILD_ID__,
      getUserId,
      getEntity,
      getQueryKeys: () =>
        queryClient
          .getQueryCache()
          .getAll()
          .map((q) => JSON.stringify(q.queryKey)),
      getRecentAutomationLogs,
      getExtra: () => ({
        online: navigator.onLine,
        userAgent: navigator.userAgent,
      }),
    }),
     
    [getEntity, getRecentAutomationLogs, getUserId, queryClient]
  );

  useEffect(() => {
    installChunkReloadGuard();
    installRuntimeCapture(resolvers);
  }, [resolvers]);

  // Detect TOKEN_REFRESH_FAILED from Supabase and create an auth incident automatically.
  useEffect(() => {
    if (!supabase) return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "TOKEN_REFRESHED") return;
      if (event === "TOKEN_REFRESH_FAILED") {
        // Refresh failed — redirect immediately, no point trying recovery
        window.location.assign("/auth");
        return;
      }
      if (event === "SIGNED_OUT") {
        void reportRecoveryIncident({
          kind: "runtime",
          title: "Sesión expirada",
          message: "jwt expired — la sesión ha caducado",
          resolvers,
        });
      }
    });
    return () => subscription.unsubscribe();
  }, [supabase, resolvers]);

  useEffect(() => {
    if (!supabase) return;

    return recoveryStore.subscribe(() => {
      const state = recoveryStore.getState();
      const latest = state.incidents[0];
      if (!latest) return;

      if (latest.status === "unresolved" || latest.severity === "critical") {
        void escalateIncidentToSupabase(supabase, latest).catch(() => {});
      }
    });
  }, [supabase]);

  // Auto-repair: when a new incident is detected, automatically run the first safe action.
  useEffect(() => {
    const attempted = new Set<string>();

    return recoveryStore.subscribe(() => {
      const { incidents } = recoveryStore.getState();
      for (const incident of incidents) {
        if (incident.status !== "detected") continue;
        if (attempted.has(incident.id)) continue;

        const action = incident.suggestedActions.find((a) => AUTO_REPAIR_SAFE.includes(a));
        if (!action) continue;

        attempted.add(incident.id);
        void runRecoveryAction(incident, action, {
          queryClient,
          supabase,
          retryAutomation,
          getAutomationLogId: (item) => item.context.recentAutomationLogs?.[0]?.id,
          getEntityQueryKeys: (item) => getEntityQueryKeys?.(item.context.entity) ?? [],
          resyncEntity: async (item) => { await resyncEntity?.(item.context.entity); },
        }).catch(() => {});
      }
    });
  }, [queryClient, supabase, retryAutomation, getEntityQueryKeys, resyncEntity]);

  const value = useMemo<RecoveryAgentContextValue>(
    () => ({
      queryClient,
      supabase,
      retryAutomation,
      getEntityQueryKeys,
      resyncEntity,
      reportManualIssue: async (title, message, error) => {
        await reportRecoveryIncident({
          kind: "manual",
          title,
          message,
          error,
          resolvers,
        });
      },
    }),
     
    [getEntityQueryKeys, queryClient, resolvers, resyncEntity, retryAutomation, supabase]
  );

  return (
    <RecoveryAgentContext.Provider value={value}>
      {children}
      <RecoveryButton />
      <RecoveryPanel />
    </RecoveryAgentContext.Provider>
  );
}

export function useRecoveryAgentContext() {
  const ctx = useContext(RecoveryAgentContext);
  if (!ctx) {
    throw new Error("useRecoveryAgentContext debe usarse dentro de RecoveryAgentProvider");
  }
  return ctx;
}
