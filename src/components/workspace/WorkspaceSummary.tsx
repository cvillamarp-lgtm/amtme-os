import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Calendar, Mic, ExternalLink, AlertTriangle, CheckCircle2, XCircle, ChevronRight } from "lucide-react";
import { auditEpisode, getCompletenessLevel } from "@/lib/episode-validation";
import { cn } from "@/lib/utils";

interface Props {
  episode: Record<string, any>;
  assetCount: number;
  taskCount: number;
  onUpdate?: (updates: Record<string, any>) => Promise<void>;
}

// Production pipeline stages
const STAGES = [
  {
    key: "script_status",
    label: "Guión",
    states: [
      { value: "pending",     label: "Pendiente",    cls: "text-muted-foreground border-border bg-transparent" },
      { value: "in_progress", label: "En progreso",  cls: "text-yellow-500 border-yellow-500/40 bg-yellow-500/10" },
      { value: "completed",   label: "Completado",   cls: "text-emerald-500 border-emerald-500/40 bg-emerald-500/10" },
    ],
  },
  {
    key: "recording_status",
    label: "Grabación",
    states: [
      { value: "pending",   label: "Pendiente",  cls: "text-muted-foreground border-border bg-transparent" },
      { value: "recording", label: "Grabando",   cls: "text-yellow-500 border-yellow-500/40 bg-yellow-500/10" },
      { value: "completed", label: "Completada", cls: "text-emerald-500 border-emerald-500/40 bg-emerald-500/10" },
    ],
  },
  {
    key: "editing_status",
    label: "Edición",
    states: [
      { value: "pending",     label: "Pendiente",  cls: "text-muted-foreground border-border bg-transparent" },
      { value: "in_progress", label: "Editando",   cls: "text-yellow-500 border-yellow-500/40 bg-yellow-500/10" },
      { value: "completed",   label: "Completada", cls: "text-emerald-500 border-emerald-500/40 bg-emerald-500/10" },
    ],
  },
  {
    key: "distribution_status",
    label: "Distribución",
    states: [
      { value: "pending",     label: "Pendiente",    cls: "text-muted-foreground border-border bg-transparent" },
      { value: "in_progress", label: "En proceso",   cls: "text-blue-500 border-blue-500/40 bg-blue-500/10" },
      { value: "published",   label: "Publicado",    cls: "text-emerald-500 border-emerald-500/40 bg-emerald-500/10" },
    ],
  },
] as const;

function StageControl({
  stage,
  currentValue,
  onAdvance,
}: {
  stage: typeof STAGES[number];
  currentValue: string | null;
  onAdvance: (newValue: string) => void;
}) {
  const states = [...stage.states] as { value: string; label: string; cls: string }[];
  const idx = states.findIndex((s) => s.value === (currentValue || "pending"));
  const current = states[idx] ?? states[0];
  const next = states[idx + 1];

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{stage.label}</span>
      <div className="flex items-center gap-1.5">
        <span className={cn("text-[11px] font-medium px-2.5 py-1 rounded-full border", current.cls)}>
          {current.label}
        </span>
        {next && (
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground gap-0.5"
            onClick={() => onAdvance(next.value)}
          >
            <ChevronRight className="h-3 w-3" />
            {next.label}
          </Button>
        )}
      </div>
    </div>
  );
}

export function WorkspaceSummary({ episode, assetCount, taskCount, onUpdate }: Props) {
  const audit = auditEpisode(episode);
  const level = getCompletenessLevel(audit.healthScore);

  const advanceStage = async (key: string, value: string) => {
    if (!onUpdate) return;
    await onUpdate({ [key]: value });
  };

  return (
    <div className="space-y-6">
      {/* Health Score */}
      <div className="surface p-5 space-y-3">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-medium text-foreground">Salud del episodio</h3>
          <Badge variant="outline" className={level.color}>{level.nivel} — {level.label}</Badge>
        </div>
        <Progress value={audit.healthScore} className="h-2" />
        <p className="text-xs text-muted-foreground">{audit.healthScore}% completado · {audit.validations.filter(v => v.status === "ok").length}/{audit.validations.length} campos</p>
      </div>

      {/* Production Pipeline */}
      <div className="surface p-5 space-y-4">
        <h3 className="text-sm font-medium text-foreground">Pipeline de producción</h3>
        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
          {STAGES.map((stage) => (
            <StageControl
              key={stage.key}
              stage={stage}
              currentValue={episode[stage.key] ?? "pending"}
              onAdvance={(val) => advanceStage(stage.key, val)}
            />
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground">Haz click en la flecha para avanzar al siguiente estado</p>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="surface p-4 text-center">
          <p className="text-2xl font-display font-bold text-foreground">{assetCount}</p>
          <p className="text-xs text-muted-foreground">Assets</p>
        </div>
        <div className="surface p-4 text-center">
          <p className="text-2xl font-display font-bold text-foreground">{taskCount}</p>
          <p className="text-xs text-muted-foreground">Tareas</p>
        </div>
        <div className="surface p-4 text-center">
          <div className="flex items-center justify-center gap-1">
            {audit.canProduce ? (
              <CheckCircle2 className="h-5 w-5 text-[hsl(var(--chart-2))]" />
            ) : (
              <XCircle className="h-5 w-5 text-destructive" />
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Producción</p>
        </div>
        <div className="surface p-4 text-center">
          <div className="flex items-center justify-center gap-1">
            {audit.canPublish ? (
              <CheckCircle2 className="h-5 w-5 text-[hsl(var(--chart-2))]" />
            ) : (
              <XCircle className="h-5 w-5 text-destructive" />
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Publicación</p>
        </div>
      </div>

      {/* Blockers */}
      {audit.blockers.length > 0 && (
        <div className="surface p-4 space-y-2 border-l-2 border-destructive">
          <h4 className="text-xs font-medium text-destructive flex items-center gap-1">
            <XCircle className="h-3.5 w-3.5" /> Bloqueos
          </h4>
          {audit.blockers.map((b, i) => (
            <p key={i} className="text-xs text-muted-foreground">{b}</p>
          ))}
        </div>
      )}

      {audit.warnings.length > 0 && (
        <div className="surface p-4 space-y-2 border-l-2 border-[hsl(var(--chart-3))]">
          <h4 className="text-xs font-medium text-[hsl(var(--chart-3))] flex items-center gap-1">
            <AlertTriangle className="h-3.5 w-3.5" /> Advertencias
          </h4>
          {audit.warnings.map((w, i) => (
            <p key={i} className="text-xs text-muted-foreground">{w}</p>
          ))}
        </div>
      )}

      {/* Key Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {episode.release_date && (
          <div className="surface p-4 flex items-center gap-3">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Lanzamiento</p>
              <p className="text-sm font-medium text-foreground">{episode.release_date}</p>
            </div>
          </div>
        )}
        {episode.duration && (
          <div className="surface p-4 flex items-center gap-3">
            <Mic className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Duración</p>
              <p className="text-sm font-medium text-foreground">{episode.duration}</p>
            </div>
          </div>
        )}
        {episode.link_spotify && (
          <div className="surface p-4 flex items-center gap-3">
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Spotify</p>
              <a href={episode.link_spotify} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline truncate block">
                Escuchar
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Idea principal */}
      {episode.idea_principal && (
        <div className="surface p-5 border-l-2 border-primary">
          <h3 className="text-sm font-medium text-foreground mb-2">Idea principal</h3>
          <p className="text-sm text-muted-foreground italic">"{episode.idea_principal}"</p>
          {episode.generation_metadata?.source_type === "ai_generated" && (
            <p className="text-[10px] text-muted-foreground mt-2">
              Campos generados por IA · {new Date(episode.generation_metadata.generated_at).toLocaleDateString("es-MX")}
            </p>
          )}
        </div>
      )}

      {/* Summary text */}
      {episode.summary && (
        <div className="surface p-5">
          <h3 className="text-sm font-medium text-foreground mb-2">Resumen</h3>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{episode.summary}</p>
        </div>
      )}

      {episode.core_thesis && (
        <div className="surface p-5">
          <h3 className="text-sm font-medium text-foreground mb-2">Tesis central</h3>
          <p className="text-sm text-muted-foreground">{episode.core_thesis}</p>
        </div>
      )}
    </div>
  );
}
