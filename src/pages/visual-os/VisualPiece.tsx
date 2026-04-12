/**
 * VisualPiece — Editor de pieza
 * ──────────────────────────────
 * 3-panel layout:
 *   Left   → piece navigation list (15 pieces)
 *   Center → live preview with safe zones, technical/clean toggle
 *   Right  → copy editor, validation, version history, export, approval
 */
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft, Loader2, Eye, EyeOff, Grid, Save,
  CheckCircle2, History, RefreshCw,
} from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import { useEpisodePieces, useVisualPiece, usePieceCopyBlocks, usePieceVersions, usePieceChangeLog, useSavePieceCopy, useUpdatePieceStatus, useRecordExport, useRestoreVersion, useReseedPieceCopy } from "@/hooks/visual-os/useVisualPieces";
import { useVisualEpisode, useKeyPhrases } from "@/hooks/visual-os/useVisualEpisodes";
import { useTemplateRules } from "@/hooks/visual-os/useVisualTemplates";
import { validateVisualPiece } from "@/lib/visual-os/validator";
import type { CopyBlock, PieceVersion, PieceStatus } from "@/lib/visual-os/types";
import { STATUS_LABELS, nextStatus } from "@/lib/visual-os/types";

import { PiecePreviewCanvas } from "@/components/visual-os/PiecePreviewCanvas";
import { CopyBlockEditor } from "@/components/visual-os/CopyBlockEditor";
import { VOSValidationPanel } from "@/components/visual-os/VOSValidationPanel";
import { VersionHistory } from "@/components/visual-os/VersionHistory";
import { ExportPanel } from "@/components/visual-os/ExportPanel";
import { PieceStatusBadge } from "@/components/visual-os/StatusBadge";

export default function VisualPiece() {
  const { episodeId, pieceId } = useParams<{ episodeId: string; pieceId: string }>();

  const { data: episode }          = useVisualEpisode(episodeId);
  const { data: keyPhrases = [] }  = useKeyPhrases(episodeId);
  const { data: piece }            = useVisualPiece(pieceId);
  const { data: copyBlocksRaw = [] } = usePieceCopyBlocks(pieceId);
  const { data: versions       = [] } = usePieceVersions(pieceId);
  const { data: changelog      = [] } = usePieceChangeLog(pieceId);
  const { data: allPieces      = [] } = useEpisodePieces(episodeId);
  const { data: blockDefs      = [] } = useTemplateRules(piece?.template_id);

  const saveCopy       = useSavePieceCopy();
  const updateStatus   = useUpdatePieceStatus();
  const recordExport   = useRecordExport();
  const restoreVersion = useRestoreVersion();
  const reseedCopy     = useReseedPieceCopy();

  // Local copy state (editable)
  const [localBlocks, setLocalBlocks] = useState<CopyBlock[]>([]);
  const [isDirty, setIsDirty]         = useState(false);
  const [technicalMode, setTechnical] = useState(false);
  const [showGrid, setShowGrid]       = useState(false);
  const [changeReason, setChangeReason] = useState("");
  const [previewUrl, setPreviewUrl]   = useState<string | null>(null);

  // Initialize local blocks from DB whenever the DB data changes
  useEffect(() => {
    if (copyBlocksRaw.length > 0) {
      setLocalBlocks(copyBlocksRaw);
      setIsDirty(false);
    }
  }, [copyBlocksRaw]);

  const handleCopyChange = (blockId: string, value: string) => {
    setLocalBlocks(prev =>
      prev.map(b => b.id === blockId ? { ...b, block_value: value } : b)
    );
    setIsDirty(true);
  };

  const template = piece?.template;
  const epNumber = episode?.number ?? "XX";

  // Validation — runs on every local change
  const validation = useMemo(() => {
    if (!template) return null;
    return validateVisualPiece(template, localBlocks, epNumber, !!previewUrl);
  }, [template, localBlocks, epNumber, previewUrl]);

  const handleSave = async () => {
    if (!pieceId || !validation) return;
    try {
      await saveCopy.mutateAsync({
        pieceId,
        blocks:          localBlocks.map(b => ({ id: b.id, block_name: b.block_name, block_value: b.block_value })),
        changeReason:    changeReason.trim() || undefined,
        validationResult: validation,
      });
      setIsDirty(false);
      setChangeReason("");
      toast.success("Versión guardada");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al guardar");
    }
  };

  const handleReseed = async () => {
    if (!pieceId || !piece?.template?.piece_code || !episode) return;
    try {
      await reseedCopy.mutateAsync({
        pieceId,
        pieceCode:  piece.template.piece_code,
        episodeCtx: {
          episode_number: String(episode.number ?? ""),
          thesis_central: episode.thesis_central ?? "",
          key_phrases:    keyPhrases.map(k => k.phrase).filter(Boolean),
        },
      });
      toast.success("Copy pre-llenado con frases del episodio");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al re-seed");
    }
  };

  const handleStatusChange = async (newStatus: PieceStatus) => {
    if (!pieceId || !episodeId) return;
    if (!validation?.pass && ["aprobado","exportado"].includes(newStatus)) {
      toast.error(`Corrige los errores críticos antes de marcar como ${STATUS_LABELS[newStatus]}`);
      return;
    }
    await updateStatus.mutateAsync({ pieceId, episodeId, status: newStatus });
    toast.success(`Estado: ${STATUS_LABELS[newStatus]}`);
  };

  const handleRestore = async (version: PieceVersion) => {
    if (!pieceId) return;
    await restoreVersion.mutateAsync({ pieceId, version });
    toast.success(`Versión ${version.version_number} restaurada`);
  };

  const handleExportRecorded = async (type: "png"|"jpg"|"json", isFinal: boolean) => {
    if (!pieceId || !piece?.current_version_id || !template) return;
    await recordExport.mutateAsync({
      pieceId,
      versionId:     piece.current_version_id,
      episodeNumber: epNumber,
      pieceCode:     template.piece_code,
      exportType:    type,
      isFinal,
    });
  };

  if (!piece || !template) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const currentStatus = piece.piece_status as PieceStatus;
  const nextSt        = nextStatus(currentStatus);
  return (
    <div className="flex h-full overflow-hidden">

      {/* ── LEFT: Piece list nav ─────────────────────────────────────────── */}
      <aside className="w-52 shrink-0 border-r border-border flex flex-col">
        <div className="px-3 py-3 border-b border-border">
          <Link
            to={`/visual/episode/${episodeId}`}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3 w-3" />
            Ep. {(epNumber).padStart(2,"0")}
          </Link>
        </div>
        <ScrollArea className="flex-1">
          <div className="px-2 py-2 space-y-0.5">
            {allPieces.map(p => {
              const tpl = p.template;
              const isActive = p.id === pieceId;
              return (
                <Link
                  key={p.id}
                  to={`/visual/episode/${episodeId}/piece/${p.id}`}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors",
                    isActive
                      ? "bg-accent text-accent-foreground font-medium"
                      : "hover:bg-muted/50 text-muted-foreground hover:text-foreground",
                  )}
                >
                  <span className="font-mono text-[10px] w-7 shrink-0">{tpl?.piece_code}</span>
                  <span className="truncate flex-1">{tpl?.piece_name?.replace(/^.+— /, "")}</span>
                  <span className={cn(
                    "w-1.5 h-1.5 rounded-full shrink-0",
                    p.piece_status === "aprobado"  ? "bg-emerald-500" :
                    p.piece_status === "exportado" ? "bg-blue-500" :
                    p.piece_status === "borrador"  ? "bg-zinc-500" :
                    "bg-amber-500",
                  )} />
                </Link>
              );
            })}
          </div>
        </ScrollArea>
      </aside>

      {/* ── CENTER: Preview ───────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col overflow-hidden bg-[#0f0f0f]">
        {/* Preview toolbar */}
        <div className="shrink-0 px-4 py-2 border-b border-border/20 flex items-center gap-2">
          <div className="flex-1 flex items-center gap-1.5">
            <span className="text-xs font-mono text-muted-foreground">{template.piece_code}</span>
            <span className="text-xs text-muted-foreground">—</span>
            <span className="text-xs font-medium">{template.piece_name}</span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant={technicalMode ? "secondary" : "ghost"}
              className="h-7 px-2 text-xs gap-1"
              onClick={() => setTechnical(v => !v)}
            >
              {technicalMode ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
              {technicalMode ? "Limpio" : "Técnico"}
            </Button>
            <Button
              size="sm"
              variant={showGrid ? "secondary" : "ghost"}
              className="h-7 px-2 text-xs"
              onClick={() => setShowGrid(v => !v)}
            >
              <Grid className="h-3 w-3" />
            </Button>
          </div>
          <Badge variant="outline" className="text-[10px] font-mono h-5">
            {template.width_px}×{template.height_px}
          </Badge>
        </div>

        {/* Preview */}
        <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
          <PiecePreviewCanvas
            template={template}
            copyBlocks={localBlocks}
            episodeNumber={epNumber}
            technicalMode={technicalMode}
            showGrid={showGrid}
            className="max-h-full max-w-full w-auto"
            onPreviewReady={setPreviewUrl}
          />
        </div>

        {/* Bottom bar */}
        <div className="shrink-0 px-4 py-2 border-t border-border/20 flex items-center gap-3 text-xs text-muted-foreground">
          <span>Safe zones: {template.safe_zone_top}px T · {template.safe_zone_left}px L</span>
          <span>·</span>
          <span>{template.format}</span>
          {isDirty && <span className="text-amber-400 ml-auto">• Cambios sin guardar</span>}
        </div>
      </main>

      {/* ── RIGHT: Editor panel ───────────────────────────────────────────── */}
      <aside className="w-80 shrink-0 border-l border-border flex flex-col overflow-hidden">
        {/* Status header */}
        <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-2">
          <PieceStatusBadge status={currentStatus} />
          {nextSt && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              disabled={updateStatus.isPending}
              onClick={() => handleStatusChange(nextSt)}
            >
              → {STATUS_LABELS[nextSt]}
            </Button>
          )}
        </div>

        <Tabs defaultValue="copy" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="shrink-0 mx-3 mt-3 mb-0 h-8 grid grid-cols-4 text-xs">
            <TabsTrigger value="copy"    className="text-xs">Copy</TabsTrigger>
            <TabsTrigger value="valid"   className="text-xs">Check</TabsTrigger>
            <TabsTrigger value="history" className="text-xs">Versiones</TabsTrigger>
            <TabsTrigger value="export"  className="text-xs">Export</TabsTrigger>
          </TabsList>

          {/* Copy tab */}
          <TabsContent value="copy" className="flex-1 overflow-hidden flex flex-col px-4">
            <ScrollArea className="flex-1 mt-3">
              <CopyBlockEditor
                blocks={localBlocks}
                blockDefs={blockDefs}
                onChange={handleCopyChange}
              />
            </ScrollArea>
            <div className="shrink-0 pt-3 pb-4 space-y-2">
              <Input
                value={changeReason}
                onChange={e => setChangeReason(e.target.value)}
                placeholder="Motivo del cambio (opcional)..."
                className="h-7 text-xs"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs gap-1.5 flex-shrink-0"
                  disabled={reseedCopy.isPending}
                  onClick={handleReseed}
                  title="Pre-llenar campos con la tesis y frases clave del episodio"
                >
                  {reseedCopy.isPending
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <RefreshCw className="h-3.5 w-3.5" />}
                  Auto-fill
                </Button>
                <Button
                  size="sm"
                  className="flex-1 h-8 text-xs gap-1.5"
                  disabled={!isDirty || saveCopy.isPending}
                  onClick={handleSave}
                >
                  {saveCopy.isPending
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <Save className="h-3.5 w-3.5" />}
                  Guardar
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Validation tab */}
          <TabsContent value="valid" className="flex-1 overflow-y-auto px-4 pt-3 pb-4">
            {validation ? (
              <>
                <VOSValidationPanel result={validation} className="mb-3" />
                {/* Quick-fix info for failing críticos */}
                {validation.criticalFails > 0 && (
                  <div className="rounded-md bg-red-500/5 border border-red-500/20 px-3 py-2 text-xs text-red-400 space-y-1">
                    <p className="font-medium">Corrige estos errores para poder aprobar:</p>
                    {validation.checks
                      .filter(c => !c.pass && c.severity === "critico")
                      .map(c => <p key={c.id}>• {c.label}</p>)
                    }
                  </div>
                )}
                {/* Approve button */}
                {currentStatus !== "aprobado" && validation.pass && (
                  <Button
                    size="sm"
                    className="w-full mt-3 h-8 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                    disabled={updateStatus.isPending}
                    onClick={() => handleStatusChange("aprobado")}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Aprobar pieza
                  </Button>
                )}
              </>
            ) : (
              <p className="text-xs text-muted-foreground">Cargando validaciones...</p>
            )}
          </TabsContent>

          {/* Version history tab */}
          <TabsContent value="history" className="flex-1 overflow-hidden flex flex-col px-4 pt-3 pb-4">
            <h4 className="text-xs font-medium mb-2 flex items-center gap-1.5">
              <History className="h-3.5 w-3.5" /> Historial de versiones
            </h4>
            <VersionHistory
              versions={versions}
              currentVersionId={piece.current_version_id}
              onRestore={handleRestore}
              restoring={restoreVersion.isPending}
            />
            {changelog.length > 0 && (
              <>
                <Separator className="my-3" />
                <h4 className="text-xs font-medium mb-2">Actividad reciente</h4>
                <ScrollArea className="flex-1">
                  <div className="space-y-1.5">
                    {changelog.slice(0, 10).map(entry => (
                      <div key={entry.id} className="text-xs text-muted-foreground">
                        <span className="font-medium text-foreground/70">{entry.action_type}</span>
                        {" — "}
                        {entry.change_summary}
                        <p className="text-[10px] opacity-50">
                          {new Date(entry.created_at).toLocaleString("es-EC", {
                            day:"numeric", month:"short", hour:"2-digit", minute:"2-digit"
                          })}
                        </p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </>
            )}
          </TabsContent>

          {/* Export tab */}
          <TabsContent value="export" className="flex-1 overflow-y-auto px-4 pt-3 pb-4">
            {validation && (
              <ExportPanel
                template={template}
                episodeNumber={epNumber}
                previewDataUrl={previewUrl}
                copyBlocks={localBlocks}
                currentVersionId={piece.current_version_id}
                validation={validation}
                onExportRecorded={handleExportRecorded}
              />
            )}
          </TabsContent>
        </Tabs>
      </aside>
    </div>
  );
}
