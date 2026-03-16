import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Mic,
  FileText,
  Quote,
  Layers,
  Package,
  Calendar,
  ExternalLink,
  ArrowRight,
} from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import type { EpisodeOperationalState } from "@/hooks/useEpisodeOperationalState";
import { AutomationLogPanel } from "@/components/automation/AutomationLogPanel";

type Episode = Tables<"episodes">;

function formatDate(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

interface SectionProps {
  icon: React.ReactNode;
  title: string;
  count?: number;
  link?: string;
  linkLabel?: string;
  children: React.ReactNode;
}

function Section({ icon, title, count, link, linkLabel, children }: SectionProps) {
  return (
    <div className="surface p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">{icon}</span>
          <h3 className="text-sm font-medium text-foreground">{title}</h3>
          {count !== undefined && (
            <Badge variant="secondary" className="text-[10px] h-4">{count}</Badge>
          )}
        </div>
        {link && (
          <Button variant="ghost" size="sm" className="h-6 text-xs gap-1 text-muted-foreground" asChild>
            <Link to={link}>
              {linkLabel ?? "Ver"} <ArrowRight className="h-3 w-3" />
            </Link>
          </Button>
        )}
      </div>
      {children}
    </div>
  );
}

interface Props {
  episode: Episode;
  operationalState: EpisodeOperationalState;
}

export function WorkspaceProduccion({ episode, operationalState }: Props) {
  const { takes, quotes, assetCandidates, exportPackages, publicationQueue } = operationalState;

  // Transcripts require take IDs — fetch them based on takes data
  const takeIds = (takes.data ?? []).map((t) => t.id);
  const { data: transcripts = [] } = useQuery({
    queryKey: ["ws-produccion-transcripts", episode.id, takeIds.length],
    enabled: takeIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audio_transcripts")
        .select("id, status")
        .in("audio_take_id", takeIds);
      if (error) throw error;
      return data || [];
    },
  });

  const takesData = takes.data ?? [];
  const quotesData = quotes.data ?? [];
  const assetsData = assetCandidates.data ?? [];
  const exportsData = exportPackages.data ?? [];
  const queueData = publicationQueue.data ?? [];

  // Audio counts
  const masteredTakes = takesData.filter((t) => t.mastering_status === "mastered").length;
  const recordedTakes = takesData.filter((t) => t.mastering_status !== "mastered").length;

  // Transcript counts
  const doneTranscripts = transcripts.filter((t) => t.status === "done").length;

  // Quote counts
  const approvedQuotes = quotesData.filter((q) => q.status === "approved").length;

  // Asset counts
  const pendingAssets = assetsData.filter((a) => a.status === "pending").length;
  const approvedAssets = assetsData.filter((a) => a.status === "approved").length;
  const renderedAssets = assetsData.filter((a) => a.status === "rendered").length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Audio Takes */}
        <Section
          icon={<Mic className="h-4 w-4" />}
          title="Tomas de audio"
          count={takesData.length}
          link={`/audio?episode_id=${episode.id}`}
          linkLabel="Audio Studio"
        >
          {takesData.length === 0 ? (
            <p className="text-xs text-muted-foreground">Sin tomas grabadas.</p>
          ) : (
            <div className="flex gap-2 flex-wrap">
              {masteredTakes > 0 && (
                <Badge variant="default" className="text-[10px]">
                  Masterizadas: {masteredTakes}
                </Badge>
              )}
              {recordedTakes > 0 && (
                <Badge variant="secondary" className="text-[10px]">
                  Grabadas: {recordedTakes}
                </Badge>
              )}
            </div>
          )}
        </Section>

        {/* Transcriptions */}
        <Section
          icon={<FileText className="h-4 w-4" />}
          title="Transcripciones"
          count={transcripts.length}
          link={`/audio?episode_id=${episode.id}`}
          linkLabel="Audio Studio"
        >
          {transcripts.length === 0 ? (
            <p className="text-xs text-muted-foreground">Sin transcripciones generadas.</p>
          ) : (
            <div className="flex gap-2 flex-wrap">
              {doneTranscripts > 0 && (
                <Badge variant="default" className="text-[10px]">
                  Listas: {doneTranscripts}
                </Badge>
              )}
              {transcripts.length - doneTranscripts > 0 && (
                <Badge variant="secondary" className="text-[10px]">
                  Procesando: {transcripts.length - doneTranscripts}
                </Badge>
              )}
            </div>
          )}
        </Section>

        {/* Quote Candidates */}
        <Section
          icon={<Quote className="h-4 w-4" />}
          title="Quote candidates"
          count={quotesData.length}
          link="/quotes"
          linkLabel="Quotes"
        >
          {quotesData.length === 0 ? (
            <p className="text-xs text-muted-foreground">Sin quotes registrados.</p>
          ) : (
            <div className="flex gap-2 flex-wrap">
              {approvedQuotes > 0 && (
                <Badge variant="default" className="text-[10px]">
                  Aprobados: {approvedQuotes}
                </Badge>
              )}
              <Badge variant="secondary" className="text-[10px]">
                Total: {quotesData.length}
              </Badge>
            </div>
          )}
        </Section>

        {/* Asset Candidates */}
        <Section
          icon={<Layers className="h-4 w-4" />}
          title="Asset candidates"
          count={assetsData.length}
          link={`/factory?episode_id=${episode.id}`}
          linkLabel="Factory"
        >
          {assetsData.length === 0 ? (
            <p className="text-xs text-muted-foreground">Sin assets generados.</p>
          ) : (
            <div className="flex gap-2 flex-wrap">
              {approvedAssets > 0 && (
                <Badge variant="default" className="text-[10px]">
                  Aprobados: {approvedAssets}
                </Badge>
              )}
              {renderedAssets > 0 && (
                <Badge variant="default" className="text-[10px]">
                  Renderizados: {renderedAssets}
                </Badge>
              )}
              {pendingAssets > 0 && (
                <Badge variant="secondary" className="text-[10px]">
                  Pendientes: {pendingAssets}
                </Badge>
              )}
            </div>
          )}
        </Section>
      </div>

      {/* Export Packages */}
      <Section
        icon={<Package className="h-4 w-4" />}
        title="Paquetes de exportación"
        count={exportsData.length}
      >
        {exportsData.length === 0 ? (
          <p className="text-xs text-muted-foreground">Sin paquetes de exportación creados.</p>
        ) : (
          <div className="space-y-1.5">
            {exportsData.slice(0, 4).map((pkg) => (
              <div
                key={pkg.id}
                className="flex items-center justify-between gap-3 rounded-md border border-border bg-secondary/30 px-3 py-2"
              >
                <p className="text-xs font-medium truncate">{pkg.title}</p>
                <Badge variant="secondary" className="text-[10px] shrink-0">{pkg.status}</Badge>
              </div>
            ))}
            {exportsData.length > 4 && (
              <p className="text-xs text-muted-foreground">+{exportsData.length - 4} más…</p>
            )}
          </div>
        )}
      </Section>

      {/* Publication Queue */}
      <Section
        icon={<Calendar className="h-4 w-4" />}
        title="Cola de publicación"
        count={queueData.length}
      >
        {queueData.length === 0 ? (
          <p className="text-xs text-muted-foreground">Sin publicaciones programadas.</p>
        ) : (
          <div className="space-y-1.5">
            {queueData.slice(0, 4).map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-md border border-border bg-secondary/30 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="text-xs font-medium">{item.platform}</p>
                  <p className="text-[10px] text-muted-foreground">{formatDate(item.scheduled_at)}</p>
                </div>
                <Badge
                  variant={
                    item.status === "published"
                      ? "default"
                      : item.status === "failed"
                      ? "destructive"
                      : "secondary"
                  }
                  className="text-[10px] shrink-0"
                >
                  {item.status}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Link to full analytics */}
      <div className="flex justify-end pt-1">
        <Button variant="ghost" size="sm" className="text-xs text-muted-foreground gap-1" asChild>
          <Link to={`/episodes/${episode.id}/360`}>
            Ver análisis completo (360°) <ExternalLink className="h-3 w-3" />
          </Link>
        </Button>
      </div>

      {/* Automation runs log */}
      <AutomationLogPanel episodeId={episode.id} />
    </div>
  );
}
