import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { runQAGates, getQASummary, type EpisodeQAData } from "@/lib/qa-gates";
import { CheckCircle2, AlertTriangle, XCircle, Info } from "lucide-react";

interface Props {
  data: EpisodeQAData;
}

function GateIcon({
  severity,
  passed,
}: {
  severity: string;
  passed: boolean;
}) {
  if (passed) return <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />;
  if (severity === "error") return <XCircle className="h-4 w-4 text-destructive shrink-0" />;
  if (severity === "warning") return <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0" />;
  return <Info className="h-4 w-4 text-muted-foreground shrink-0" />;
}

export function QAGatesPanel({ data }: Props) {
  const results = runQAGates(data);
  const summary = getQASummary(results);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="space-y-1 flex-1 min-w-[160px]">
          <p className="text-sm font-medium">
            Puntuación QA: <span className="text-foreground">{summary.score}%</span>
          </p>
          <Progress value={summary.score} className="h-2" />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Badge variant="default">
            {summary.passed}/{summary.total} gates
          </Badge>
          {summary.errors > 0 && (
            <Badge variant="destructive">{summary.errors} error{summary.errors > 1 ? "es" : ""}</Badge>
          )}
          {summary.warnings > 0 && (
            <Badge variant="secondary">{summary.warnings} aviso{summary.warnings > 1 ? "s" : ""}</Badge>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {results.map((result) => (
          <div
            key={result.gate.id}
            className={`flex items-start gap-3 rounded-lg border p-3 ${
              result.passed
                ? "border-border bg-transparent"
                : result.gate.severity === "error"
                ? "border-destructive/30 bg-destructive/5"
                : result.gate.severity === "warning"
                ? "border-yellow-500/30 bg-yellow-500/5"
                : "border-border"
            }`}
          >
            <GateIcon severity={result.gate.severity} passed={result.passed} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{result.gate.label}</p>
              <p className="text-xs text-muted-foreground">{result.gate.description}</p>
            </div>
            <Badge
              variant={
                result.passed
                  ? "default"
                  : result.gate.severity === "error"
                  ? "destructive"
                  : "secondary"
              }
            >
              {result.passed ? "OK" : "FAIL"}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
}
