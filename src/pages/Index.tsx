import {
  Mic, ListTodo, Image, Zap, AlertTriangle, Lightbulb, ScrollText,
  Send, FlaskConical, ArrowRight, Quote, Users, Bell, Clock,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { auditEpisode, getCompletenessLevel } from "@/lib/episode-validation";
import { useNarrativeSkeletonSeed } from "@/hooks/useNarrativeSkeletonSeed";

// ─── Queries ──────────────────────────────────────────────────────────────────

function useDashboardCounts() {
  return useQuery({
    queryKey: ["dashboard-counts-v2"],
    queryFn: async () => {
      const [
        eps,
        tasks,
        assetsTotal,
        assetsPending,
        ideasCapturadas,
        ideasAprobadas,
        briefsTotal,
        briefsConvertidos,
        pubsScheduled,
        pubsPublished,
        insightsExperimenting,
        insightsAccepted,
        quotesTotal,
        quotesApproved,
      ] = await Promise.all([
        supabase.from("episodes").select("*", { count: "exact", head: true }),
        supabase.from("tasks").select("*", { count: "exact", head: true }).eq("status", "todo"),
        supabase.from("content_assets").select("*", { count: "exact", head: true }),
        supabase.from("content_assets").select("*", { count: "exact", head: true }).in("status", ["generated", "pending"]),
        supabase.from("ideas").select("*", { count: "exact", head: true }).eq("status", "captured"),
        supabase.from("ideas").select("*", { count: "exact", head: true }).eq("status", "approved"),
        supabase.from("briefs").select("*", { count: "exact", head: true }).neq("status", "converted"),
        supabase.from("briefs").select("*", { count: "exact", head: true }).eq("status", "converted"),
        supabase.from("publications").select("*", { count: "exact", head: true }).eq("status", "scheduled"),
        supabase.from("publications").select("*", { count: "exact", head: true }).eq("status", "published"),
        supabase.from("insights").select("*", { count: "exact", head: true }).eq("status", "experimenting"),
        supabase.from("insights").select("*", { count: "exact", head: true }).eq("status", "accepted"),
        supabase.from("quote_candidates").select("*", { count: "exact", head: true }),
        supabase.from("quote_candidates").select("*", { count: "exact", head: true }).eq("status", "approved"),
      ]);

      return {
        episodes:             eps.count ?? 0,
        tasks:                tasks.count ?? 0,
        assets:               assetsTotal.count ?? 0,
        assetsPending:        assetsPending.count ?? 0,
        ideasCapturadas:      ideasCapturadas.count ?? 0,
        ideasAprobadas:       ideasAprobadas.count ?? 0,
        briefsActivos:        briefsTotal.count ?? 0,
        briefsConvertidos:    briefsConvertidos.count ?? 0,
        pubsScheduled:        pubsScheduled.count ?? 0,
        pubsPublished:        pubsPublished.count ?? 0,
        insightsExperimenting:insightsExperimenting.count ?? 0,
        insightsAccepted:     insightsAccepted.count ?? 0,
        quotesTotal:          quotesTotal.count ?? 0,
        quotesApproved:       quotesApproved.count ?? 0,
      };
    },
  });
}

// ─── Smart Alerts ─────────────────────────────────────────────────────────────

type SmartAlert = {
  id: string;
  type: "stagnant_episode" | "overdue_publication" | "overdue_task" | "stale_brief";
  severity: "high" | "medium";
  title: string;
  message: string;
  link: string;
  icon: any;
  daysAgo: number;
};

function useSmartAlerts() {
  return useQuery({
    queryKey: ["smart-alerts"],
    queryFn: async () => {
      const now = new Date();
      const sevenDaysAgo  = new Date(now.getTime() - 7  * 86400000).toISOString();
      const fourteenDaysAgo = new Date(now.getTime() - 14 * 86400000).toISOString();
      const fiveDaysAgo   = new Date(now.getTime() - 5  * 86400000).toISOString();
      const nowISO        = now.toISOString();

      const [stagnantEps, overduePubs, overdueTasks, staleBriefs] = await Promise.all([
        supabase
          .from("episodes")
          .select("id, title, number, status, updated_at")
          .neq("status", "published")
          .neq("status", "archived")
          .lt("updated_at", sevenDaysAgo)
          .order("updated_at", { ascending: true })
          .limit(5),

        supabase
          .from("publications")
          .select("id, platform, scheduled_at, episode_id")
          .eq("status", "scheduled")
          .not("scheduled_at", "is", null)
          .lt("scheduled_at", nowISO)
          .order("scheduled_at", { ascending: true })
          .limit(5),

        supabase
          .from("tasks")
          .select("id, title, priority, due_date, created_at, episode_id")
          .eq("status", "todo")
          .eq("priority", "high")
          .or(`due_date.lt.${nowISO},created_at.lt.${fiveDaysAgo}`)
          .order("created_at", { ascending: true })
          .limit(5),

        supabase
          .from("briefs")
          .select("id, title, status, created_at")
          .neq("status", "converted")
          .neq("status", "archived")
          .lt("created_at", fourteenDaysAgo)
          .order("created_at", { ascending: true })
          .limit(5),
      ]);

      const alerts: SmartAlert[] = [];

      (stagnantEps.data || []).forEach((ep) => {
        const daysAgo = Math.floor((now.getTime() - new Date(ep.updated_at).getTime()) / 86400000);
        alerts.push({
          id: `ep-${ep.id}`,
          type: "stagnant_episode",
          severity: daysAgo >= 14 ? "high" : "medium",
          title: `Episodio estancado${ep.number ? ` #${ep.number}` : ""}`,
          message: `"${ep.title}" sin actividad hace ${daysAgo} días · estado: ${ep.status || "sin definir"}`,
          link: `/episodes/${ep.id}`,
          icon: Mic,
          daysAgo,
        });
      });

      (overduePubs.data || []).forEach((pub) => {
        const daysAgo = Math.floor((now.getTime() - new Date(pub.scheduled_at!).getTime()) / 86400000);
        alerts.push({
          id: `pub-${pub.id}`,
          type: "overdue_publication",
          severity: "high",
          title: "Publicación programada atrasada",
          message: `${pub.platform} — programada hace ${daysAgo} día${daysAgo !== 1 ? "s" : ""}, aún sin publicar`,
          link: "/publications",
          icon: Send,
          daysAgo,
        });
      });

      (overdueTasks.data || []).forEach((task) => {
        const refDate = task.due_date ?? task.created_at;
        const daysAgo = Math.floor((now.getTime() - new Date(refDate).getTime()) / 86400000);
        alerts.push({
          id: `task-${task.id}`,
          type: "overdue_task",
          severity: "high",
          title: "Tarea urgente sin completar",
          message: `"${task.title || "Sin título"}" — ${task.due_date ? `venció hace ${daysAgo} días` : `pendiente hace ${daysAgo} días`}`,
          link: "/tasks",
          icon: ListTodo,
          daysAgo,
        });
      });

      (staleBriefs.data || []).forEach((brief) => {
        const daysAgo = Math.floor((now.getTime() - new Date(brief.created_at).getTime()) / 86400000);
        alerts.push({
          id: `brief-${brief.id}`,
          type: "stale_brief",
          severity: daysAgo >= 30 ? "high" : "medium",
          title: "Brief sin convertir",
          message: `"${brief.title}" en estado "${brief.status || "draft"}" hace ${daysAgo} días`,
          link: "/briefs",
          icon: ScrollText,
          daysAgo,
        });
      });

      // High severity first, then most overdue
      return alerts.sort((a, b) => {
        if (a.severity !== b.severity) return a.severity === "high" ? -1 : 1;
        return b.daysAgo - a.daysAgo;
      });
    },
    staleTime: 5 * 60 * 1000,
  });
}

// ─── Pipeline card ─────────────────────────────────────────────────────────────

function PipelineStage({
  icon: Icon,
  label,
  value,
  sub,
  to,
  color,
  isLast = false,
}: {
  icon: any;
  label: string;
  value: number;
  sub: string;
  to: string;
  color: string;
  isLast?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 flex-1 min-w-0">
      <Link
        to={to}
        className="flex-1 min-w-0 surface rounded-xl p-4 hover:border-primary/30 transition-all group text-center"
      >
        <div className={`inline-flex items-center justify-center h-8 w-8 rounded-lg mb-2 ${color} bg-opacity-10`}>
          <Icon className={`h-4 w-4 ${color}`} />
        </div>
        <div className="text-xl font-display font-bold text-foreground">{value}</div>
        <div className="text-[11px] font-medium text-foreground/80">{label}</div>
        <div className="text-[10px] text-muted-foreground mt-0.5">{sub}</div>
      </Link>
      {!isLast && <ArrowRight className="h-4 w-4 text-muted-foreground/40 shrink-0 hidden sm:block" />}
    </div>
  );
}

// ─── Dashboard ─────────────────────────────────────────────────────────────────

const Dashboard = () => {
  useNarrativeSkeletonSeed();
  const navigate = useNavigate();

  const { data: counts, isLoading: loadingCounts } = useDashboardCounts();

  const { data: episodes = [], isLoading: loadingEpisodes } = useQuery({
    queryKey: ["dashboard-episodes"],
    queryFn: async () => {
      const { data } = await supabase
        .from("episodes")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);
      return data || [];
    },
  });

  const { data: pendingTasks = [] } = useQuery({
    queryKey: ["dashboard-tasks"],
    queryFn: async () => {
      const { data } = await supabase
        .from("tasks")
        .select("id, title, priority, category, episode_id")
        .eq("status", "todo")
        .order("created_at", { ascending: false })
        .limit(5);
      return data || [];
    },
  });

  const { data: recentAssets = [] } = useQuery({
    queryKey: ["dashboard-recent-assets"],
    queryFn: async () => {
      const { data } = await supabase
        .from("content_assets")
        .select("id, piece_name, image_url, status, created_at")
        .order("created_at", { ascending: false })
        .limit(6);
      return data || [];
    },
  });

  const { data: smartAlerts = [] } = useSmartAlerts();

  const auditAlerts = episodes
    .filter((ep: any) => ep.status !== "published")
    .map((ep: any) => {
      const audit = auditEpisode(ep);
      if (audit.blockers.length === 0 && audit.warnings.length === 0) return null;
      return { episode: ep, audit };
    })
    .filter(Boolean)
    .slice(0, 3);

  return (
    <div className="page-container animate-fade-in">
      <PageHeader title="Dashboard" subtitle="Centro de operaciones AMTME OS." />

      {/* ── Pipeline Ideas → Briefs → Episodios → Publicaciones ── */}
      <div className="surface rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground/80 uppercase tracking-wider">
            Pipeline de contenido
          </h2>
        </div>
        <div className="p-4">
          {loadingCounts ? (
            <LoadingSkeleton count={4} variant="stat" />
          ) : (
            <div className="flex items-center gap-2 sm:gap-3">
              <PipelineStage
                icon={Lightbulb}
                label="Ideas"
                value={counts?.ideasCapturadas ?? 0}
                sub="capturadas"
                to="/ideas"
                color="text-yellow-500"
              />
              <PipelineStage
                icon={ScrollText}
                label="Briefs"
                value={counts?.briefsActivos ?? 0}
                sub="en progreso"
                to="/briefs"
                color="text-blue-500"
              />
              <PipelineStage
                icon={Mic}
                label="Episodios"
                value={counts?.episodes ?? 0}
                sub="total"
                to="/episodes"
                color="text-primary"
              />
              <PipelineStage
                icon={Send}
                label="Publicaciones"
                value={counts?.pubsScheduled ?? 0}
                sub="programadas"
                to="/publications"
                color="text-green-500"
                isLast
              />
            </div>
          )}
        </div>
      </div>

      {/* ── Metric Cards ── */}
      {loadingCounts ? (
        <LoadingSkeleton count={6} variant="stat" />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { name: "Episodios",   value: counts?.episodes ?? 0,          sub: "total",          icon: Mic,          color: "text-primary",      to: "/episodes" },
            { name: "Ideas",       value: counts?.ideasAprobadas ?? 0,     sub: "aprobadas",      icon: Lightbulb,    color: "text-yellow-500",   to: "/ideas" },
            { name: "Briefs",      value: counts?.briefsConvertidos ?? 0,  sub: "convertidos",    icon: ScrollText,   color: "text-blue-500",     to: "/briefs" },
            { name: "Assets",      value: counts?.assetsPending ?? 0,      sub: "pendientes",     icon: Image,        color: "text-orange-500",   to: "/library" },
            { name: "Insights",    value: counts?.insightsAccepted ?? 0,   sub: "aceptados",      icon: FlaskConical, color: "text-purple-500",   to: "/insights" },
            { name: "Citas",       value: counts?.quotesApproved ?? 0,     sub: "aprobadas",      icon: Quote,        color: "text-pink-500",     to: "/quotes" },
          ].map((m) => {
            const Icon = m.icon;
            return (
              <Link key={m.name} to={m.to} className="stat-card hover:border-primary/30 transition-all group">
                <div className="flex justify-between items-start mb-3">
                  <div className="p-1.5 bg-secondary rounded-lg">
                    <Icon className={`w-4 h-4 ${m.color}`} />
                  </div>
                </div>
                <div className="text-xl font-display font-bold text-foreground">{m.value}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  <span className="text-foreground/70 font-medium">{m.name}</span>
                  {" · "}{m.sub}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* ── Insights + Quotes summary row ── */}
      {!loadingCounts && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Insights widget */}
          <Link to="/insights" className="surface rounded-xl p-5 hover:border-primary/30 transition-all">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <FlaskConical className="h-4 w-4 text-purple-500" />
                Learning Loop
              </h2>
              <span className="text-xs text-primary">Ver todos →</span>
            </div>
            <div className="flex gap-4">
              <div>
                <div className="text-2xl font-display font-bold text-yellow-500">{counts?.insightsExperimenting ?? 0}</div>
                <div className="text-[11px] text-muted-foreground">Experimentando</div>
              </div>
              <div className="w-px bg-border" />
              <div>
                <div className="text-2xl font-display font-bold text-green-500">{counts?.insightsAccepted ?? 0}</div>
                <div className="text-[11px] text-muted-foreground">Aceptados</div>
              </div>
              <div className="w-px bg-border" />
              <div>
                <div className="text-2xl font-display font-bold text-foreground">{(counts?.insightsExperimenting ?? 0) + (counts?.insightsAccepted ?? 0)}</div>
                <div className="text-[11px] text-muted-foreground">Activos</div>
              </div>
            </div>
          </Link>

          {/* Quotes widget */}
          <Link to="/quotes" className="surface rounded-xl p-5 hover:border-primary/30 transition-all">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Quote className="h-4 w-4 text-pink-500" />
                Banco de Citas
              </h2>
              <span className="text-xs text-primary">Ver todas →</span>
            </div>
            <div className="flex gap-4">
              <div>
                <div className="text-2xl font-display font-bold text-foreground">{counts?.quotesTotal ?? 0}</div>
                <div className="text-[11px] text-muted-foreground">Capturadas</div>
              </div>
              <div className="w-px bg-border" />
              <div>
                <div className="text-2xl font-display font-bold text-green-500">{counts?.quotesApproved ?? 0}</div>
                <div className="text-[11px] text-muted-foreground">Aprobadas</div>
              </div>
              <div className="w-px bg-border" />
              <div>
                <div className="text-2xl font-display font-bold text-purple-500">{counts?.pubsPublished ?? 0}</div>
                <div className="text-[11px] text-muted-foreground">Pubs. publicadas</div>
              </div>
            </div>
          </Link>
        </div>
      )}

      {/* ── Smart Operational Alerts ── */}
      {smartAlerts.length > 0 && (
        <div className="surface overflow-hidden rounded-xl border-l-4 border-l-amber-500">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Bell className="h-4 w-4 text-amber-500" />
              Alertas operacionales
              <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-amber-500/20 text-amber-600 text-[11px] font-bold">
                {smartAlerts.length}
              </span>
            </h2>
            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" /> Actualizado hace un momento
            </span>
          </div>
          <div className="divide-y divide-border">
            {smartAlerts.slice(0, 6).map((alert) => {
              const AlertIcon = alert.icon;
              return (
                <Link
                  key={alert.id}
                  to={alert.link}
                  className="p-4 flex items-center justify-between surface-hover gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`p-1.5 rounded-lg shrink-0 ${alert.severity === "high" ? "bg-destructive/10" : "bg-amber-500/10"}`}>
                      <AlertIcon className={`h-4 w-4 ${alert.severity === "high" ? "text-destructive" : "text-amber-500"}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">{alert.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{alert.message}</p>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={`shrink-0 text-[10px] ${alert.severity === "high" ? "border-destructive/40 text-destructive" : "border-amber-500/40 text-amber-600"}`}
                  >
                    {alert.severity === "high" ? "Urgente" : "Atención"}
                  </Badge>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Audit Alerts ── */}
      {auditAlerts.length > 0 && (
        <div className="surface overflow-hidden">
          <div className="p-5 border-b border-border">
            <h2 className="text-lg font-display font-semibold text-foreground flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-[hsl(var(--chart-3))]" />
              Alertas de auditoría
            </h2>
          </div>
          <div className="divide-y divide-border">
            {auditAlerts.map((item: any) => (
              <div
                key={item.episode.id}
                className="p-4 flex items-center justify-between surface-hover cursor-pointer"
                onClick={() => navigate(`/episodes/${item.episode.id}`)}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {item.episode.number && `#${item.episode.number} — `}{item.episode.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {item.audit.blockers.length} bloqueos · {item.audit.warnings.length} advertencias · {item.audit.healthScore}% salud
                  </p>
                </div>
                <Badge variant="outline" className={getCompletenessLevel(item.audit.healthScore).color}>
                  {item.audit.healthScore}%
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Active Episodes ── */}
      <div className="surface overflow-hidden">
        <div className="p-5 border-b border-border flex justify-between items-center">
          <h2 className="text-lg font-display font-semibold text-foreground">Episodios activos</h2>
          <Link to="/episodes" className="text-sm text-primary hover:text-primary/80 font-medium">Ver todos</Link>
        </div>
        {loadingEpisodes ? (
          <div className="p-5"><LoadingSkeleton count={3} variant="row" /></div>
        ) : episodes.length === 0 ? (
          <EmptyState icon={Mic} message="No hay episodios aún" className="py-12" />
        ) : (
          <div className="divide-y divide-border">
            {episodes.map((ep: any) => {
              const audit = auditEpisode(ep);
              const level = getCompletenessLevel(audit.healthScore);
              return (
                <div
                  key={ep.id}
                  className="p-4 flex items-center gap-4 surface-hover cursor-pointer"
                  onClick={() => navigate(`/episodes/${ep.id}`)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground truncate">{ep.title}</p>
                      {ep.number && <span className="text-xs text-muted-foreground">#{ep.number}</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <Progress value={audit.healthScore} className="h-1.5 flex-1 max-w-[120px]" />
                      <span className={`text-[10px] font-medium ${level.color}`}>{level.nivel} · {audit.healthScore}%</span>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {!audit.canProduce && <Badge variant="destructive" className="text-[9px]">Bloqueado</Badge>}
                    <Button
                      size="sm" variant="outline" className="h-7 text-xs"
                      onClick={(e) => { e.stopPropagation(); navigate(`/factory?episode_id=${ep.id}`); }}
                    >
                      <Zap className="h-3 w-3 mr-1" />Producir
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Two columns: Tasks + Assets ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="surface overflow-hidden">
          <div className="p-5 border-b border-border flex justify-between items-center">
            <h2 className="text-lg font-display font-semibold text-foreground">Tareas pendientes</h2>
            <Link to="/tasks" className="text-sm text-primary hover:text-primary/80 font-medium">Ver todas</Link>
          </div>
          {pendingTasks.length === 0 ? (
            <EmptyState icon={ListTodo} message="Sin tareas pendientes" className="py-12" />
          ) : (
            <div className="divide-y divide-border">
              {pendingTasks.map((t: any) => (
                <div key={t.id} className="p-4 flex items-center justify-between surface-hover">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{t.title}</p>
                    {t.category && <p className="text-xs text-muted-foreground">{t.category}</p>}
                  </div>
                  {t.priority === "high" && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/10 text-destructive font-medium">Alta</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="surface overflow-hidden">
          <div className="p-5 border-b border-border flex justify-between items-center">
            <h2 className="text-lg font-display font-semibold text-foreground">Assets recientes</h2>
            <Link to="/library" className="text-sm text-primary hover:text-primary/80 font-medium">Ver todos</Link>
          </div>
          {recentAssets.length === 0 ? (
            <EmptyState icon={Image} message="No hay assets generados" className="py-12" />
          ) : (
            <div className="p-4 grid grid-cols-3 gap-2">
              {recentAssets.map((a: any) => (
                <div
                  key={a.id}
                  className="rounded-md overflow-hidden border border-border bg-secondary/30 aspect-square relative group"
                >
                  {a.image_url ? (
                    <img src={a.image_url} alt={a.piece_name} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Image className="h-5 w-5 text-muted-foreground/30" />
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/80 to-transparent p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-[10px] text-foreground truncate">{a.piece_name}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
