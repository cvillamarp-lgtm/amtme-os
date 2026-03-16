import { useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { QAGatesPanel } from "@/components/audio/QAGatesPanel";
import { useMetricSnapshots, useLearningInsights } from "@/hooks/useMetrics";
import { useExportPackages, usePublicationQueue } from "@/hooks/useExportPackages";
import {
  Mic,
  FileText,
  Quote,
  Layers,
  Package,
  Activity,
  BookOpen,
  ArrowLeft,
  Calendar,
  CheckSquare,
} from "lucide-react";
import type { EpisodeQAData } from "@/lib/qa-gates";

function formatSeconds(s?: number | null) {
  if (s == null) return "—";
  const total = Math.floor(s);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

function formatDate(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
}

export default function Episode360() {
  const { episodeId } = useParams<{ episodeId: string }>();

  const { data: episode } = useQuery({
    queryKey: ["episode-360-meta", episodeId],
    enabled: !!episodeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("episodes")
        .select("*")
        .eq("id", episodeId!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: takes = [] } = useQuery({
    queryKey: ["episode-360-takes", episodeId],
    enabled: !!episodeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audio_takes")
        .select("*")
        .eq("episode_id", episodeId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: transcripts = [] } = useQuery({
    queryKey: ["episode-360-transcripts", episodeId, takes.length],
    enabled: !!episodeId && takes.length > 0,
    queryFn: async () => {
      const ids = takes.map((t) => t.id);
      if (!ids.length) return [];
      const { data, error } = await supabase
        .from("audio_transcripts")
        .select("*")
        .in("audio_take_id", ids);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: quotes = [] } = useQuery({
    queryKey: ["episode-360-quotes", episodeId],
    enabled: !!episodeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quote_candidates")
        .select("*")
        .eq("episode_id", episodeId!)
        .order("emotional_score", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: assets = [] } = useQuery({
    queryKey: ["episode-360-assets", episodeId],
    enabled: !!episodeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("asset_candidates")
        .select("*")
        .eq("episode_id", episodeId!)
        .order("score", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: exportPackages = [] } = useExportPackages(episodeId);
  const { data: publicationQueue = [] } = usePublicationQueue(episodeId);
  const { data: metrics = [] } = useMetricSnapshots(episodeId);
  const { data: insights = [] } = useLearningInsights(episodeId);

  const topTake = takes[0];

  const qaData: EpisodeQAData = useMemo(
    () => ({
      hasTake: takes.length > 0,
      hasMaster: takes.some((t) => !!t.master_file_url),
      hasTranscript: transcripts.some((t) => t.status === "done"),
      hasQuotes: quotes.length > 0,
      hasAssets: assets.some(
        (a) => a.status === "approved" || a.status === "rendered"
      ),
      hasExportPackage: exportPackages.length > 0,
      audioPeakDb: topTake?.master_peak_db ?? topTake?.peak_db,
      audioRmsDb: topTake?.master_rms_db ?? topTake?.rms_db,
      audioClipping: topTake?.master_clipping_count ?? topTake?.clipping_count,
    }),
    [takes, transcripts, quotes, assets, exportPackages, topTake]
  );

  const episodeTitle = episode?.title || "Episodio";

  return (
    <div className="page-container animate-fade-in">
      <div className="mb-4">
        <Link
          to={`/episodes/${episodeId}`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground gap-1"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al episodio
        </Link>
      </div>

      <PageHeader
        title={`360° — ${episodeTitle}`}
        subtitle="Vista consolidada de todo el flujo de producción del episodio."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Audio Takes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Mic className="h-4 w-4" />
              Tomas de audio
              <Badge variant="secondary" className="ml-auto">{takes.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {takes.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin tomas grabadas.</p>
            ) : (
              takes.map((take) => (
                <div
                  key={take.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
                >
                  <div>
                    <p className="text-sm font-medium">{take.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatSeconds(take.duration_seconds)} · Pico:{" "}
                      {take.master_peak_db ?? take.peak_db ?? "—"} dB
                    </p>
                  </div>
                  <Badge variant="secondary">{take.mastering_status}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Transcripts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4" />
              Transcripciones
              <Badge variant="secondary" className="ml-auto">{transcripts.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {transcripts.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin transcripciones aún.</p>
            ) : (
              transcripts.map((t) => (
                <div
                  key={t.id}
                  className="flex items-start justify-between gap-3 rounded-lg border border-border p-3"
                >
                  <p className="text-sm text-muted-foreground flex-1">
                    {t.full_text ? t.full_text.slice(0, 100) + "…" : "Sin texto aún"}
                  </p>
                  <Badge variant="secondary">{t.status}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Quotes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Quote className="h-4 w-4" />
              Quote Candidates
              <Badge variant="secondary" className="ml-auto">{quotes.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {quotes.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin quotes registrados.</p>
            ) : (
              quotes.slice(0, 5).map((q) => (
                <div key={q.id} className="rounded-lg border border-border p-3">
                  <p className="text-sm line-clamp-2">{q.text?.slice(0, 120) || "—"}</p>
                  <div className="flex gap-2 mt-1 flex-wrap">
                    <Badge variant="secondary">{q.status}</Badge>
                    {q.emotional_score != null && (
                      <span className="text-xs text-muted-foreground">
                        Emoción: {q.emotional_score}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
            {quotes.length > 5 && (
              <p className="text-xs text-muted-foreground">+{quotes.length - 5} más…</p>
            )}
          </CardContent>
        </Card>

        {/* Assets */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Layers className="h-4 w-4" />
              Asset Candidates
              <Badge variant="secondary" className="ml-auto">{assets.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {assets.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin assets generados.</p>
            ) : (
              assets.slice(0, 5).map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
                >
                  <div>
                    <p className="text-sm font-medium">{a.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {a.platform} · {a.asset_type}
                    </p>
                  </div>
                  <Badge
                    variant={
                      a.status === "approved"
                        ? "default"
                        : a.status === "rejected"
                        ? "destructive"
                        : "secondary"
                    }
                  >
                    {a.status}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Export Packages */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Package className="h-4 w-4" />
              Paquetes de exportación
              <Badge variant="secondary" className="ml-auto">{exportPackages.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {exportPackages.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin paquetes de exportación.</p>
            ) : (
              exportPackages.map((pkg) => (
                <div
                  key={pkg.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
                >
                  <p className="text-sm font-medium">{pkg.title}</p>
                  <Badge variant="secondary">{pkg.status}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Publication Queue */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-4 w-4" />
              Cola de publicación
              <Badge variant="secondary" className="ml-auto">{publicationQueue.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {publicationQueue.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin publicaciones programadas.</p>
            ) : (
              publicationQueue.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
                >
                  <div>
                    <p className="text-sm font-medium">{item.platform}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(item.scheduled_at)}
                    </p>
                  </div>
                  <Badge
                    variant={
                      item.status === "published"
                        ? "default"
                        : item.status === "failed"
                        ? "destructive"
                        : "secondary"
                    }
                  >
                    {item.status}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4" />
              Métricas
              <Badge variant="secondary" className="ml-auto">{metrics.length} snapshots</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {metrics.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin métricas registradas.</p>
            ) : (
              metrics.slice(0, 5).map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {m.metric_type} · {m.platform}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatDate(m.snapshot_date)}</p>
                  </div>
                  <span className="text-sm font-semibold">
                    {Number(m.value).toLocaleString()}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Learning Insights */}
        {insights.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BookOpen className="h-4 w-4" />
                Insights de aprendizaje
                <Badge variant="secondary" className="ml-auto">{insights.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {insights.map((insight) => (
                <div key={insight.id} className="rounded-lg border border-border p-3">
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <p className="text-sm font-medium">{insight.title}</p>
                    <Badge variant="secondary">{insight.insight_type}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{insight.body}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* QA Gates — full width */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CheckSquare className="h-4 w-4" />
                QA Gates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <QAGatesPanel data={qaData} />
            </CardContent>
          </Card>
        </div>

        {/* Quick links */}
        <div className="lg:col-span-2 flex gap-3 flex-wrap">
          <Button variant="outline" asChild>
            <Link to={`/episodes/${episodeId}`}>Workspace del episodio</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/audio">Audio Studio</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/quotes">Quote Candidates</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
