import type { QueryClient } from "@tanstack/react-query";
import { recoveryStore } from "./store";
import type { RecoveryActionResult, RecoveryActionType, RecoveryIncident } from "./types";
import { clearChunkReloadGuardFlag } from "./chunkGuard";

export interface RecoveryActionDeps {
  queryClient: QueryClient;
  retryAutomation?: (logId: string) => Promise<void>;
  getEntityQueryKeys?: (incident: RecoveryIncident) => Array<readonly unknown[]>;
  getAutomationLogId?: (incident: RecoveryIncident) => string | undefined;
  resyncEntity?: (incident: RecoveryIncident) => Promise<void>;
}

function result(
  action: RecoveryActionType,
  ok: boolean,
  message: string,
  details?: Record<string, unknown>
): RecoveryActionResult {
  return { action, ok, message, details };
}

export async function executeRecoveryAction(
  incident: RecoveryIncident,
  action: RecoveryActionType,
  deps: RecoveryActionDeps
): Promise<RecoveryActionResult> {
  recoveryStore.updateIncident(incident.id, { status: "fixing" });

  try {
    switch (action) {
      case "invalidate-query": {
        const keys = deps.getEntityQueryKeys?.(incident) ?? [];
        await Promise.all(keys.map((key) => deps.queryClient.invalidateQueries({ queryKey: key })));
        return result(action, true, "Queries invalidadas correctamente", { count: keys.length });
      }

      case "refetch-query": {
        const keys = deps.getEntityQueryKeys?.(incident) ?? [];
        await Promise.all(keys.map((key) => deps.queryClient.refetchQueries({ queryKey: key })));
        return result(action, true, "Queries recargadas correctamente", { count: keys.length });
      }

      case "retry-automation": {
        const logId = deps.getAutomationLogId?.(incident);
        if (!logId || !deps.retryAutomation) {
          return result(action, false, "No hay retryAutomation o logId disponible");
        }
        await deps.retryAutomation(logId);
        return result(action, true, "Automatización relanzada");
      }

      case "reload-route": {
        window.location.assign(
          `${incident.route.pathname}${incident.route.search ?? ""}${incident.route.hash ?? ""}`
        );
        return result(action, true, "Ruta recargada");
      }

      case "hard-reload-once": {
        clearChunkReloadGuardFlag();
        window.location.reload();
        return result(action, true, "Recarga completa ejecutada");
      }

      case "reload-module": {
        window.location.reload();
        return result(action, true, "Módulo solicitado para recarga");
      }

      case "resync-entity": {
        if (!deps.resyncEntity) {
          return result(action, false, "No existe función de resync configurada");
        }
        await deps.resyncEntity(incident);
        return result(action, true, "Entidad resincronizada");
      }

      case "dismiss": {
        recoveryStore.dismissIncident(incident.id);
        return result(action, true, "Incidente descartado");
      }

      case "mark-unresolved": {
        recoveryStore.updateIncident(incident.id, { status: "unresolved" });
        return result(action, true, "Marcado como no resuelto");
      }

      default:
        return result(action, false, "Acción no soportada");
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return result(action, false, message);
  }
}

export async function runRecoveryAction(
  incident: RecoveryIncident,
  action: RecoveryActionType,
  deps: RecoveryActionDeps
) {
  const output = await executeRecoveryAction(incident, action, deps);
  recoveryStore.appendAction(incident.id, output);

  if (output.ok && action !== "mark-unresolved" && action !== "dismiss") {
    recoveryStore.updateIncident(incident.id, { status: "fixed" });
  } else if (!output.ok) {
    recoveryStore.updateIncident(incident.id, { status: "unresolved" });
  }

  return output;
}
