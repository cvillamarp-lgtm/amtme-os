import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";

interface ProgressTrackerProps {
  currentStep: string;
  currentPiece: number;
  totalPieces: number;
  isRunning: boolean;
}

export function ProgressTracker({ currentStep, currentPiece, totalPieces, isRunning }: ProgressTrackerProps) {
  if (!isRunning) return null;

  const progress = totalPieces > 0 ? Math.round((currentPiece / totalPieces) * 100) : 0;

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        <span className="text-sm font-medium">Produciendo contenido...</span>
      </div>
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{currentStep}</span>
          <span>{currentPiece}/{totalPieces}</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>
    </div>
  );
}
