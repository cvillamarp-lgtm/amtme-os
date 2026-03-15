import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, AlertTriangle, Info, History, User, Bot, Cpu, Upload } from "lucide-react";
import { auditEpisode, getCompletenessLevel } from "@/lib/episode-validation";
import { Progress } from "@/components/ui/progress";
import { useChangelog } from "@/hooks/useChangelog";

interface Props {
  episode: Record<string, any>;
}

const ORIGIN_LABELS: Record<string, { label: string; icon: typeof User; color: string }> = {
  manual:  { label: "Manual",    icon: User,   color: "text-blue-400" },
  ai:      { label: "IA",        icon: Bot,    color: "text-purple-400" },
  system:  { label: "Sistema",   icon: Cpu,    color: "text-gray-400" },
  import:  { label: "Importado", icon: Upload, color: "text-amber-400" },
};

function formatChangedAt(ts: string) {
  const d = new Date(ts);
  return d.toLocaleString("es-MX", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function truncate(str: string | null, max = 60) {
  if (!str) return "—";
  return str.length > max ? str.slice(0, max) + "…" : str;
}

export function WorkspaceAudit({ episode }: Props) {
  const audit = auditEpisode(episode);
  const level = getCompletenessLevel(audit.healthScore);
  const { getHistory } = useChangelog();
  const [history, setHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    if (!episode?.id) return;
    setHistoryLoading(true);
    getHistory("episodes", episode.id, 30).then((data) => {
      setHistory(data);
      setHistoryLoading(false);
    });
  }, [episode?.id, getHistory]);

  const okCount = audit.validations.filter(v => v.status === "ok").length;
  const missingCount = audit.validations.filter(v => v.status === "missing").length;

  return (
    <div className="space-y-6">
      {/* Score */}
      <div className="surface p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-display font-bold text-foreground">Estado de salud</h3>
          <div className="flex items-center gap-2">
            <span className="text-3xl font-display font-bold text-foreground">{audit.healthScore}%</span>
            <Badge variant="outline" className={level.color}>{level.nivel}</Badge>
          </div>
        </div>
        <Progress value={audit.healthScore} className="h-3" />
        <div className="flex gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-[hsl(var(--chart-2))]" />{okCount} completos</span>
          <span className="flex items-center gap-1"><XCircle className="h-3 w-3 text-destructive" />{missingCount} faltantes</span>
          <span className="flex items-center gap-1"><AlertTriangle className="h-3 w-3 text-[hsl(var(--chart-3))]" />{audit.warnings.length} advertencias</span>
        </div>
      </div>

      {/* Production/Publish Status */}
      <div className="grid grid-cols-2 gap-4">
        <div className={`surface p-5 border-l-4 ${audit.canProduce ? "border-[hsl(var(--chart-2))]" : "border-destructive"}`}>
          <div className="flex items-center gap-2 mb-2">
            {audit.canProduce ? <CheckCircle2 className="h-5 w-5 text-[hsl(var(--chart-2))]" /> : <XCircle className="h-5 w-5 text-destructive" />}
            <h4 className="text-sm font-medium text-foreground">Listo para producción</h4>
          </div>
          <p className="text-xs text-muted-foreground">
            {audit.canProduce ? "Todos los campos requeridos están completos" : "Faltan campos obligatorios"}
          </p>
        </div>
        <div className={`surface p-5 border-l-4 ${audit.canPublish ? "border-[hsl(var(--chart-2))]" : "border-destructive"}`}>
          <div className="flex items-center gap-2 mb-2">
            {audit.canPublish ? <CheckCircle2 className="h-5 w-5 text-[hsl(var(--chart-2))]" /> : <XCircle className="h-5 w-5 text-destructive" />}
            <h4 className="text-sm font-medium text-foreground">Listo para publicación</h4>
          </div>
          <p className="text-xs text-muted-foreground">
            {audit.canPublish ? "Episodio completo y verificado" : "Requisitos pendientes"}
          </p>
        </div>
      </div>

      {/* Blockers */}
      {audit.blockers.length > 0 && (
        <div className="surface p-5 space-y-3">
          <h4 className="text-sm font-medium text-destructive flex items-center gap-2">
            <XCircle className="h-4 w-4" /> Bloqueos ({audit.blockers.length})
          </h4>
          {audit.blockers.map((b, i) => (
            <div key={i} className="text-sm text-muted-foreground bg-destructive/5 rounded-lg px-4 py-2">
              {b}
            </div>
          ))}
        </div>
      )}

      {/* Warnings */}
      {audit.warnings.length > 0 && (
        <div className="surface p-5 space-y-3">
          <h4 className="text-sm font-medium text-[hsl(var(--chart-3))] flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" /> Advertencias ({audit.warnings.length})
          </h4>
          {audit.warnings.map((w, i) => (
            <div key={i} className="text-sm text-muted-foreground bg-[hsl(var(--chart-3)/0.05)] rounded-lg px-4 py-2">
              {w}
            </div>
          ))}
        </div>
      )}

      {/* Field-by-field detail */}
      <div className="surface p-5 space-y-3">
        <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
          <Info className="h-4 w-4 text-muted-foreground" /> Detalle de campos
        </h4>
        <div className="divide-y divide-border">
          {audit.validations.map((v) => (
            <div key={v.field} className="flex items-center justify-between py-2.5">
              <span className="text-sm text-foreground">{v.label}</span>
              <div className="flex items-center gap-2">
                {v.status === "ok" ? (
                  <Badge variant="secondary" className="text-[10px] text-[hsl(var(--chart-2))]">Completo</Badge>
                ) : (
                  <Badge variant="secondary" className="text-[10px] text-destructive">Faltante</Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Suggested actions */}
      {(audit.blockers.length > 0 || audit.warnings.length > 0) && (
        <div className="surface p-5 space-y-3">
          <h4 className="text-sm font-medium text-foreground">Acciones sugeridas</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {audit.validations
              .filter(v => v.status === "missing")
              .slice(0, 5)
              .map(v => (
                <li key={v.field} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                  Completar <strong className="text-foreground">{v.label}</strong> en la pestaña Datos base
                </li>
              ))}
            {episode.conflicto_detectado && !episode.conflicto_nota && (
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-destructive shrink-0" />
                Documentar el conflicto detectado
              </li>
            )}
          </ul>
        </div>
      )}

      {/* ── Change History ──────────────────────────────────────────────── */}
      <div className="surface p-5 space-y-3">
        <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
          <History className="h-4 w-4 text-muted-foreground" />
          Historial de cambios
          {history.length > 0 && (
            <span className="ml-auto text-xs text-muted-foreground font-normal">{history.length} registros</span>
          )}
        </h4>

        {historyLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <div key={i} className="h-10 animate-pulse bg-muted rounded" />)}
          </div>
        ) : history.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">
            Sin cambios registrados todavía. Los cambios se registran automáticamente al editar.
          </p>
        ) : (
          <div className="divide-y divide-border max-h-72 overflow-y-auto">
            {history.map((entry) => {
              const origin = ORIGIN_LABELS[entry.change_origin] ?? ORIGIN_LABELS.manual;
              const OriginIcon = origin.icon;
              return (
                <div key={entry.id} className="py-2.5 grid grid-cols-[1fr_auto] gap-2 items-start">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-foreground">{entry.field_name}</span>
                      <span className={`text-[10px] flex items-center gap-0.5 ${origin.color}`}>
                        <OriginIcon className="w-3 h-3" />
                        {origin.label}
                      </span>
                    </div>
                    {entry.old_value && (
                      <p className="text-[10px] text-muted-foreground mt-0.5 line-through">
                        {truncate(entry.old_value)}
                      </p>
                    )}
                    <p className="text-[10px] text-foreground/80 mt-0.5">
                      {truncate(entry.new_value)}
                    </p>
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0 text-right">
                    {formatChangedAt(entry.changed_at)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
