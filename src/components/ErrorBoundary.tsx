import { Component, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="flex flex-col items-center justify-center p-12 text-center gap-4">
            <AlertTriangle className="h-10 w-10 text-destructive/60" />
            <div>
              <h2 className="text-lg font-display font-semibold text-foreground">Algo salió mal</h2>
              <p className="text-sm text-muted-foreground mt-1 max-w-md">
                {this.state.error?.message || "Error inesperado"}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => this.setState({ hasError: false, error: undefined })}
            >
              Reintentar
            </Button>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
