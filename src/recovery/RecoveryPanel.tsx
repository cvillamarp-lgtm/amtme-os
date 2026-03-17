import React from "react";
import { useRecoveryAgent } from "./useRecoveryAgent";
import type { RecoveryIncident } from "./types";

function severityColor(severity: RecoveryIncident["severity"]) {
  switch (severity) {
    case "critical": return "#D4634A";
    case "high":     return "#D97706";
    case "medium":   return "#0D29C9";
    default:         return "#5BA4A0";
  }
}

function statusLabel(status: RecoveryIncident["status"]) {
  switch (status) {
    case "detected":   return "Detectado";
    case "analyzing":  return "Analizando";
    case "fixing":     return "Corrigiendo";
    case "fixed":      return "Resuelto ✓";
    case "unresolved": return "Sin resolver";
    case "ignored":    return "Ignorado";
    default:           return status;
  }
}

const actionLabels: Record<string, string> = {
  "invalidate-query":  "Invalidar query",
  "refetch-query":     "Recargar query",
  "retry-automation":  "Reintentar automatización",
  "reload-route":      "Recargar ruta",
  "hard-reload-once":  "Recarga completa",
  "reload-module":     "Recargar módulo",
  "resync-entity":     "Resync entidad",
  "mark-unresolved":   "Marcar sin resolver",
  "dismiss":           "Descartar",
};

export function RecoveryPanel() {
  const { incidents, isOpen, setOpen, runAction, clearFixed, dismissIncident } = useRecoveryAgent();

  if (!isOpen) return null;

  const active = incidents.filter((i) => i.status !== "fixed" && i.status !== "ignored");
  const resolved = incidents.filter((i) => i.status === "fixed" || i.status === "ignored");

  return (
    <aside
      style={{
        position: "fixed",
        right: 20,
        bottom: 88,
        width: 420,
        maxHeight: "70vh",
        overflow: "auto",
        background: "#fff",
        borderRadius: 20,
        boxShadow: "0 20px 60px rgba(0,0,0,0.16)",
        zIndex: 9999,
        padding: 16,
        border: "1px solid #e5e7eb",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 16, color: "#111827" }}>Recovery Agent</div>
          <div style={{ color: "#6b7280", fontSize: 12, marginTop: 2 }}>
            {active.length > 0
              ? `${active.length} incidente${active.length > 1 ? "s" : ""} activo${active.length > 1 ? "s" : ""}`
              : "Sin incidentes activos"}
          </div>
        </div>
        <button
          onClick={() => setOpen(false)}
          style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 18, padding: 0 }}
        >
          ✕
        </button>
      </div>

      {resolved.length > 0 && (
        <button
          onClick={clearFixed}
          style={{
            marginBottom: 12, fontSize: 12, padding: "4px 10px", borderRadius: 8,
            border: "1px solid #e5e7eb", background: "#f9fafb", cursor: "pointer", color: "#6b7280",
          }}
        >
          Limpiar resueltos ({resolved.length})
        </button>
      )}

      {incidents.length === 0 ? (
        <div style={{ color: "#6b7280", fontSize: 14, padding: "20px 0", textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>✓</div>
          No hay incidentes detectados.
        </div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {incidents.map((incident) => (
            <div
              key={incident.id}
              style={{
                border: `1px solid ${incident.status === "fixed" ? "#d1fae5" : incident.status === "ignored" ? "#f3f4f6" : "#e5e7eb"}`,
                borderRadius: 14,
                padding: 12,
                background: incident.status === "fixed" ? "#f0fdf4" : incident.status === "ignored" ? "#f9fafb" : "#fff",
                opacity: incident.status === "ignored" ? 0.6 : 1,
              }}
            >
              {/* Title row */}
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#111827" }}>{incident.title}</div>
                  <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>
                    {incident.route.pathname} · {statusLabel(incident.status)}
                  </div>
                </div>
                <span
                  style={{
                    background: severityColor(incident.severity),
                    color: "white",
                    borderRadius: 999,
                    padding: "3px 8px",
                    fontSize: 11,
                    flexShrink: 0,
                    fontWeight: 600,
                  }}
                >
                  {incident.severity}
                </span>
              </div>

              {/* Message */}
              <div style={{ marginTop: 8, fontSize: 13, color: "#374151", wordBreak: "break-word" }}>
                {incident.message.slice(0, 200)}{incident.message.length > 200 ? "…" : ""}
              </div>

              {/* Entity context */}
              {incident.context.entity?.id && (
                <div style={{ marginTop: 6, fontSize: 11, color: "#6b7280" }}>
                  📌 {incident.context.entity.type}/{incident.context.entity.title ?? incident.context.entity.id}
                </div>
              )}

              {/* Latest automation log */}
              {(incident.context.recentAutomationLogs?.length ?? 0) > 0 && (
                <div style={{ marginTop: 6, fontSize: 11, color: "#6b7280" }}>
                  ⚡ Último log: {incident.context.recentAutomationLogs![0].event_type} · {incident.context.recentAutomationLogs![0].status}
                </div>
              )}

              {/* Actions */}
              {incident.status !== "fixed" && incident.status !== "ignored" && (
                <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {incident.suggestedActions.map((action) => (
                    <button
                      key={action}
                      onClick={() => void runAction(incident, action)}
                      style={{
                        fontSize: 12, padding: "4px 10px", borderRadius: 8,
                        border: "1px solid #d1d5db", background: "#f9fafb",
                        cursor: "pointer", color: "#374151",
                      }}
                    >
                      {actionLabels[action] ?? action}
                    </button>
                  ))}
                  <button
                    onClick={() => dismissIncident(incident.id)}
                    style={{
                      fontSize: 12, padding: "4px 10px", borderRadius: 8,
                      border: "1px solid #e5e7eb", background: "transparent",
                      cursor: "pointer", color: "#9ca3af",
                    }}
                  >
                    Ignorar
                  </button>
                </div>
              )}

              {/* Executed actions history */}
              {incident.executedActions.length > 0 && (
                <div style={{ marginTop: 10, display: "grid", gap: 4 }}>
                  {incident.executedActions.map((a, idx) => (
                    <div
                      key={`${incident.id}-${idx}`}
                      style={{
                        fontSize: 11,
                        color: a.ok ? "#065f46" : "#991b1b",
                        background: a.ok ? "#ecfdf5" : "#fef2f2",
                        borderRadius: 8,
                        padding: "5px 8px",
                      }}
                    >
                      <strong>{actionLabels[a.action] ?? a.action}</strong>: {a.message}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}
