import { useState, useEffect, useRef, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Image, Loader2, RefreshCw, Copy, Check, Download } from "lucide-react";
import { TruncatedText } from "@/components/ui/text-clamp";
import { toast } from "sonner";
import { invokeEdgeFunction } from "@/services/functions/invokeEdgeFunction";
import { showEdgeFunctionError } from "@/services/functions/edgeFunctionErrors";
import type { VisualPiece, EpisodeInput } from "@/lib/visual-templates";
import { buildPiecePrompt } from "@/lib/visual-templates";
import { buildLocalComposite, buildCompositeImage } from "@/lib/canvas-text-overlay";
import { env } from "@/lib/env";
import { validatePiece } from "@/lib/piece-validator";
import { ValidationPanel } from "@/components/factory/ValidationPanel";

interface PieceCardProps {
  piece: VisualPiece;
  copyLines: string[];
  episodeInput: EpisodeInput;
  imageUrl?: string;
  status?: string;
  includeHost?: boolean;
  onImageGenerated: (pieceId: number, imageUrl: string, prompt: string) => void;
  onCopyChange: (pieceId: number, lineIndex: number, value: string) => void;
}

export function PieceCard({
  piece,
  copyLines,
  episodeInput,
  imageUrl,
  status = "pending",
  includeHost = true,
  onImageGenerated,
  onCopyChange,
}: PieceCardProps) {
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  // compositeUrl holds the canvas-rendered version (base image + AMTME text overlay).
  // Falls back to raw imageUrl if the browser canvas composite fails.
  const [compositeUrl, setCompositeUrl] = useState<string | undefined>(undefined);
  const compositeRef = useRef<string | undefined>(undefined);

  // Run validator on every relevant change so export button reflects current state.
  const validation = useMemo(
    () => validatePiece(piece, copyLines, episodeInput.number, imageUrl),
    [piece, copyLines, episodeInput.number, imageUrl],
  );

  useEffect(() => {
    if (!imageUrl) { setCompositeUrl(undefined); return; }

    // Always rebuild from the brand system (host photo + solid bg + text).
    // This guarantees Gestalt, hierarchy and brand compliance on every render,
    // regardless of what is stored in the DB.
    buildLocalComposite(piece, copyLines, episodeInput.number, env.VITE_SUPABASE_URL)
      .then((url) => {
        compositeRef.current = url;
        setCompositeUrl(url);
      })
      .catch(() => {
        // Fallback: overlay text on whatever is stored
        buildCompositeImage(imageUrl, copyLines, piece, episodeInput.number).then((url) => {
          compositeRef.current = url;
          setCompositeUrl(url);
        });
      });
  }, [imageUrl, piece.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const generateImage = async () => {
    setGenerating(true);
    try {
      // Build the complete image locally — no AI call needed.
      // Background color + host photo from Supabase Storage + all AMTME text layers.
      const dataUrl = await buildLocalComposite(
        piece,
        copyLines,
        episodeInput.number,
        env.VITE_SUPABASE_URL,
      );
      onImageGenerated(piece.id, dataUrl, "local-composite");
      toast.success(`Imagen generada: ${piece.shortName}`);
    } catch (e: unknown) {
      // Fallback to AI generation if local composite fails
      try {
        const prompt = buildPiecePrompt(piece, episodeInput, copyLines);
        const data = await invokeEdgeFunction<{ imageUrl?: string }>(
          "generate-image",
          { prompt, hostReference: piece.hostReference, pieceId: piece.id, includeHost },
          { timeoutMs: 120_000, maxRetries: 0 }
        );
        if (data?.imageUrl) {
          onImageGenerated(piece.id, data.imageUrl, prompt);
          toast.success(`Imagen generada: ${piece.shortName}`);
        } else {
          throw new Error("No se recibió imagen");
        }
      } catch (e2: unknown) {
        showEdgeFunctionError(e2);
      }
    } finally {
      setGenerating(false);
    }
  };

  const copyPrompt = () => {
    const prompt = buildPiecePrompt(piece, episodeInput, copyLines);
    navigator.clipboard.writeText(prompt);
    setCopied(true);
    toast.success("Prompt copiado");
    setTimeout(() => setCopied(false), 2000);
  };

  const statusColor = {
    pending: "text-muted-foreground",
    generated: "text-primary",
    approved: "text-chart-1",
    published: "text-chart-2",
  }[status] || "text-muted-foreground";

  const aspectRatio = piece.width / piece.height;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-muted-foreground">
              {String(piece.id).padStart(2, "0")}
            </span>
            <TruncatedText className="text-sm font-medium">{piece.shortName}</TruncatedText>
            <Badge variant="outline" className="text-xs">{piece.format}</Badge>
          </div>
          <Badge variant="secondary" className={`text-xs ${statusColor}`}>
            {status === "pending" ? "Pendiente" : status === "generated" ? "Generada" : status === "approved" ? "Aprobada" : "Publicada"}
          </Badge>
        </div>

        {/* Image preview or placeholder */}
        <div className="rounded-md overflow-hidden border border-border bg-secondary/30">
          <AspectRatio ratio={aspectRatio}>
            {imageUrl ? (
              <img
                src={compositeUrl ?? imageUrl}
                alt={piece.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Image className="h-8 w-8 text-muted-foreground/30" />
              </div>
            )}
          </AspectRatio>
        </div>

        {/* Editable copy — placeholders filtered from value, shown as hint */}
        <div className="space-y-1.5">
          {copyLines.slice(0, 3).map((line, i) => {
            const isPlaceholder = /^\[.+\]$/.test((line ?? "").trim());
            return (
              <Input
                key={`${piece.id}-${i}`}
                value={isPlaceholder ? "" : (line ?? "")}
                onChange={(e) => onCopyChange(piece.id, i, e.target.value)}
                className="h-7 text-xs font-mono"
                placeholder={
                  isPlaceholder
                    ? (line ?? "").replace(/^\[|\]$/g, "").toLowerCase()
                    : piece.copyTemplate[i]?.replace(/^\[|\]$/g, "").toLowerCase() || "..."
                }
              />
            );
          })}
        </div>

        {/* Validation */}
        <ValidationPanel result={validation} />

        {/* Actions */}
        <div className="flex gap-1.5">
          <Button
            size="sm"
            variant={imageUrl ? "outline" : "default"}
            className="flex-1 h-8 text-xs"
            onClick={generateImage}
            disabled={generating}
          >
            {generating ? (
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            ) : imageUrl ? (
              <RefreshCw className="h-3 w-3 mr-1" />
            ) : (
              <Image className="h-3 w-3 mr-1" />
            )}
            {generating ? "Generando..." : imageUrl ? "Regenerar" : "Generar"}
          </Button>
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={copyPrompt}>
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          </Button>
          {imageUrl && (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0"
              disabled={!validation.pass}
              title={
                validation.pass
                  ? `Descargar AMTME_Ep${episodeInput.number.padStart(2,"0")}_Pieza${String(piece.id).padStart(2,"0")}_vF.png`
                  : `${validation.criticalFails} error${validation.criticalFails !== 1 ? "es" : ""} crítico${validation.criticalFails !== 1 ? "s" : ""} — corrige antes de exportar`
              }
              onClick={() => {
                if (!validation.pass) return;
                const url = compositeRef.current ?? imageUrl;
                const a = document.createElement("a");
                a.href = url;
                a.download = `AMTME_Ep${episodeInput.number.padStart(2,"0")}_Pieza${String(piece.id).padStart(2,"0")}_vF.png`;
                a.click();
              }}
            >
              <Download className="h-3 w-3" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
