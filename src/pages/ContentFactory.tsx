import { useState, useMemo, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sparkles, Loader2, Layers, Download, MessageSquare, FolderOpen, Zap,
  ExternalLink, Info, SwitchCamera, User, UserX, ImagePlay,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  VISUAL_PIECES, type EpisodeInput,
} from "@/lib/visual-templates";
import { PieceCard } from "@/components/factory/PieceCard";
import { CaptionEditor } from "@/components/factory/CaptionEditor";
import { AssetGallery } from "@/components/factory/AssetGallery";
import { ProgressTracker } from "@/components/factory/ProgressTracker";
import { PieceSelector } from "@/components/factory/PieceSelector";
import { useContentProduction } from "@/hooks/useContentProduction";
import { useEpisodes } from "@/hooks/useEpisode";
import type { Tables } from "@/integrations/supabase/types";

// ─── Episode context helpers ──────────────────────────────────────────────────

function buildScriptFromEpisode(ep: Tables<"episodes">): string {
  const scriptText = ep.script_base || ep.script_generated || "";
  const parts = [
    scriptText || (ep.summary ? `Resumen: ${ep.summary}` : ""),
    ep.hook ? `Hook: ${ep.hook}` : "",
    ep.quote ? `Quote: ${ep.quote}` : "",
    ep.cta ? `CTA: ${ep.cta}` : "",
  ].filter(Boolean);
  return parts.join("\n\n");
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function EpisodeContextPanel({
  episode,
  onChangeEpisode,
}: {
  episode: Tables<"episodes">;
  onChangeEpisode: () => void;
}) {
  const displayTitle = episode.final_title || episode.working_title || episode.title || "Sin título";
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50 border border-border text-sm">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {episode.number && (
            <Badge variant="outline" className="text-xs font-mono shrink-0">#{episode.number}</Badge>
          )}
          <span className="font-medium truncate">{displayTitle}</span>
        </div>
        {episode.theme && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{episode.theme}</p>
        )}
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <Button variant="ghost" size="sm" className="h-9 text-xs gap-1" asChild>
          <Link to={`/episodes/${episode.id}`}>
            <ExternalLink className="h-3 w-3" />
            Workspace
          </Link>
        </Button>
        <Button variant="outline" size="sm" className="h-9 text-xs gap-1" onClick={onChangeEpisode}>
          <SwitchCamera className="h-3 w-3" />
          Cambiar
        </Button>
      </div>
    </div>
  );
}

function EpisodeSelectorPanel({
  onSelect,
}: {
  onSelect: (episodeId: string) => void;
}) {
  const { data: episodes, isLoading } = useEpisodes();

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50 border border-border text-sm">
      <Info className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
      <div className="flex-1 min-w-0">
        <p className="text-muted-foreground mb-2">
          Selecciona un episodio para cargar sus datos automáticamente, o escribe el guión manualmente.
        </p>
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Select onValueChange={onSelect}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Seleccionar episodio..." />
            </SelectTrigger>
            <SelectContent>
              {(episodes || []).map((ep) => (
                <SelectItem key={ep.id} value={ep.id} className="text-xs">
                  {ep.number ? `#${ep.number} · ` : ""}{ep.final_title || ep.working_title || ep.title || ep.id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ContentFactory() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const episodeId = searchParams.get("episode_id") ?? undefined;

  // Load episode from DB (single source of truth)
  const { data: episode, isLoading: episodeLoading } = useQuery({
    queryKey: ["episode", episodeId],
    queryFn: async () => {
      if (!episodeId) return null;
      const { data, error } = await supabase
        .from("episodes")
        .select("*")
        .eq("id", episodeId)
        .single();
      if (error) throw error;
      return data as Tables<"episodes">;
    },
    enabled: !!episodeId,
  });

  // Derive read-only context from the loaded episode
  const epNumber = episode?.number ?? "";
  const title = episode?.final_title ?? episode?.working_title ?? episode?.title ?? "";
  const theme = episode?.theme ?? "";

  // Script: auto-populated from episode, but remains editable as working context
  const [script, setScript] = useState("");
  const [scriptInitialized, setScriptInitialized] = useState(false);

  useEffect(() => {
    if (episode && !scriptInitialized) {
      const built = buildScriptFromEpisode(episode);
      if (built) {
        setScript(built);
        setScriptInitialized(true);
      }
    }
    // Reset when episode changes
    if (!episodeId) {
      setScript("");
      setScriptInitialized(false);
    }
  }, [episode, episodeId, scriptInitialized]);

  // Piece selector
  const [selectedPieces, setSelectedPieces] = useState<Set<number>>(
    () => new Set(VISUAL_PIECES.map((p) => p.id))
  );

  const togglePiece = useCallback((id: number) => {
    setSelectedPieces((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAllPieces = useCallback(() => {
    setSelectedPieces(new Set(VISUAL_PIECES.map((p) => p.id)));
  }, []);

  const selectNoPieces = useCallback(() => {
    setSelectedPieces(new Set());
  }, []);

  // Production hook — pass episodeId so saved assets are loaded on mount automatically
  const {
    extraction,
    pieceCopy,
    assets,
    loading,
    producing,
    prodStep,
    prodCurrent,
    prodTotal,
    extractContent,
    handleImageGenerated,
    updatePieceCopy,
    handleCaptionChange,
    approveAsset,
    deleteAsset,
    generateCaptions,
    saveToDatabase,
    produceAll,
  } = useContentProduction(episodeId);

  // UI state
  const [tab, setTab] = useState("input");
  const [includeHost, setIncludeHost] = useState(true);

  // Jump to pieces tab when data is restored from DB
  useEffect(() => {
    if (extraction) setTab("pieces");
  }, [extraction]);

  // Build episode context — prefer AI extraction, fall back to episode DB fields
  const thesis     = extraction?.thesis     || episode?.thesis_central || episode?.hook    || "";
  const keyPhrases = extraction?.keyPhrases || (
    [episode?.hook, episode?.quote, episode?.cta].filter(Boolean) as string[]
  );

  const episodeInput: EpisodeInput = useMemo(
    () => ({
      number:     epNumber || "XX",
      thesis,
      keyPhrases,
    }),
    [epNumber, thesis, keyPhrases]  
  );

  const handleExtract = () =>
    extractContent(script, title, theme, epNumber, episodeId).then((r) => {
      if (r) setTab("pieces");
    });

  const handleGenerateCaptions = () => {
    generateCaptions(title, epNumber).then(() => setTab("captions"));
  };

  const handleProduceAll = async () => {
    await produceAll(script, title, theme, epNumber, episodeId ?? null, selectedPieces);
    await saveToDatabase(episodeId ?? null);
    setTab("library");
    toast.success("Producción completa");
  };

  const handleSelectEpisode = (id: string) => {
    setScriptInitialized(false);
    navigate(`/factory?episode_id=${id}`, { replace: true });
  };

  const handleChangeEpisode = () => {
    navigate("/factory", { replace: true });
    setScript("");
    setScriptInitialized(false);
  };

  // Wrap handleImageGenerated to always pass the current episodeId
  const handleImageGeneratedWithEpisode = useCallback(
    (pieceId: number, imageUrl: string, prompt: string) =>
      handleImageGenerated(pieceId, imageUrl, prompt, episodeId ?? null),
    [handleImageGenerated, episodeId],
  );

  const generatedCount = Object.values(assets).filter((a) => a.imageUrl).length;
  const captionCount = Object.values(assets).filter((a) => a.caption).length;

  return (
    <div className="page-container animate-fade-in">

      {/* ── Visual OS upgrade banner ───────────────────────────────────────── */}
      <div className="flex items-center gap-3 rounded-lg border border-[#193497]/40 bg-[#193497]/10 px-4 py-3 mb-1">
        <div
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
          style={{ backgroundColor: "#193497" }}
        >
          <ImagePlay className="h-4 w-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">Visual OS disponible</p>
          <p className="text-xs text-muted-foreground">
            Sistema nuevo con editor por pieza, validaciones, auto-fill, historial y exportación.
          </p>
        </div>
        {episodeId ? (
          <Button size="sm" className="shrink-0 h-8 text-xs" style={{ backgroundColor: "#193497" }} asChild>
            <Link to={`/visual/episode/${episodeId}`}>
              Abrir Visual OS →
            </Link>
          </Button>
        ) : (
          <Button size="sm" variant="outline" className="shrink-0 h-8 text-xs" asChild>
            <Link to="/visual">Ir a Visual OS →</Link>
          </Button>
        )}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">Fábrica de Contenido</h1>
          <p className="page-subtitle">
            Guión → Piezas → Imágenes → Captions → Publicar
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {/* Host photo toggle */}
          <Button
            variant={includeHost ? "secondary" : "outline"}
            size="sm"
            onClick={() => setIncludeHost((v) => !v)}
            title={includeHost ? "Click para generar sin foto del host" : "Click para incluir foto del host"}
          >
            {includeHost
              ? <><User className="h-3.5 w-3.5 mr-1.5" />Con foto</>
              : <><UserX className="h-3.5 w-3.5 mr-1.5" />Sin foto</>
            }
          </Button>
          {extraction && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => saveToDatabase(episodeId ?? null)}
                disabled={producing}
              >
                <Download className="h-3.5 w-3.5 mr-1.5" />
                Guardar assets
              </Button>
              <Button
                size="sm"
                onClick={handleProduceAll}
                disabled={producing || loading}
              >
                <Zap className="h-3.5 w-3.5 mr-1.5" />
                Producir {selectedPieces.size < VISUAL_PIECES.length ? `(${selectedPieces.size})` : "Todo"}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Episode context / selector */}
      {episodeLoading ? (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/50 border border-border text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Cargando episodio...
        </div>
      ) : episode ? (
        <EpisodeContextPanel episode={episode} onChangeEpisode={handleChangeEpisode} />
      ) : (
        <EpisodeSelectorPanel onSelect={handleSelectEpisode} />
      )}

      {/* Piece selector */}
      {extraction && (
        <PieceSelector
          pieces={VISUAL_PIECES}
          selected={selectedPieces}
          onToggle={togglePiece}
          onSelectAll={selectAllPieces}
          onSelectNone={selectNoPieces}
        />
      )}

      {/* Progress tracker */}
      <ProgressTracker
        currentStep={prodStep}
        currentPiece={prodCurrent}
        totalPieces={prodTotal}
        isRunning={producing}
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="input">
            <Sparkles className="h-3.5 w-3.5 mr-1.5" />
            Entrada
          </TabsTrigger>
          <TabsTrigger value="pieces" disabled={!extraction}>
            <Layers className="h-3.5 w-3.5 mr-1.5" />
            Piezas {generatedCount > 0 && `(${generatedCount})`}
          </TabsTrigger>
          <TabsTrigger value="captions" disabled={!extraction}>
            <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
            Captions {captionCount > 0 && `(${captionCount})`}
          </TabsTrigger>
          <TabsTrigger value="library">
            <FolderOpen className="h-3.5 w-3.5 mr-1.5" />
            Biblioteca
          </TabsTrigger>
        </TabsList>

        {/* === INPUT TAB === */}
        <TabsContent value="input">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Episode data: read-only display */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-sm">Datos del Episodio</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {episode ? (
                  <>
                    <div>
                      <Label className="text-xs text-muted-foreground">N° Episodio</Label>
                      <p className="text-sm font-medium mt-1">{epNumber || <span className="text-muted-foreground italic">—</span>}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Título</Label>
                      <p className="text-sm font-medium mt-1">{title || <span className="text-muted-foreground italic">—</span>}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Tema / Tesis</Label>
                      <p className="text-sm mt-1 text-muted-foreground">{theme || <span className="italic">—</span>}</p>
                    </div>
                    <p className="text-xs text-muted-foreground border-t pt-3">
                      Para editar estos datos, usa la pestaña{" "}
                      <Link to={`/episodes/${episode.id}`} className="text-primary hover:underline">
                        Datos base del Workspace
                      </Link>.
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Selecciona un episodio para ver sus datos, o escribe el guión manualmente.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Script: editable working context */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-sm">Guión del Episodio</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  value={script}
                  onChange={(e) => setScript(e.target.value)}
                  placeholder="Pega aquí el guión completo del episodio... La IA extraerá las frases clave, la tesis y generará el copy para las 15 piezas visuales."
                  rows={12}
                  className="font-mono text-xs"
                />
                <div className="flex gap-2">
                  <Button
                    onClick={handleExtract}
                    disabled={loading || producing}
                    className="flex-1"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4 mr-2" />
                    )}
                    {loading ? "Extrayendo..." : "Extraer y generar 15 piezas"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* === PIECES TAB === */}
        <TabsContent value="pieces">
          {extraction && (
            <div className="space-y-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="flex flex-wrap gap-4">
                    <div className="flex-1 min-w-[200px]">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Tesis central</p>
                      <p className="text-sm font-medium">{extraction.thesis}</p>
                    </div>
                    <div className="flex-1 min-w-[200px]">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Frases clave</p>
                      <div className="flex flex-wrap gap-1.5">
                        {extraction.keyPhrases.map((phrase, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">{phrase}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {VISUAL_PIECES.map((piece) => (
                  <PieceCard
                    key={piece.id}
                    piece={piece}
                    copyLines={pieceCopy[String(piece.id)] || piece.copyTemplate}
                    episodeInput={episodeInput}
                    imageUrl={assets[piece.id]?.imageUrl}
                    status={assets[piece.id]?.status || "pending"}
                    onImageGenerated={handleImageGeneratedWithEpisode}
                    includeHost={includeHost}
                    onCopyChange={updatePieceCopy}
                  />
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* === CAPTIONS TAB === */}
        <TabsContent value="captions">
          {extraction && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {captionCount > 0
                    ? `${captionCount} captions generados`
                    : "Genera captions para todas las piezas con IA"}
                </p>
                <Button
                  size="sm"
                  onClick={handleGenerateCaptions}
                  disabled={loading || producing}
                >
                  {loading ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  {captionCount > 0 ? "Regenerar captions" : "Generar captions"}
                </Button>
              </div>

              <ScrollArea className="h-[600px]">
                <div className="space-y-3 pr-4">
                  {VISUAL_PIECES.map((piece) => (
                    <CaptionEditor
                      key={piece.id}
                      piece={piece}
                      imageUrl={assets[piece.id]?.imageUrl}
                      captionData={{
                        caption: assets[piece.id]?.caption || "",
                        hashtags: assets[piece.id]?.hashtags || "",
                      }}
                      onCaptionChange={handleCaptionChange}
                    />
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </TabsContent>

        {/* === LIBRARY TAB === */}
        <TabsContent value="library">
          <AssetGallery
            pieces={VISUAL_PIECES}
            assets={Object.fromEntries(
              Object.entries(assets).map(([k, v]) => [
                Number(k),
                { pieceId: Number(k), ...v },
              ])
            )}
            onApprove={approveAsset}
            onDelete={deleteAsset}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
