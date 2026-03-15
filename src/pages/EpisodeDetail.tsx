import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { ArrowLeft, Factory, Mic, Image, Calendar, ExternalLink, Download, FileArchive } from "lucide-react";
import { toast } from "sonner";
import JSZip from "jszip";

const PRODUCTION_STEPS = [
  { key: "script", label: "Guión", field: "script_status" },
  { key: "recording", label: "Grabación", field: "recording_status" },
  { key: "editing", label: "Edición", field: "editing_status" },
  { key: "distribution", label: "Distribución", field: "distribution_status" },
] as const;

const statusLabel: Record<string, string> = {
  pending: "Pendiente",
  in_progress: "En progreso",
  completed: "Completado",
  published: "Publicado",
  draft: "Borrador",
  recording: "Grabando",
  editing: "Editando",
};

const assetStatusLabel: Record<string, string> = {
  pending: "Pendiente",
  generated: "Generada",
  approved: "Aprobada",
  published: "Publicada",
};

export default function EpisodeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: episode, isLoading } = useQuery({
    queryKey: ["episode", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("episodes")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: assets = [] } = useQuery({
    queryKey: ["episode-assets", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content_assets")
        .select("*")
        .eq("episode_id", id!)
        .order("piece_id", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const productionProgress = () => {
    if (!episode) return 0;
    const completed = PRODUCTION_STEPS.filter(
      (s) => (episode as any)[s.field] === "completed"
    ).length;
    return Math.round((completed / PRODUCTION_STEPS.length) * 100);
  };

  const assetProgress = () => {
    if (assets.length === 0) return 0;
    const done = assets.filter((a) => a.status === "approved" || a.status === "published").length;
    return Math.round((done / assets.length) * 100);
  };

  const goToFactory = () => {
    if (!episode) return;
    const params = new URLSearchParams();
    if (episode.number) params.set("number", episode.number);
    if (episode.title) params.set("title", episode.title);
    if (episode.theme) params.set("theme", episode.theme);
    if (episode.summary) params.set("script", episode.summary);
    if (episode.hook) params.set("hook", episode.hook);
    if (episode.quote) params.set("quote", episode.quote);
    if (episode.cta) params.set("cta", episode.cta);
    params.set("episode_id", episode.id);
    navigate(`/factory?${params.toString()}`);
  };

  const exportZip = async () => {
    const withImages = assets.filter((a) => a.image_url);
    if (withImages.length === 0) {
      toast.error("No hay imágenes para exportar");
      return;
    }

    toast.info("Preparando ZIP...");
    const zip = new JSZip();

    // Download images
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

    // Add captions text file
    const captionsText = assets
      .filter((a) => a.caption || a.hashtags)
      .map((a) => `--- ${a.piece_name} ---\n${a.caption || ""}\n\n${a.hashtags || ""}`)
      .join("\n\n\n");
    if (captionsText) {
      zip.file("captions.txt", captionsText);
    }

    const content = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(content);
    const a = document.createElement("a");
    a.href = url;
    a.download = `AMTME_Ep${episode?.number || "XX"}_assets.zip`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("ZIP descargado");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!episode) {
    return (
      <div className="page-container">
        <p className="text-muted-foreground">Episodio no encontrado</p>
        <Button variant="ghost" onClick={() => navigate("/episodes")}>Volver</Button>
      </div>
    );
  }

  const progress = productionProgress();
  const assetProg = assetProgress();

  return (
    <div className="page-container animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate("/episodes")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {episode.number && (
              <Badge variant="outline" className="text-xs font-mono">#{episode.number}</Badge>
            )}
            <h1 className="text-xl font-display font-bold text-foreground truncate">{episode.title}</h1>
          </div>
          {episode.theme && (
            <p className="text-sm text-muted-foreground mt-1">{episode.theme}</p>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          {assets.length > 0 && (
            <Button variant="outline" size="sm" onClick={exportZip}>
              <FileArchive className="h-3.5 w-3.5 mr-1.5" />
              Exportar ZIP
            </Button>
          )}
          <Button size="sm" onClick={goToFactory}>
            <Factory className="h-3.5 w-3.5 mr-1.5" />
            Producir
          </Button>
        </div>
      </div>

      {/* Progress Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="surface p-5 space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-medium text-foreground">Producción</h3>
            <span className="text-xs text-muted-foreground">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
          <div className="grid grid-cols-2 gap-2">
            {PRODUCTION_STEPS.map((step) => {
              const val = (episode as any)[step.field] || "pending";
              const isDone = val === "completed";
              return (
                <div key={step.key} className={`text-xs px-2.5 py-1.5 rounded-md border ${isDone ? "bg-primary/10 text-primary border-primary/20" : "bg-muted text-muted-foreground border-border"}`}>
                  {step.label}: {statusLabel[val] || val}
                </div>
              );
            })}
          </div>
        </div>

        <div className="surface p-5 space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-medium text-foreground">Assets visuales</h3>
            <span className="text-xs text-muted-foreground">{assets.length} piezas · {assetProg}% listas</span>
          </div>
          <Progress value={assetProg} className="h-2" />
          <div className="flex gap-2 flex-wrap">
            {["generated", "approved", "published", "pending"].map((s) => {
              const count = assets.filter((a) => a.status === s).length;
              if (count === 0) return null;
              return (
                <Badge key={s} variant="secondary" className="text-[10px]">
                  {assetStatusLabel[s] || s}: {count}
                </Badge>
              );
            })}
          </div>
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {episode.release_date && (
          <div className="surface p-4 flex items-center gap-3">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Lanzamiento</p>
              <p className="text-sm font-medium text-foreground">{episode.release_date}</p>
            </div>
          </div>
        )}
        {episode.duration && (
          <div className="surface p-4 flex items-center gap-3">
            <Mic className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Duración</p>
              <p className="text-sm font-medium text-foreground">{episode.duration}</p>
            </div>
          </div>
        )}
        {episode.link_spotify && (
          <div className="surface p-4 flex items-center gap-3">
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Spotify</p>
              <a href={episode.link_spotify} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline truncate block">
                Escuchar
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Summary */}
      {episode.summary && (
        <div className="surface p-5 mb-6">
          <h3 className="text-sm font-medium text-foreground mb-2">Resumen</h3>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{episode.summary}</p>
        </div>
      )}

      {/* Assets Grid */}
      {assets.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-foreground">Piezas generadas</h3>
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
                  <p className="text-[10px] font-medium truncate text-foreground">{asset.piece_name}</p>
                  <Badge variant="secondary" className="text-[9px] mt-1">
                    {assetStatusLabel[asset.status || "pending"] || asset.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}