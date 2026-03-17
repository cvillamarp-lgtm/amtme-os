import { Component, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  isChunkError: boolean;
}

/**
 * Returns true if the error is a dynamic import / chunk load failure.
 * These happen when a user has a stale index.html cached after a new deploy,
 * and the old chunk hashes no longer exist on the server.
 * The correct recovery is a hard page reload (which fetches fresh index.html).
 */
function isChunkLoadError(error: Error): boolean {
  const msg = error.message || "";
  return (
    msg.includes("Failed to fetch dynamically imported module") ||
    msg.includes("Importing a module script failed") ||
    msg.includes("error loading dynamically imported module") ||
    msg.includes("Unable to preload CSS") ||
    msg.includes("dynamically imported module")
  );
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, isChunkError: false };

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      isChunkError: isChunkLoadError(error),
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info.componentStack);

    // For chunk load errors, auto-reload after a short delay so the user
    // gets the latest version without having to interact.
    if (isChunkLoadError(error)) {
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    if (this.props.fallback) return this.props.fallback;

    // ── Chunk load error: new deploy, stale cache ──────────────────────────
    if (this.state.isChunkError) {
      return (
        <div className="flex flex-col items-center justify-center p-12 text-center gap-4">
          <RefreshCw className="h-8 w-8 text-primary/60 animate-spin" />
          <div>
            <h2 className="text-lg font-display font-semibold text-foreground">
              Nueva versión disponible
            </h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-md">
              La app se actualizó. Recargando para aplicar los cambios...
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.reload()}
          >
            Recargar ahora
          </Button>
        </div>
      );
    }

    // ── Generic runtime error ─────────────────────────────────────────────
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center gap-4">
        <AlertTriangle className="h-10 w-10 text-destructive/60" />
        <div>
          <h2 className="text-lg font-display font-semibold text-foreground">
            Algo salió mal
          </h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-md">
            {this.state.error?.message || "Error inesperado"}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => this.setState({ hasError: false, error: undefined, isChunkError: false })}
        >
          Reintentar
        </Button>
      </div>
    );
  }
}
