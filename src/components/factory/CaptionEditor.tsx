import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Image } from "lucide-react";
import type { VisualPiece } from "@/lib/visual-templates";

interface CaptionData {
  caption: string;
  hashtags: string;
}

interface CaptionEditorProps {
  piece: VisualPiece;
  imageUrl?: string;
  captionData: CaptionData;
  onCaptionChange: (pieceId: number, field: "caption" | "hashtags", value: string) => void;
}

export function CaptionEditor({ piece, imageUrl, captionData, onCaptionChange }: CaptionEditorProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Preview */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-muted-foreground">
                {String(piece.id).padStart(2, "0")}
              </span>
              <span className="text-sm font-medium">{piece.shortName}</span>
              <Badge variant="outline" className="text-[10px]">{piece.format}</Badge>
            </div>
            <div className="rounded-md overflow-hidden border border-border bg-secondary/30 max-w-[200px]">
              <AspectRatio ratio={piece.width / piece.height}>
                {imageUrl ? (
                  <img src={imageUrl} alt={piece.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Image className="h-6 w-6 text-muted-foreground/30" />
                  </div>
                )}
              </AspectRatio>
            </div>
          </div>

          {/* Caption + Hashtags */}
          <div className="space-y-3">
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Caption</Label>
              <Textarea
                value={captionData.caption}
                onChange={(e) => onCaptionChange(piece.id, "caption", e.target.value)}
                rows={3}
                className="mt-1 text-xs"
                placeholder="Caption para esta pieza..."
              />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Hashtags</Label>
              <Input
                value={captionData.hashtags}
                onChange={(e) => onCaptionChange(piece.id, "hashtags", e.target.value)}
                className="mt-1 text-xs"
                placeholder="#amtme #podcast #psicologia..."
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
