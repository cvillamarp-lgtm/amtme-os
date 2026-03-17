import { buildRecoveryContext, type RecoveryContextResolvers } from "./context";
import { recoveryStore } from "./store";
import type { RecoveryActionType, RecoveryIncident, RecoveryKind, RecoverySeverity } from "./types";
import { isChunkError } from "./chunkGuard";

function createId() {
  return crypto.randomUUID();
}

function buildFingerprint(kind: RecoveryKind, message: string, pathname: string) {
  return `${kind}:${pathname}:${message.slice(0, 180)}`;
}

function guessSeverity(kind: RecoveryKind, message: string): RecoverySeverity {
  if (kind === "chunk-load") return "critical";
  if (/permission|forbidden|unauthorized|token/i.test(message)) return "medium";
  if (/cannot read|undefined|null/i.test(message)) return "high";
  return "medium";
}

const AUTH_ERROR_RE = /jwt.*expired|invalid.*token|token.*invalid|unauthorized|refresh.*token|session.*expired|auth.*error|401/i;

function guessSuggestedActions(kind: RecoveryKind, message: string): RecoveryActionType[] {
  // Auth errors always get refresh-session first, regardless of kind
  if (AUTH_ERROR_RE.test(message)) {
    return ["refresh-session", "reload-route", "mark-unresolved"];
  }
  switch (kind) {
    case "chunk-load":
      return ["hard-reload-once", "reload-route", "mark-unresolved"];
    case "automation":
      return ["retry-automation", "resync-entity", "mark-unresolved"];
    case "network":
      return ["refetch-query", "invalidate-query", "mark-unresolved"];
    case "query":
      return ["invalidate-query", "refetch-query", "mark-unresolved"];
    case "render":
      return ["reload-route", "mark-unresolved"];
    case "runtime":
    case "promise":
    default:
      return ["reload-route", "mark-unresolved"];
  }
}

export async function reportRecoveryIncident(params: {
  kind: RecoveryKind;
  title: string;
  message: string;
  error?: unknown;
  resolvers: RecoveryContextResolvers;
}) {
  const context = await buildRecoveryContext(params.resolvers);
  const error =
    params.error instanceof Error
      ? params.error
      : params.error
      ? new Error(typeof params.error === "string" ? params.error : JSON.stringify(params.error))
      : undefined;

  const incident: RecoveryIncident = {
    id: createId(),
    kind: params.kind,
    severity: guessSeverity(params.kind, params.message),
    status: "detected",
    title: params.title,
    message: params.message,
    errorName: error?.name,
    stack: error?.stack,
    route: context.route,
    context,
    suggestedActions: guessSuggestedActions(params.kind, params.message),
    executedActions: [],
    fingerprint: buildFingerprint(params.kind, params.message, context.route.pathname),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return recoveryStore.addIncident(incident);
}

export function installRuntimeCapture(resolvers: RecoveryContextResolvers) {
  window.addEventListener("error", async (event) => {
    const error = event.error;
    const message =
      error instanceof Error ? error.message : event.message || "Unknown runtime error";

    await reportRecoveryIncident({
      kind: isChunkError(error) ? "chunk-load" : "runtime",
      title: isChunkError(error) ? "Falló la carga de un módulo" : "Error de ejecución",
      message,
      error,
      resolvers,
    });
  });

  window.addEventListener("unhandledrejection", async (event) => {
    const reason = event.reason;
    const message =
      reason instanceof Error
        ? reason.message
        : typeof reason === "string"
        ? reason
        : "Unhandled promise rejection";

    await reportRecoveryIncident({
      kind: isChunkError(reason) ? "chunk-load" : "promise",
      title: isChunkError(reason) ? "Falló la carga dinámica de un chunk" : "Promesa rechazada",
      message,
      error: reason,
      resolvers,
    });
  });
}
