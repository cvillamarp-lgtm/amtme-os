export type RecoverySeverity = "low" | "medium" | "high" | "critical";

export type RecoveryStatus =
  | "detected"
  | "analyzing"
  | "fixing"
  | "fixed"
  | "unresolved"
  | "ignored";

export type RecoveryKind =
  | "runtime"
  | "promise"
  | "chunk-load"
  | "network"
  | "automation"
  | "query"
  | "render"
  | "manual";

export type RecoveryActionType =
  | "invalidate-query"
  | "refetch-query"
  | "retry-automation"
  | "reload-route"
  | "hard-reload-once"
  | "reload-module"
  | "resync-entity"
  | "refresh-session"
  | "mark-unresolved"
  | "dismiss";

export interface RecoveryEntityContext {
  type?: string;
  id?: string;
  title?: string;
}

export interface RecoveryRouteContext {
  pathname: string;
  search?: string;
  hash?: string;
}

export interface RecoveryAutomationLog {
  id: string;
  event_type?: string;
  status?: string;
  message?: string | null;
  run_id?: string | null;
  created_at?: string;
  metadata?: Record<string, unknown> | null;
}

export interface RecoveryContextSnapshot {
  route: RecoveryRouteContext;
  buildId?: string;
  userId?: string | null;
  entity?: RecoveryEntityContext | null;
  queryKeys?: string[];
  recentAutomationLogs?: RecoveryAutomationLog[];
  extra?: Record<string, unknown>;
}

export interface RecoveryActionResult {
  ok: boolean;
  action: RecoveryActionType;
  message: string;
  details?: Record<string, unknown>;
}

export interface RecoveryIncident {
  id: string;
  kind: RecoveryKind;
  severity: RecoverySeverity;
  status: RecoveryStatus;
  title: string;
  message: string;
  errorName?: string;
  stack?: string;
  route: RecoveryRouteContext;
  context: RecoveryContextSnapshot;
  suggestedActions: RecoveryActionType[];
  executedActions: RecoveryActionResult[];
  fingerprint: string;
  createdAt: string;
  updatedAt: string;
}
