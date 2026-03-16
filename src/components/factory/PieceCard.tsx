import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Image, Loader2, RefreshCw, CheckCircle2, Copy, Check, Download } from "lucide-react";
import { toast } from "sonner";
import { invokeEdgeFunction } from "@/services/functions/invokeEdgeFunction";
import type { VisualPiece, EpisodeInput } from "@/lib/visual-templates";
import { buildPiecePrompt } from "@/lib/visual-templates";

interface PieceCardProps {
  piece: VisualPiece;
  copyLines: string[];
  episodeInput: EpisodeInput;
  imageUrl?: string;
  status?: string;
  onImageGenerated: (pieceId: number, imageUrl: string, prompt: string) => void;
  onCopyChange: (pieceId: number, lineIndex: number, value: string) => void;
}

export function PieceCard({
  piece,
  copyLines,
  episodeInput,
  imageUrl,
  status = "pending",
  onImageGenerated,
  onCopyChange,
}: PieceCardProps) {
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const generateImage = async () => {
    setGenerating(true);
    try {
      const prompt = buildPiecePrompt(piece, episodeInput, copyLines);
      const data = await invokeEdgeFunction<{ imageUrl?: string }>(
        "generate-image",
        { prompt, hostReference: piece.hostReference }
      );
      if (data?.imageUrl) {
        onImageGenerated(piece.id, data.imageUrl, prompt);
        toast.success(`Imagen generada: ${piece.shortName}`);
      } else {
        throw new Error("No se recibió imagen");
      }
    } catch (e: any) {
      toast.error(e.message);
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
            <span className="text-sm font-medium truncate">{piece.shortName}</span>
            <Badge variant="outline" className="text-[10px]">{piece.format}</Badge>
          </div>
          <Badge variant="secondary" className={`text-[10px] ${statusColor}`}>
            {status === "pending" ? "Pendiente" : status === "generated" ? "Generada" : status === "approved" ? "Aprobada" : "Publicada"}
          </Badge>
        </div>

        {/* Image preview or placeholder */}
        <div className="rounded-md overflow-hidden border border-border bg-secondary/30">
          <AspectRatio ratio={aspectRatio}>
            {imageUrl ? (
              <img src={imageUrl} alt={piece.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Image className="h-8 w-8 text-muted-foreground/30" />
              </div>
            )}
          </AspectRatio>
        </div>

        {/* Editable copy */}
        <div className="space-y-1.5">
          {copyLines.slice(0, 3).map((line, i) => (
            <Input
              key={`${piece.id}-${i}`}
              value={line}
              onChange={(e) => onCopyChange(piece.id, i, e.target.value)}
              className="h-7 text-xs font-mono"
              placeholder={piece.copyTemplate[i] || "..."}
            />
          ))}
        </div>

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
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" asChild>
              <a href={imageUrl} download target="_blank" rel="noopener noreferrer">
                <Download className="h-3 w-3" />
              </a>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
