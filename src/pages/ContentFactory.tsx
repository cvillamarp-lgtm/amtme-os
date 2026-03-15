import { useState, useMemo, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sparkles, Loader2, Layers, Download, MessageSquare, FolderOpen, Zap,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  VISUAL_PIECES, buildPiecePrompt, type EpisodeInput,
} from "@/lib/visual-templates";
import { PieceCard } from "@/components/factory/PieceCard";
import { CaptionEditor } from "@/components/factory/CaptionEditor";
import { AssetGallery } from "@/components/factory/AssetGallery";
import { ProgressTracker } from "@/components/factory/ProgressTracker";
import { PieceSelector } from "@/components/factory/PieceSelector";
import { useContentProduction } from "@/hooks/useContentProduction";
import type { Tables } from "@/integrations/supabase/types";

export default function ContentFactory() {
  const [searchParams] = useSearchParams();

  // Input state
  const [epNumber, setEpNumber] = useState("");
  const [title, setTitle] = useState("");
  const [theme, setTheme] = useState("");
  const [script, setScript] = useState("");
  const [episodeId, setEpisodeId] = useState<string | null>(null);

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

  // Production hook
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
  } = useContentProduction();

  // Auto-load from episode
  useEffect(() => {
    const epId = searchParams.get("episode_id");
    if (!epId) return;

    setEpisodeId(epId);

    const loadEpisode = async () => {
      const { data, error } = await supabase
        .from("episodes")
        .select("*")
        .eq("id", epId)
        .single();
      if (error || !data) return;

      const ep = data as Tables<"episodes">;
      setEpNumber(ep.number || "");
      setTitle(ep.final_title || ep.working_title || ep.title || "");
      setTheme(ep.theme || "");

      const scriptText = ep.script_base || ep.script_generated || "";
      const parts = [
        scriptText ? scriptText : ep.summary ? `Resumen: ${ep.summary}` : "",
        ep.hook ? `Hook: ${ep.hook}` : "",
        ep.quote ? `Quote: ${ep.quote}` : "",
        ep.cta ? `CTA: ${ep.cta}` : "",
      ].filter(Boolean);
      if (parts.length) setScript(parts.join("\n\n"));
    };

    loadEpisode();
  }, [searchParams]);

  // UI state
  const [tab, setTab] = useState("input");

  const episodeInput: EpisodeInput = useMemo(
    () => ({
      number: epNumber || "XX",
      thesis: extraction?.thesis || "",
      keyPhrases: extraction?.keyPhrases || [],
    }),
    [epNumber, extraction]
  );

  const handleExtract = () => extractContent(script, title, theme, epNumber).then((r) => {
    if (r) setTab("pieces");
  });

  const handleGenerateCaptions = () => {
    generateCaptions(title, epNumber).then(() => setTab("captions"));
  };

  const handleProduceAll = async () => {
    await produceAll(script, title, theme, epNumber, episodeId, selectedPieces);
    await saveToDatabase(episodeId);
    setTab("library");
    toast.success("Producción completa");
  };

  const generatedCount = Object.values(assets).filter((a) => a.imageUrl).length;
  const captionCount = Object.values(assets).filter((a) => a.caption).length;

  return (
    <div className="page-container animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">Fábrica de Contenido</h1>
          <p className="page-subtitle">
            Guión → Piezas → Imágenes → Captions → Publicar
          </p>
        </div>
        <div className="flex gap-2">
          {extraction && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => saveToDatabase(episodeId)}
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
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-sm">Datos del Episodio</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>N° Episodio</Label>
                  <Input
                    value={epNumber}
                    onChange={(e) => setEpNumber(e.target.value)}
                    placeholder="Ej: 29"
                    maxLength={4}
                  />
                </div>
                <div>
                  <Label>Título</Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ej: El ansioso se apaga"
                  />
                </div>
                <div>
                  <Label>Tema / Tesis</Label>
                  <Textarea
                    value={theme}
                    onChange={(e) => setTheme(e.target.value)}
                    placeholder="La verdad núcleo del episodio..."
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

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
                    onImageGenerated={handleImageGenerated}
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
