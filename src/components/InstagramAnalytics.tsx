import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { invokeEdgeFunction } from "@/services/functions/invokeEdgeFunction";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  RefreshCw,
  ExternalLink,
  Heart,
  MessageCircle,
  Bookmark,
  Eye,
  Users,
  TrendingUp,
  AlertCircle,
  Link2,
  RotateCcw,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

type AccountStat = {
  id: string;
  fecha: string;
  followers: number | null;
  reach: number | null;
  impressions: number | null;
  profile_views: number | null;
};

type MediaStat = {
  id: string;
  ig_media_id: string;
  ig_permalink: string | null;
  caption: string | null;
  media_type: string | null;
  thumbnail_url: string | null;
  posted_at: string | null;
  reach: number | null;
  impressions: number | null;
  likes: number | null;
  comments: number | null;
  saves: number | null;
  shares: number | null;
  episode_id: string | null;
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function fmt(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function shortDate(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function InstagramAnalytics() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showAllPosts, setShowAllPosts] = useState(false);

  // Check if Instagram account is connected
  const { data: igAccount, isLoading: accountLoading } = useQuery({
    queryKey: ["platform-account-instagram"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_accounts")
        .select("id, account_name, account_id, oauth_connected, token_expiry, connected_at")
        .eq("platform", "instagram")
        .single();
      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
    enabled: !!user,
  });

  // Daily account stats (last 30 days)
  const { data: accountStats = [], isLoading: statsLoading } = useQuery({
    queryKey: ["instagram-account-stats"],
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - 30);
      const { data, error } = await (supabase as any)
        .from("instagram_account_stats")
        .select("*")
        .gte("fecha", since.toISOString().split("T")[0])
        .order("fecha", { ascending: true });
      if (error) throw error;
      return (data || []) as AccountStat[];
    },
    enabled: !!user,
  });

  // Media stats (recent posts)
  const { data: mediaStats = [], isLoading: mediaLoading } = useQuery({
    queryKey: ["instagram-media-stats"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("instagram_media_stats")
        .select("*")
        .order("posted_at", { ascending: false })
        .limit(24);
      if (error) throw error;
      return (data || []) as MediaStat[];
    },
    enabled: !!user,
  });

  // Refresh insights mutation
  const refreshMutation = useMutation({
    mutationFn: async () => {
      return invokeEdgeFunction("fetch-instagram-insights");
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["instagram-account-stats"] });
      queryClient.invalidateQueries({ queryKey: ["instagram-media-stats"] });
      queryClient.invalidateQueries({ queryKey: ["platform-account-instagram"] });
      toast.success(`Datos actualizados — ${data.posts_fetched} posts, ${data.days_fetched} días`);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Error al actualizar"),
  });

  // Reconnect OAuth mutation — clears the old token and starts a fresh authorization
  const reconnectMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("No autenticado");
      // Clear old OAuth so the account shows "needs reconnect" state
      await (supabase as any)
        .from("platform_accounts")
        .update({ oauth_connected: false, access_token: null, refresh_token: null, token_expiry: null, account_id: null })
        .eq("platform", "instagram")
        .eq("user_id", user.id);
      const result = await invokeEdgeFunction<{ url: string }>("oauth-init", {
        platform: "instagram",
        user_id: user.id,
      });
      return result.url;
    },
    onSuccess: (url) => {
      window.location.href = url;
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Error al reconectar"),
  });

  // ── Derived stats ──────────────────────────────────────────────────────────

  const latestFollowers = accountStats
    .slice()
    .reverse()
    .find((s) => s.followers != null)?.followers ?? null;

  const avgReach =
    accountStats.filter((s) => s.reach != null).reduce((sum, s) => sum + (s.reach || 0), 0) /
      (accountStats.filter((s) => s.reach != null).length || 1);

  const avgImpressions =
    accountStats
      .filter((s) => s.impressions != null)
      .reduce((sum, s) => sum + (s.impressions || 0), 0) /
      (accountStats.filter((s) => s.impressions != null).length || 1);

  const postsThisMonth = mediaStats.filter((m) => {
    if (!m.posted_at) return false;
    const d = new Date(m.posted_at);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const chartData = accountStats
    .filter((s) => s.reach != null || s.impressions != null)
    .map((s) => ({
      date: shortDate(s.fecha),
      reach: s.reach || 0,
      impressions: s.impressions || 0,
    }));

  const displayedPosts = showAllPosts ? mediaStats : mediaStats.slice(0, 12);

  // ── Not connected state ───────────────────────────────────────────────────

  if (!accountLoading && !igAccount?.oauth_connected) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
        <AlertCircle className="h-10 w-10 text-muted-foreground/40" />
        <div>
          <p className="font-medium text-foreground">Instagram no está conectado</p>
          <p className="text-sm text-muted-foreground mt-1">
            Ve a{" "}
            <a href="/accounts" className="text-primary underline underline-offset-2">
              Cuentas
            </a>{" "}
            y conecta tu cuenta de Instagram para ver las métricas aquí.
          </p>
        </div>
      </div>
    );
  }

  // ── Incomplete setup: OAuth done but no Instagram Business Account found ──

  if (!accountLoading && igAccount?.oauth_connected && !igAccount?.account_id) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-amber-400/30 bg-amber-500/5 p-5 space-y-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-foreground">Configuración incompleta</p>
              <p className="text-sm text-muted-foreground mt-1">
                La autorización de Facebook se completó pero no se encontró ninguna Página
                con Instagram Business vinculado. Sigue estos pasos para solucionarlo:
              </p>
            </div>
          </div>

          <ol className="space-y-2 text-sm text-muted-foreground pl-2">
            <li className="flex gap-2">
              <span className="font-bold text-amber-500 shrink-0">1.</span>
              <span>
                Asegúrate de que tu Instagram{" "}
                <strong className="text-foreground">@yosoyvillamar</strong> esté
                vinculado a una Página de Facebook. Ve a:{" "}
                <a
                  href="https://www.facebook.com/pages/?category=your_pages"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline underline-offset-2"
                >
                  facebook.com/pages
                </a>{" "}
                → elige tu Página → <strong>Configuración → Instagram → Vincular cuenta</strong>.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-amber-500 shrink-0">2.</span>
              <span>
                Haz clic en <strong className="text-foreground">Reconectar Instagram</strong>{" "}
                abajo. Cuando Facebook muestre el diálogo,{" "}
                <strong className="text-foreground">marca la casilla de tu Página</strong>{" "}
                antes de hacer clic en Continuar.
              </span>
            </li>
          </ol>

          <Button
            onClick={() => reconnectMutation.mutate()}
            disabled={reconnectMutation.isPending}
            className="w-full sm:w-auto"
          >
            <RotateCcw className={`h-4 w-4 mr-2 ${reconnectMutation.isPending ? "animate-spin" : ""}`} />
            {reconnectMutation.isPending ? "Preparando reconexión..." : "Reconectar Instagram"}
          </Button>
        </div>
      </div>
    );
  }

  // ── Loading state ─────────────────────────────────────────────────────────

  if (accountLoading || statsLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="h-24 animate-pulse bg-muted" />
          ))}
        </div>
        <Card className="h-64 animate-pulse bg-muted" />
      </div>
    );
  }

  // ── No data yet ───────────────────────────────────────────────────────────

  const hasData = accountStats.length > 0 || mediaStats.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">📸</span>
          <div>
            <p className="font-semibold text-foreground">
              {igAccount?.account_name ? `@${igAccount.account_name}` : "Instagram"}
            </p>
            {igAccount?.token_expiry && (
              <p className="text-xs text-muted-foreground">
                Token expira:{" "}
                {new Date(igAccount.token_expiry).toLocaleDateString("es-MX", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            )}
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refreshMutation.mutate()}
          disabled={refreshMutation.isPending}
        >
          <RefreshCw
            className={`h-4 w-4 mr-2 ${refreshMutation.isPending ? "animate-spin" : ""}`}
          />
          {refreshMutation.isPending ? "Actualizando..." : "Actualizar datos"}
        </Button>
      </div>

      {!hasData ? (
        <div className="text-center py-10 text-muted-foreground text-sm">
          <p>Aún no hay datos de Instagram.</p>
          <p className="mt-1">
            Haz clic en{" "}
            <strong>Actualizar datos</strong> para importar métricas de tu cuenta.
          </p>
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="stat-card">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-4 w-4 text-pink-500" />
                  <p className="text-xs text-muted-foreground">Seguidores</p>
                </div>
                <p className="text-2xl font-bold font-display">{fmt(latestFollowers)}</p>
              </CardContent>
            </Card>

            <Card className="stat-card">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Eye className="h-4 w-4 text-pink-500" />
                  <p className="text-xs text-muted-foreground">Alcance prom. / día</p>
                </div>
                <p className="text-2xl font-bold font-display">{fmt(Math.round(avgReach))}</p>
              </CardContent>
            </Card>

            <Card className="stat-card">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-pink-500" />
                  <p className="text-xs text-muted-foreground">Impresiones prom. / día</p>
                </div>
                <p className="text-2xl font-bold font-display">{fmt(Math.round(avgImpressions))}</p>
              </CardContent>
            </Card>

            <Card className="stat-card">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-pink-500 text-sm">📅</span>
                  <p className="text-xs text-muted-foreground">Posts este mes</p>
                </div>
                <p className="text-2xl font-bold font-display">{postsThisMonth}</p>
              </CardContent>
            </Card>
          </div>

          {/* Reach / Impressions chart */}
          {chartData.length > 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Alcance e Impresiones — últimos 30 días</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="igReach" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ec4899" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#ec4899" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="igImpressions" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis
                        dataKey="date"
                        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                      />
                      <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{
                          background: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          color: "hsl(var(--foreground))",
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="reach"
                        stroke="#ec4899"
                        fill="url(#igReach)"
                        strokeWidth={2}
                        name="Alcance"
                      />
                      <Area
                        type="monotone"
                        dataKey="impressions"
                        stroke="#8b5cf6"
                        fill="url(#igImpressions)"
                        strokeWidth={2}
                        name="Impresiones"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Posts grid */}
          {mediaStats.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-foreground">
                  Posts recientes ({mediaStats.length})
                </h3>
                {mediaStats.length > 12 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAllPosts(!showAllPosts)}
                  >
                    {showAllPosts ? "Ver menos" : `Ver todos (${mediaStats.length})`}
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {displayedPosts.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Post Card ───────────────────────────────────────────────────────────────

function PostCard({ post }: { post: MediaStat }) {
  const date = post.posted_at
    ? new Date(post.posted_at).toLocaleDateString("es-MX", {
        day: "numeric",
        month: "short",
      })
    : null;

  return (
    <Card className="overflow-hidden group hover:shadow-md transition-shadow">
      {/* Thumbnail */}
      <div className="aspect-square bg-muted relative overflow-hidden">
        {post.thumbnail_url ? (
          <img
            src={post.thumbnail_url}
            alt={post.caption?.substring(0, 40) || "Post"}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
            <span className="text-3xl">📷</span>
          </div>
        )}
        {post.media_type === "VIDEO" && (
          <Badge className="absolute top-1 right-1 text-[9px] px-1 py-0 bg-black/60 text-white border-0">
            VIDEO
          </Badge>
        )}
        {post.episode_id && (
          <Badge className="absolute bottom-1 left-1 text-[9px] px-1 py-0 bg-primary/90 text-primary-foreground border-0">
            <Link2 className="w-2.5 h-2.5 mr-0.5" />
            EP
          </Badge>
        )}
        {post.ig_permalink && (
          <a
            href={post.ig_permalink}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-colors"
          >
            <ExternalLink className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
          </a>
        )}
      </div>

      {/* Stats */}
      <CardContent className="p-2.5">
        {date && <p className="text-[10px] text-muted-foreground mb-1.5">{date}</p>}
        <div className="grid grid-cols-2 gap-x-2 gap-y-1">
          <StatItem icon={<Eye className="w-2.5 h-2.5" />} value={post.reach} />
          <StatItem icon={<Heart className="w-2.5 h-2.5" />} value={post.likes} />
          <StatItem icon={<Bookmark className="w-2.5 h-2.5" />} value={post.saves} />
          <StatItem icon={<MessageCircle className="w-2.5 h-2.5" />} value={post.comments} />
        </div>
      </CardContent>
    </Card>
  );
}

function StatItem({
  icon,
  value,
}: {
  icon: React.ReactNode;
  value: number | null;
}) {
  return (
    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
      {icon}
      <span>{value != null ? value.toLocaleString() : "—"}</span>
    </div>
  );
}
