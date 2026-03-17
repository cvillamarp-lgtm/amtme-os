import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Copy, Check, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface AssetPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset: {
    piece_name: string;
    image_url: string | null;
    caption: string | null;
    hashtags: string | null;
    status: string | null;
  } | null;
}

export function AssetPreviewModal({ open, onOpenChange, asset }: AssetPreviewModalProps) {
  const [copied, setCopied] = useState(false);

  if (!asset) return null;

  const copyAll = () => {
    const text = [asset.caption, asset.hashtags].filter(Boolean).join("\n\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Caption y hashtags copiados");
    setTimeout(() => setCopied(false), 2000);
  };

  const statusLabel: Record<string, string> = {
    pending: "Pendiente",
    generated: "Generada",
    approved: "Aprobada",
    published: "Publicada",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden">
        <VisuallyHidden><DialogTitle>{asset.piece_name}</DialogTitle></VisuallyHidden>
        <div className="relative">
          {asset.image_url && (
            <img
              src={asset.image_url}
              alt={asset.piece_name}
              className="w-full max-h-[60vh] object-contain bg-secondary/30"
            />
          )}
        </div>
        <div className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-sm">{asset.piece_name}</h3>
            <Badge variant="secondary">
              {statusLabel[asset.status || "pending"] || asset.status}
            </Badge>
          </div>
          {asset.caption && (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{asset.caption}</p>
          )}
          {asset.hashtags && (
            <p className="text-xs text-primary/70 break-all">{asset.hashtags}</p>
          )}
          <div className="flex gap-2 pt-2">
            {(asset.caption || asset.hashtags) && (
              <Button size="sm" variant="outline" onClick={copyAll}>
                {copied ? <Check className="h-3.5 w-3.5 mr-1.5" /> : <Copy className="h-3.5 w-3.5 mr-1.5" />}
                {copied ? "Copiado" : "Copiar caption"}
              </Button>
            )}
            {asset.image_url && (
              <Button size="sm" variant="outline" asChild>
                <a href={asset.image_url} download target="_blank" rel="noopener noreferrer">
                  <Download className="h-3.5 w-3.5 mr-1.5" />
                  Descargar
                </a>
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
