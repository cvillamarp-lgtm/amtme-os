import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  FileText,
  Database,
  Sparkles,
  Layers,
  Image,
  Globe,
  Shield,
  Plus,
  ExternalLink,
  Activity,
  Zap,
} from "lucide-react";
import { useEpisode } from "@/hooks/useEpisode";
import { useEpisodeOperationalState } from "@/hooks/useEpisodeOperationalState";
import { auditEpisode, getCompletenessLevel } from "@/lib/episode-validation";
import { WorkspaceSummary } from "@/components/workspace/WorkspaceSummary";
import { WorkspaceDataForm } from "@/components/workspace/WorkspaceDataForm";
import { WorkspaceScript } from "@/components/workspace/WorkspaceScript";
import { WorkspaceAudit } from "@/components/workspace/WorkspaceAudit";
import { WorkspaceAssets } from "@/components/workspace/WorkspaceAssets";
import { WorkspaceProduccion } from "@/components/workspace/WorkspaceProduccion";
import { WorkspaceCopilot } from "@/components/workspace/WorkspaceCopilot";
import { NextActionBanner } from "@/components/workspace/NextActionBanner";

export default function EpisodeWorkspace() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { episode, isLoading, assets, tasks, updateEpisode } = useEpisode(id);
  const operationalState = useEpisodeOperationalState(id);
  const [activeTab, setActiveTab] = useState("summary");

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

  const audit = auditEpisode(episode);
  const level = getCompletenessLevel(audit.healthScore);

  const handleSave = async (updates: Record<string, unknown>) => {
    await updateEpisode.mutateAsync(updates);
  };

  return (
    <div className="p-6 lg:p-8 h-full flex flex-col animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/episodes")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {episode.number && (
              <Badge variant="outline" className="text-xs font-mono">#{episode.number}</Badge>
            )}
            <h1 className="text-xl font-display font-bold text-foreground truncate">
              {episode.final_title || episode.working_title || episode.title}
            </h1>
            <Badge variant="outline" className={`text-xs ${level.color}`}>
              {level.nivel} · {audit.healthScore}%
            </Badge>
            {!audit.canProduce && (
              <Badge variant="destructive" className="text-xs">Bloqueado</Badge>
            )}
          </div>
          {episode.theme && (
            <p className="text-sm text-muted-foreground mt-1">{episode.theme}</p>
          )}
        </div>
      </div>

      {/* Next action banner */}
      <NextActionBanner
        episode={episode}
        operationalState={operationalState}
        onTabChange={setActiveTab}
      />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="bg-secondary mb-6 flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="summary" className="text-xs gap-1.5">
            <FileText className="h-3.5 w-3.5" />Resumen
          </TabsTrigger>
          <TabsTrigger value="data" className="text-xs gap-1.5">
            <Database className="h-3.5 w-3.5" />Datos base
          </TabsTrigger>
          <TabsTrigger value="script" className="text-xs gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />Guión
          </TabsTrigger>
          <TabsTrigger value="assets" className="text-xs gap-1.5">
            <Image className="h-3.5 w-3.5" />Assets
          </TabsTrigger>
          <TabsTrigger value="produccion" className="text-xs gap-1.5">
            <Activity className="h-3.5 w-3.5" />Producción
          </TabsTrigger>
          <TabsTrigger value="publish" className="text-xs gap-1.5">
            <Globe className="h-3.5 w-3.5" />Publicación
          </TabsTrigger>
          <TabsTrigger value="audit" className="text-xs gap-1.5">
            <Shield className="h-3.5 w-3.5" />Auditoría
          </TabsTrigger>
          <TabsTrigger value="copilot" className="text-xs gap-1.5 text-violet-500 data-[state=active]:text-violet-600">
            <Zap className="h-3.5 w-3.5" />Copiloto
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-auto">
          <TabsContent value="summary" className="mt-0">
            <WorkspaceSummary episode={episode} assetCount={assets.length} taskCount={tasks.length} onUpdate={handleSave} />
          </TabsContent>

          <TabsContent value="data" className="mt-0">
            <WorkspaceDataForm episode={episode} onSave={handleSave} isSaving={updateEpisode.isPending} />
          </TabsContent>

          <TabsContent value="script" className="mt-0">
            <WorkspaceScript episode={episode} onSave={handleSave} isSaving={updateEpisode.isPending} />
          </TabsContent>

          <TabsContent value="assets" className="mt-0">
            <WorkspaceAssets episode={episode} assets={assets} />
          </TabsContent>

          <TabsContent value="produccion" className="mt-0">
            <WorkspaceProduccion episode={episode} operationalState={operationalState} />
          </TabsContent>

          <TabsContent value="publish" className="mt-0">
            <div className="space-y-6">
              <div className="surface p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-foreground">Estado de publicación</h3>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-9"
                      onClick={() => navigate(`/publications?episode=${episode.id}`)}
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />Ver publicaciones
                    </Button>
                    <Button
                      size="sm"
                      className="text-xs h-9"
                      onClick={() => navigate("/publications")}
                    >
                      <Plus className="h-3 w-3 mr-1" />Nueva publicación
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-secondary/50 rounded-lg p-4">
                    <p className="text-xs text-muted-foreground">Producción</p>
                    <p className="text-sm font-medium text-foreground mt-1 capitalize">{episode.estado_produccion || "draft"}</p>
                  </div>
                  <div className="bg-secondary/50 rounded-lg p-4">
                    <p className="text-xs text-muted-foreground">Publicación</p>
                    <p className="text-sm font-medium text-foreground mt-1 capitalize">{episode.estado_publicacion || "none"}</p>
                  </div>
                </div>
                {!audit.canPublish && (
                  <div className="mt-4 bg-destructive/5 rounded-lg p-4">
                    <p className="text-xs text-destructive font-medium mb-2">Bloqueado para publicación</p>
                    {audit.blockers.map((b, i) => (
                      <p key={i} className="text-xs text-muted-foreground">· {b}</p>
                    ))}
                  </div>
                )}
              </div>

              {/* Spotify info */}
              {(episode.descripcion_spotify || episode.link_spotify) && (
                <div className="surface p-5 space-y-3">
                  <h3 className="text-sm font-medium text-foreground">Spotify</h3>
                  {episode.descripcion_spotify && (
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{episode.descripcion_spotify}</p>
                  )}
                  {episode.link_spotify && (
                    <a href={episode.link_spotify} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
                      Abrir en Spotify
                    </a>
                  )}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="audit" className="mt-0">
            <WorkspaceAudit episode={episode} />
            <div className="mt-4 flex justify-end">
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground gap-1" asChild>
                <Link to={`/episodes/${episode.id}/360`}>
                  Ver vista 360° del episodio <ExternalLink className="h-3 w-3" />
                </Link>
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="copilot" className="mt-0">
            <WorkspaceCopilot episode={episode} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
