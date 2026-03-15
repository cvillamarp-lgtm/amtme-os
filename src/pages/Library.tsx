import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Image, Download, CheckCircle2, Trash2, Search, Filter, Copy, Check, FileArchive } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AssetPreviewModal } from "@/components/library/AssetPreviewModal";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import JSZip from "jszip";

interface ContentAsset {
  id: string;
  piece_id: number;
  piece_name: string;
  image_url: string | null;
  caption: string | null;
  hashtags: string | null;
  status: string | null;
  created_at: string;
  episode_id: string | null;
}

export default function Library() {
  const qc = useQueryClient();
  const [assets, setAssets] = useState<ContentAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [episodeFilter, setEpisodeFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [previewAsset, setPreviewAsset] = useState<ContentAsset | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const { data: episodes = [] } = useQuery({
    queryKey: ["library-episodes"],
    queryFn: async () => {
      const { data } = await supabase.from("episodes").select("id, title, number").order("created_at", { ascending: false });
      return (data || []) as { id: string; title: string; number: string | null }[];
    },
  });

  const fetchAssets = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("content_assets")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Error cargando biblioteca");
      console.error(error);
    } else {
      setAssets((data as any) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAssets();
  }, []);

  const updateStatus = async (id: string, status: string) => {
    const episodeId = assets.find((a) => a.id === id)?.episode_id;
    const { error } = await supabase
      .from("content_assets")
      .update({ status } as any)
      .eq("id", id);
    if (error) {
      toast.error("Error actualizando estado");
    } else {
      setAssets((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
      if (episodeId) qc.invalidateQueries({ queryKey: ["episode-assets", episodeId] });
      toast.success("Estado actualizado");
    }
  };

  const deleteAsset = async (id: string) => {
    const episodeId = assets.find((a) => a.id === id)?.episode_id;
    const { error } = await supabase.from("content_assets").delete().eq("id", id);
    if (error) {
      toast.error("Error eliminando asset");
    } else {
      setAssets((prev) => prev.filter((a) => a.id !== id));
      if (episodeId) qc.invalidateQueries({ queryKey: ["episode-assets", episodeId] });
      toast.success("Asset eliminado");
    }
  };

  const copyCaption = (asset: ContentAsset) => {
    const text = [asset.caption, asset.hashtags].filter(Boolean).join("\n\n");
    navigator.clipboard.writeText(text);
    setCopiedId(asset.id);
    toast.success("Caption copiado");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const exportFilteredZip = async () => {
    const withImages = filtered.filter((a) => a.image_url);
    if (withImages.length === 0) return toast.error("No hay imágenes para exportar");

    setExporting(true);
    toast.info("Preparando ZIP...");
    const zip = new JSZip();

    for (const asset of withImages) {
      try {
        const res = await fetch(asset.image_url!);
        const blob = await res.blob();
        const ext = asset.image_url!.includes(".png") ? "png" : "jpg";
        zip.file(`${asset.piece_name.replace(/[^a-zA-Z0-9]/g, "_")}.${ext}`, blob);
      } catch { /* skip */ }
    }

    const captionsText = filtered
      .filter((a) => a.caption || a.hashtags)
      .map((a) => `--- ${a.piece_name} ---\n${a.caption || ""}\n\n${a.hashtags || ""}`)
      .join("\n\n\n");
    if (captionsText) zip.file("captions.txt", captionsText);

    const content = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(content);
    const a = document.createElement("a");
    a.href = url;
    a.download = `AMTME_assets_${new Date().toISOString().slice(0, 10)}.zip`;
    a.click();
    URL.revokeObjectURL(url);
    setExporting(false);
    toast.success("ZIP descargado");
  };

  const filtered = assets.filter((a) => {
    if (filter !== "all" && a.status !== filter) return false;
    if (episodeFilter !== "all" && a.episode_id !== episodeFilter) return false;
    if (search && !a.piece_name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const statusLabel: Record<string, string> = {
    pending: "Pendiente",
    generated: "Generada",
    approved: "Aprobada",
    published: "Publicada",
  };

  return (
    <div className="page-container animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">Biblioteca de Assets</h1>
          <p className="page-subtitle">Todos tus assets generados en un solo lugar</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{assets.length} assets</Badge>
          <Button variant="outline" size="sm" onClick={exportFilteredZip} disabled={exporting || filtered.length === 0}>
            <FileArchive className="h-3.5 w-3.5 mr-1.5" />
            Exportar ZIP
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar pieza..."
            className="pl-9"
          />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[160px]">
            <Filter className="h-3.5 w-3.5 mr-1.5" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pending">Pendientes</SelectItem>
            <SelectItem value="generated">Generados</SelectItem>
            <SelectItem value="approved">Aprobados</SelectItem>
            <SelectItem value="published">Publicados</SelectItem>
          </SelectContent>
        </Select>
        <Select value={episodeFilter} onValueChange={setEpisodeFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Episodio" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los episodios</SelectItem>
            {episodes.map((ep) => (
              <SelectItem key={ep.id} value={ep.id}>
                {ep.number ? `#${ep.number} — ` : ""}{ep.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Image className="h-10 w-10 mb-3 opacity-30" />
          <p className="text-sm">No hay assets{filter !== "all" ? ` con estado "${statusLabel[filter]}"` : ""}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filtered.map((asset) => (
            <Card key={asset.id} className="overflow-hidden group cursor-pointer" onClick={() => setPreviewAsset(asset)}>
              <div className="rounded-t-lg overflow-hidden border-b border-border">
                <AspectRatio ratio={1}>
                  {asset.image_url ? (
                    <img src={asset.image_url} alt={asset.piece_name} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-secondary/30">
                      <Image className="h-8 w-8 text-muted-foreground/30" />
                    </div>
                  )}
                </AspectRatio>
              </div>
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium truncate">{asset.piece_name}</span>
                  <Badge variant="secondary" className="text-[10px]">
                    {statusLabel[asset.status || "pending"] || asset.status}
                  </Badge>
                </div>
                {asset.caption && (
                  <p className="text-[10px] text-muted-foreground line-clamp-2">{asset.caption}</p>
                )}
                <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                  {asset.status === "generated" && (
                    <Button size="sm" variant="outline" className="h-7 text-[10px] flex-1" onClick={() => updateStatus(asset.id, "approved")}>
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Aprobar
                    </Button>
                  )}
                  {asset.status === "approved" && (
                    <Button size="sm" variant="outline" className="h-7 text-[10px] flex-1" onClick={() => updateStatus(asset.id, "published")}>
                      Publicar
                    </Button>
                  )}
                  {asset.caption && (
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => copyCaption(asset)}>
                      {copiedId === asset.id ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  )}
                  {asset.image_url && (
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" asChild>
                      <a href={asset.image_url} download target="_blank" rel="noopener noreferrer">
                        <Download className="h-3 w-3" />
                      </a>
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => deleteAsset(asset.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AssetPreviewModal
        open={!!previewAsset}
        onOpenChange={(open) => !open && setPreviewAsset(null)}
        asset={previewAsset}
      />
    </div>
  );
}