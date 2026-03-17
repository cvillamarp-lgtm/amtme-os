import React from "react";
import { reportRecoveryIncident } from "./runtimeCapture";
import { isChunkError } from "./chunkGuard";
import type { RecoveryContextResolvers } from "./context";

interface Props {
  children: React.ReactNode;
  resolvers: RecoveryContextResolvers;
}

interface State {
  hasError: boolean;
  error?: Error;
  isChunkLoad: boolean;
}

export class RouteErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, isChunkLoad: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, isChunkLoad: isChunkError(error) };
  }

  async componentDidCatch(error: Error) {
    await reportRecoveryIncident({
      kind: isChunkError(error) ? "chunk-load" : "render",
      title: isChunkError(error) ? "Falló la carga de un módulo" : "Falló el render de una ruta",
      message: error.message,
      error,
      resolvers: this.props.resolvers,
    });

    // Auto-reload for chunk errors (stale deploy)
    if (isChunkError(error)) {
      setTimeout(() => window.location.reload(), 1500);
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    if (this.state.isChunkLoad) {
      return (
        <div style={{ padding: 24, textAlign: "center", fontFamily: "system-ui, sans-serif" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🔄</div>
          <p style={{ fontWeight: 700, fontSize: 16, margin: "0 0 8px" }}>Nueva versión disponible</p>
          <p style={{ color: "#6b7280", fontSize: 14, margin: "0 0 16px" }}>
            La app se actualizó. Recargando...
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: "8px 20px", borderRadius: 8, border: "1px solid #d1d5db",
              background: "#f9fafb", cursor: "pointer", fontSize: 14,
            }}
          >
            Recargar ahora
          </button>
        </div>
      );
    }

    return (
      <div style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
        <p style={{ fontWeight: 700, fontSize: 16 }}>Algo salió mal</p>
        <p style={{ color: "#6b7280", fontSize: 14, margin: "8px 0 16px" }}>
          {this.state.error?.message ?? "Error inesperado en esta vista."}
        </p>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => this.setState({ hasError: false, error: undefined, isChunkLoad: false })}
            style={{ padding: "6px 16px", borderRadius: 8, border: "1px solid #d1d5db", cursor: "pointer", fontSize: 13 }}
          >
            Reintentar
          </button>
          <button
            onClick={() => window.location.reload()}
            style={{ padding: "6px 16px", borderRadius: 8, border: "1px solid #d1d5db", cursor: "pointer", fontSize: 13 }}
          >
            Recargar página
          </button>
        </div>
      </div>
    );
  }
}
