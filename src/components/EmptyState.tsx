import { forwardRef } from "react";
import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  message: string;
  className?: string;
}

export const EmptyState = forwardRef<HTMLDivElement, EmptyStateProps>(
  ({ icon: Icon, message, className = "" }, ref) => {
    return (
      <div ref={ref} className={`empty-state ${className}`}>
        <Icon className="h-12 w-12 text-muted-foreground/30 mb-3" />
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    );
  }
);

EmptyState.displayName = "EmptyState";
