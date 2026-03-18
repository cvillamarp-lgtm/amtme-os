import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Image, Download, CheckCircle2, Trash2 } from "lucide-react";
import type { VisualPiece } from "@/lib/visual-templates";

interface AssetItem {
  pieceId: number;
  imageUrl?: string;
  caption?: string;
  hashtags?: string;
  status: string;
}

interface AssetGalleryProps {
  pieces: VisualPiece[];
  assets: Record<number, AssetItem>;
  onApprove: (pieceId: number) => void;
  onDelete: (pieceId: number) => void;
}

export function AssetGallery({ pieces, assets, onApprove, onDelete }: AssetGalleryProps) {
  const assetList = pieces
    .map((p) => ({ piece: p, asset: assets[p.id] }))
    .filter((a) => a.asset?.imageUrl);

  if (assetList.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <Image className="h-10 w-10 mb-3 opacity-30" />
        <p className="text-sm">No hay assets generados todavía</p>
        <p className="text-xs mt-1">Genera imágenes en la pestaña Piezas</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {assetList.map(({ piece, asset }) => {
        const statusLabel = {
          pending: "Pendiente",
          generated: "Generada",
          approved: "Aprobada",
          published: "Publicada",
        }[asset.status] || asset.status;

        return (
          <Card key={piece.id} className="overflow-hidden">
            <div className="rounded-t-lg overflow-hidden border-b border-border">
              <AspectRatio ratio={1}>
                <img
                  src={asset.imageUrl}
                  alt={piece.name}
                  className="w-full h-full object-cover"
                />
              </AspectRatio>
            </div>
            <CardContent className="p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium truncate">{piece.shortName}</span>
                <Badge variant="secondary" className="text-xs">{statusLabel}</Badge>
              </div>
              {asset.caption && (
                <p className="text-xs text-muted-foreground line-clamp-2">{asset.caption}</p>
              )}
              <div className="flex gap-1">
                {asset.status === "generated" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-9 text-xs flex-1"
                    onClick={() => onApprove(piece.id)}
                  >
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Aprobar
                  </Button>
                )}
                <Button size="sm" variant="ghost" className="h-9 w-9 p-0" asChild>
                  <a href={asset.imageUrl} download target="_blank" rel="noopener noreferrer">
                    <Download className="h-3 w-3" />
                  </a>
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-9 w-9 p-0 text-destructive"
                  onClick={() => onDelete(piece.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
