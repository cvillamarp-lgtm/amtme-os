import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface LoadingSkeletonProps {
  count?: number;
  variant?: "card" | "row" | "stat";
  className?: string;
}

export const LoadingSkeleton = forwardRef<HTMLDivElement, LoadingSkeletonProps>(
  ({ count = 3, variant = "row", className }, ref) => {
    const heights: Record<string, string> = {
      card: "h-32",
      row: "h-16",
      stat: "h-28",
    };

    const grids: Record<string, string> = {
      card: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4",
      row: "space-y-3",
      stat: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4",
    };

    return (
      <div ref={ref} className={cn(grids[variant], className)}>
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className={cn("animate-pulse bg-muted rounded-lg", heights[variant])}
          />
        ))}
      </div>
    );
  }
);

LoadingSkeleton.displayName = "LoadingSkeleton";
