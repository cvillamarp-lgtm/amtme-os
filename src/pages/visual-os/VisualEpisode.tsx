/**
 * VisualEpisode
 * ─────────────
 * Grid of 15 pieces for one episode.
 * Shows status, validation score, and quick-access to each piece editor.
 */
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft, Zap, Loader2, Plus, CheckCircle2,
  LayoutGrid, FileText, Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useVisualEpisode, useKeyPhrases, useUpdateEpisodeVisual, useSaveKeyPhrases } from "@/hooks/visual-os/useVisualEpisodes";
import { useEpisodePieces, useInitEpisodePieces } from "@/hooks/visual-os/useVisualPieces";
import { useVisualTemplates } from "@/hooks/visual-os/useVisualTemplates";
import { PieceStatusBadge, VisualStatusBadge } from "@/components/visual-os/StatusBadge";
import type { VisualPieceRow } from "@/lib/visual-os/types";

function PieceTile({ piece, episodeId }: { piece: VisualPieceRow; episodeId: string }) {
  const tpl = piece.template;
  if (!tpl) return null;
  const score = piece.validation_score ?? 0;

  return (
    <Link
      to={`/visual/episode/${episodeId}/piece/${piece.id}`}
      className="group relative rounded-lg border border-border bg-card p-3 hover:border-border/70 hover:bg-muted/30 transition-all flex flex-col gap-2"
    >
      {/* Piece code */}
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs text-muted-foreground">{tpl.piece_code}</span>
        <PieceStatusBadge status={piece.piece_status} />
      </div>

      {/* Preview placeholder */}
      <div
        className="w-full rounded overflow-hidden"
        style={{
          aspectRatio: `${tpl.width_px} / ${tpl.height_px}`,
          backgroundColor: tpl.background_color,
          maxHeight: 120,
        }}
      >
        {piece.preview_data_url ? (
          <img
            src={piece.preview_data_url}
            alt={tpl.piece_name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-white/20 text-xs font-mono">{tpl.format}</span>
          </div>
        )}
      </div>

      {/* Name */}
      <p className="text-xs font-medium leading-snug line-clamp-2">{tpl.piece_name}</p>

      {/* Score bar */}
      {score > 0 && (
        <div className="flex items-center gap-1.5">
          <Progress value={score} className="h-0.5 flex-1" />
          <span className={cn(
            "text-[9px] font-mono tabular-nums shrink-0",
            score >= 90 ? "text-emerald-500" : score >= 70 ? "text-amber-500" : "text-red-400",
          )}>
            {score}%
          </span>
        </div>
      )}

      {/* Hover arrow */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="h-5 w-5 rounded-full bg-foreground/10 flex items-center justify-center">
          <svg width="8" height="8" viewBox="0 0 8 8" className="text-foreground">
            <path d="M1 7L7 1M7 1H3M7 1V5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>
    </Link>
  );
}

function EmptyPieceTile({ tpl, episodeId, onInit }: {
  tpl: { piece_code: string; piece_name: string; background_color: string; format: string; width_px: number; height_px: number };
  episodeId: string;
  onInit: () => void;
}) {
  return (
    <div className="rounded-lg border border-dashed border-border/50 bg-muted/10 p-3 flex flex-col gap-2 opacity-60">
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs text-muted-foreground">{tpl.piece_code}</span>
        <Badge variant="outline" className="text-[9px] h-4 px-1">sin crear</Badge>
      </div>
      <div
        className="w-full rounded overflow-hidden"
        style={{
          aspectRatio: `${tpl.width_px} / ${tpl.height_px}`,
          backgroundColor: tpl.background_color + "40",
          maxHeight: 120,
        }}
      >
        <div className="w-full h-full flex items-center justify-center">
          <Plus className="h-4 w-4 text-muted-foreground/40" />
        </div>
      </div>
      <p className="text-xs text-muted-foreground/60 leading-snug line-clamp-2">{tpl.piece_name}</p>
    </div>
  );
}

export default function VisualEpisode() {
  const { episodeId } = useParams<{ episodeId: string }>();
  const { data: episode, isLoading: epLoading } = useVisualEpisode(episodeId);
  const { data: pieces  = [], isLoading: piecesLoading } = useEpisodePieces(episodeId);
  const { data: phrases = [] } = useKeyPhrases(episodeId);
  const { data: templates = [] } = useVisualTemplates();

  const updateEpisode   = useUpdateEpisodeVisual();
  const saveKeyPhrases  = useSaveKeyPhrases();
  const initPieces      = useInitEpisodePieces();

  const [thesis, setThesis]   = useState("");
  const [phraseList, setPhraseList] = useState<string[]>(["","","","","",""]);
  const [saving, setSaving]   = useState(false);

  useEffect(() => {
    if (episode?.thesis_central) setThesis(episode.thesis_central);
  }, [episode?.thesis_central]);

  useEffect(() => {
    if (phrases.length > 0) {
      const arr = Array(6).fill("");
      phrases.slice(0,6).forEach((p, i) => { arr[i] = p.phrase; });
      setPhraseList(arr);
    }
  }, [phrases]);

  const handleSave = async () => {
    if (!episodeId) return;
    setSaving(true);
    try {
      await updateEpisode.mutateAsync({ id: episodeId, thesis_central: thesis });
      await saveKeyPhrases.mutateAsync({ episodeId, phrases: phraseList });
      toast.success("Datos guardados");
    } catch {
      toast.error("Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const handleInitPieces = async () => {
    if (!episodeId || !templates.length) return;

    // Build episode context for auto-seeding copy blocks
    const episodeCtx = episode ? {
      episode_number: String(episode.number ?? ""),
      thesis_central: thesis.trim() || episode.thesis_central || "",
      key_phrases:    (phraseList ?? []).filter(Boolean),
    } : undefined;

    await initPieces.mutateAsync({
      episodeId,
      templates: templates.map(t => ({ id: t.id, piece_code: t.piece_code })),
      episodeCtx,
    });
    toast.success("15 piezas inicializadas con frases del episodio");
  };

  if (epLoading || piecesLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!episode) return null;

  const pieceMap = new Map(pieces.map(p => [p.template_id, p]));
  const donePieces = pieces.filter(p => ["aprobado","exportado","publicado"].includes(p.piece_status)).length;
  const pct = Math.round((donePieces / 15) * 100);

  return (
    <div className="flex h-full">
      {/* Left panel — Episode data */}
      <aside className="w-72 shrink-0 border-r border-border flex flex-col">
        <div className="px-4 py-4 border-b border-border">
          <Link
            to="/visual"
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-3 transition-colors"
          >
            <ArrowLeft className="h-3 w-3" /> Visual OS
          </Link>
          <div className="flex items-start gap-2">
            <span className="text-3xl font-black text-foreground/20 leading-none tabular-nums">
              {(episode.number ?? "?").padStart(2,"0")}
            </span>
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-bold leading-snug line-clamp-2">{episode.title}</h2>
              <VisualStatusBadge status={episode.visual_status as any} className="mt-0.5" />
            </div>
          </div>
          <div className="mt-3 space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Progreso visual</span>
              <span className="tabular-nums">{donePieces}/15</span>
            </div>
            <Progress value={pct} className="h-1" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
          {/* Tesis central */}
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1">
              <FileText className="h-3 w-3" /> Tesis central *
            </Label>
            <Textarea
              value={thesis}
              onChange={e => setThesis(e.target.value)}
              placeholder="La verdad núcleo del episodio..."
              className="text-xs resize-none h-20"
            />
          </div>

          {/* Frases clave */}
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1">
              <Zap className="h-3 w-3" /> Frases clave (3–6)
            </Label>
            <div className="space-y-1">
              {phraseList.map((p, i) => (
                <Input
                  key={i}
                  value={p}
                  onChange={e => {
                    const next = [...phraseList];
                    next[i] = e.target.value;
                    setPhraseList(next);
                  }}
                  placeholder={`Frase ${i + 1}...`}
                  className="h-7 text-xs"
                />
              ))}
            </div>
          </div>

          {episode.release_date && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {new Date(episode.release_date).toLocaleDateString("es-EC", {
                weekday: "short", day: "numeric", month: "long",
              })}
            </div>
          )}
        </div>

        {/* Save */}
        <div className="px-4 py-3 border-t border-border space-y-2">
          <Button
            size="sm"
            className="w-full h-8 text-xs"
            disabled={saving}
            onClick={handleSave}
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
            Guardar datos
          </Button>
          {pieces.length < 15 && (
            <Button
              size="sm"
              variant="outline"
              className="w-full h-8 text-xs"
              disabled={initPieces.isPending || !templates.length}
              onClick={handleInitPieces}
            >
              {initPieces.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
              Inicializar {15 - pieces.length} piezas
            </Button>
          )}
        </div>
      </aside>

      {/* Main — 15 pieces grid */}
      <main className="flex-1 overflow-y-auto px-5 py-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <LayoutGrid className="h-4 w-4 text-muted-foreground" />
            15 piezas del sistema
          </h3>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="text-emerald-500 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> {donePieces} aprobadas
            </span>
            <span>· {15 - pieces.length} sin iniciar</span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {templates.map(tpl => {
            const piece = pieceMap.get(tpl.id);
            if (piece) {
              return <PieceTile key={piece.id} piece={piece} episodeId={episodeId!} />;
            }
            return (
              <EmptyPieceTile
                key={tpl.id}
                tpl={tpl}
                episodeId={episodeId!}
                onInit={handleInitPieces}
              />
            );
          })}
        </div>
      </main>
    </div>
  );
}
