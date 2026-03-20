/**
 * VisualOS — Dashboard principal
 * ────────────────────────────────
 * Lista todos los episodios con su progreso visual.
 * Acceso rápido a las piezas pendientes.
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, Layers, ChevronRight, Loader2, ImageIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useVisualEpisodes } from "@/hooks/visual-os/useVisualEpisodes";
import { VisualStatusBadge } from "@/components/visual-os/StatusBadge";
import type { EpisodeWithVisual, VisualStatus } from "@/lib/visual-os/types";

const TOTAL_PIECES = 15;

function EpisodeRow({ ep }: { ep: EpisodeWithVisual }) {
  const total   = ep.pieces_total ?? 0;
  const done    = ep.pieces_done  ?? 0;
  const pct     = total > 0 ? Math.round((done / total) * 100) : 0;
  const missing = TOTAL_PIECES - total; // pieces not yet initialized

  return (
    <Link
      to={`/visual/episode/${ep.id}`}
      className="group flex items-center gap-4 rounded-lg border border-border bg-card px-4 py-3.5 hover:border-border/80 hover:bg-card/80 transition-all"
    >
      {/* Ep number */}
      <div className="w-10 shrink-0 text-center">
        <span className="text-2xl font-black tabular-nums leading-none text-foreground/20 group-hover:text-foreground/40 transition-colors">
          {ep.number?.padStart(2,"0") ?? "--"}
        </span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="text-sm font-semibold truncate">{ep.title}</h3>
          <VisualStatusBadge status={ep.visual_status as VisualStatus | null} />
        </div>
        {ep.thesis_central && (
          <p className="text-xs text-muted-foreground truncate">{ep.thesis_central}</p>
        )}
        <div className="mt-1.5 flex items-center gap-2">
          <Progress value={pct} className="h-1 flex-1" />
          <span className="text-[10px] font-mono text-muted-foreground shrink-0">
            {done}/{TOTAL_PIECES}
          </span>
          {missing > 0 && (
            <span className="text-[10px] text-amber-500 shrink-0">
              +{missing} sin crear
            </span>
          )}
        </div>
      </div>

      {/* Date */}
      {ep.release_date && (
        <div className="hidden md:block shrink-0 text-right">
          <p className="text-xs text-muted-foreground">
            {new Date(ep.release_date).toLocaleDateString("es-EC", {
              day: "numeric", month: "short",
            })}
          </p>
        </div>
      )}

      <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-muted-foreground shrink-0 transition-colors" />
    </Link>
  );
}

export default function VisualOS() {
  const { data: episodes = [], isLoading } = useVisualEpisodes();
  const [search, setSearch]   = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filtered = episodes.filter(ep => {
    const q = search.toLowerCase();
    const matchSearch = !q
      || ep.title.toLowerCase().includes(q)
      || (ep.number ?? "").includes(q)
      || (ep.thesis_central ?? "").toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || ep.visual_status === statusFilter;
    return matchSearch && matchStatus;
  });

  // Summary stats
  const total    = episodes.length;
  const done     = episodes.filter(e => e.visual_status === "completado").length;
  const inProd   = episodes.filter(e => e.visual_status === "en_produccion").length;
  const pending  = episodes.filter(e => !e.visual_status || e.visual_status === "sin_iniciar").length;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="shrink-0 border-b border-border px-6 py-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#193497]">
              <ImageIcon className="h-4 w-4 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-none">AMTME Visual OS</h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Sistema de producción visual del podcast
              </p>
            </div>
          </div>
          <Link to="/episodes/new">
            <Button size="sm" className="gap-1.5 text-xs">
              <Plus className="h-3.5 w-3.5" /> Nuevo episodio
            </Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Episodios",     value: total,  color: "text-foreground" },
            { label: "En producción", value: inProd, color: "text-amber-400" },
            { label: "Pendientes",    value: pending, color: "text-zinc-500" },
            { label: "Completados",   value: done,   color: "text-emerald-400" },
          ].map(s => (
            <div key={s.label} className="rounded-md bg-muted/30 px-3 py-2">
              <p className={cn("text-xl font-black tabular-nums", s.color)}>{s.value}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              className="pl-8 h-8 text-xs"
              placeholder="Buscar episodio..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 w-44 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="sin_iniciar">Sin iniciar</SelectItem>
              <SelectItem value="en_produccion">En producción</SelectItem>
              <SelectItem value="en_revision">En revisión</SelectItem>
              <SelectItem value="completado">Completado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
            <Layers className="h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">
              {episodes.length === 0
                ? "No hay episodios. Crea uno desde la sección Episodios."
                : "Sin resultados para esta búsqueda."}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(ep => <EpisodeRow key={ep.id} ep={ep} />)}
          </div>
        )}
      </div>
    </div>
  );
}
