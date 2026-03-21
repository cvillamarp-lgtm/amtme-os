import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Image, FileArchive, Factory } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import JSZip from "jszip";
import type { Tables } from "@/integrations/supabase/types";

interface Asset {
  id: string;
  piece_name: string;
  piece_id: number;
  image_url: string | null;
  caption: string | null;
  hashtags: string | null;
  status: string | null;
}

interface Props {
  episode: Pick<Tables<"episodes">, "id" | "number">;
  assets: Asset[];
}

const statusLabel: Record<string, string> = {
  pending: "Pendiente",
  generated: "Generada",
  approved: "Aprobada",
  published: "Publicada",
};

export function WorkspaceAssets({ episode, assets }: Props) {
  const navigate = useNavigate();

  const goToFactory = () => {
    navigate(`/factory?episode_id=${episode.id}`);
  };

  const exportZip = async () => {
    const withImages = assets.filter((a) => a.image_url);
    if (withImages.length === 0) {
      toast.error("No hay imágenes para exportar");
      return;
    }

    toast.info("Preparando ZIP...");
    const zip = new JSZip();

    for (const asset of withImages) {
      try {
        const response = await fetch(asset.image_url!);
        const blob = await response.blob();
        const ext = asset.image_url!.includes(".png") ? "png" : "jpg";
        zip.file(`${asset.piece_name.replace(/[^a-zA-Z0-9]/g, "_")}.${ext}`, blob);
      } catch {
        console.warn(`Failed to download: ${asset.piece_name}`);
      }
    }

    const captionsText = assets
      .filter((a) => a.caption || a.hashtags)
      .map((a) => `--- ${a.piece_name} ---\n${a.caption || ""}\n\n${a.hashtags || ""}`)
      .join("\n\n\n");
    if (captionsText) zip.file("captions.txt", captionsText);

    const content = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(content);
    const a = document.createElement("a");
    a.href = url;
    a.download = `AMTME_Ep${episode.number || "XX"}_assets.zip`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("ZIP descargado");
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{assets.length} piezas vinculadas</p>
        <div className="flex gap-2">
          {assets.length > 0 && (
            <Button variant="outline" size="sm" onClick={exportZip}>
              <FileArchive className="h-3.5 w-3.5 mr-1.5" />
              Exportar ZIP
            </Button>
          )}
          <Button size="sm" onClick={goToFactory}>
            <Factory className="h-3.5 w-3.5 mr-1.5" />
            Producir piezas
          </Button>
        </div>
      </div>

      {assets.length === 0 ? (
        <div className="empty-state py-16">
          <Image className="h-12 w-12 text-muted-foreground/20 mb-3" />
          <p className="text-muted-foreground text-sm">No hay assets generados para este episodio</p>
          <Button variant="outline" className="mt-4" onClick={goToFactory}>Ir a la Fábrica</Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {assets.map((asset) => (
            <div key={asset.id} className="surface overflow-hidden rounded-lg group">
              <AspectRatio ratio={1}>
                {asset.image_url ? (
                  <img src={asset.image_url} alt={asset.piece_name} className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-secondary/30">
                    <Image className="h-6 w-6 text-muted-foreground/30" />
                  </div>
                )}
              </AspectRatio>
              <div className="p-2">
                <p className="text-xs font-medium truncate text-foreground">{asset.piece_name}</p>
                <Badge variant="secondary" className="text-xs mt-1">
                  {statusLabel[asset.status || "pending"] || asset.status}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
