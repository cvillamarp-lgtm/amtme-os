import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Tables } from "@/integrations/supabase/types";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, ExternalLink, Users, TrendingUp, Heart, Trash2, Link2, Unlink, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";

type PlatformAccount = Tables<"platform_accounts">;

type AccountMeta = {
  url?: string;
  followers?: number;
  following?: number;
  avg_reach?: number;
  avg_engagement?: number;
  notes?: string;
};

const PLATFORM_CONFIG: Record<string, {
  label: string;
  emoji: string;
  bg: string;
  text: string;
  border: string;
  supportsOAuth: boolean;
}> = {
  instagram:  { label: "Instagram",   emoji: "📸", bg: "bg-pink-500/10",    text: "text-pink-600",    border: "border-pink-200",  supportsOAuth: true  },
  tiktok:     { label: "TikTok",      emoji: "🎵", bg: "bg-slate-800/10",   text: "text-slate-700",   border: "border-slate-300", supportsOAuth: true  },
  youtube:    { label: "YouTube",     emoji: "▶️",  bg: "bg-red-500/10",     text: "text-red-600",     border: "border-red-200",   supportsOAuth: true  },
  spotify:    { label: "Spotify",     emoji: "🎙️", bg: "bg-green-500/10",   text: "text-green-600",   border: "border-green-200", supportsOAuth: false },
  x:          { label: "X / Twitter", emoji: "✖️",  bg: "bg-zinc-800/10",    text: "text-zinc-700",    border: "border-zinc-300",  supportsOAuth: false },
  linkedin:   { label: "LinkedIn",    emoji: "💼", bg: "bg-blue-600/10",    text: "text-blue-700",    border: "border-blue-200",  supportsOAuth: false },
  threads:    { label: "Threads",     emoji: "🧵", bg: "bg-gray-700/10",    text: "text-gray-700",    border: "border-gray-300",  supportsOAuth: false },
  facebook:   { label: "Facebook",    emoji: "👥", bg: "bg-blue-500/10",    text: "text-blue-600",    border: "border-blue-200",  supportsOAuth: false },
};

function getMeta(account: PlatformAccount): AccountMeta {
  if (!account.metadata || typeof account.metadata !== "object" || Array.isArray(account.metadata)) return {};
  return account.metadata as AccountMeta;
}

function formatNumber(n: number | undefined): string {
  if (!n) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function PlatformBadge({ platform }: { platform: string }) {
  const cfg = PLATFORM_CONFIG[platform] ?? { label: platform, emoji: "🔗", bg: "bg-secondary", text: "text-foreground", border: "border-border" };
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
      {cfg.emoji} {cfg.label}
    </span>
  );
}

function OAuthStatus({ account, onConnect, connecting }: {
  account: PlatformAccount;
  onConnect: () => void;
  connecting: boolean;
}) {
  const cfg = PLATFORM_CONFIG[account.platform];
  if (!cfg?.supportsOAuth) return null;

  if (account.oauth_connected) {
    const expiry = account.token_expiry ? new Date(account.token_expiry) : null;
    const expired = expiry && expiry < new Date();
    return (
      <div className={`flex items-center gap-1.5 text-[11px] ${expired ? "text-amber-500" : "text-emerald-500"}`}>
        {expired ? (
          <><AlertCircle className="h-3 w-3" />Token expirado</>
        ) : (
          <><CheckCircle2 className="h-3 w-3" />Conectado vía OAuth</>
        )}
        {expired && (
          <button
            onClick={(e) => { e.stopPropagation(); onConnect(); }}
            className="ml-1 underline underline-offset-2 hover:opacity-80"
          >
            Reconectar
          </button>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={(e) => { e.stopPropagation(); onConnect(); }}
      disabled={connecting}
      className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
    >
      {connecting ? (
        <><Loader2 className="h-3 w-3 animate-spin" />Conectando...</>
      ) : (
        <><Link2 className="h-3 w-3" />Conectar OAuth</>
      )}
    </button>
  );
}

function AccountCard({ account, onClick, onConnect, connecting }: {
  account: PlatformAccount;
  onClick: () => void;
  onConnect: () => void;
  connecting: boolean;
}) {
  const meta = getMeta(account);

  return (
    <div
      className={`surface rounded-xl border p-5 cursor-pointer hover:border-primary/30 transition-all ${!account.is_active ? "opacity-60" : ""}`}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <PlatformBadge platform={account.platform} />
        <div className="flex items-center gap-2">
          {!account.is_active && (
            <Badge variant="outline" className="text-[10px]">Inactiva</Badge>
          )}
          {meta.url && (
            <a
              href={meta.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      </div>

      {/* Account name */}
      <div className="mb-3">
        <p className="text-base font-semibold text-foreground">@{account.account_name}</p>
        {account.account_id && (
          <p className="text-xs text-muted-foreground mt-0.5">ID: {account.account_id}</p>
        )}
      </div>

      {/* OAuth status */}
      <div className="mb-3">
        <OAuthStatus account={account} onConnect={onConnect} connecting={connecting} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="text-center rounded-lg bg-secondary/50 p-2">
          <Users className="h-3 w-3 text-muted-foreground mx-auto mb-0.5" />
          <div className="text-sm font-bold text-foreground">{formatNumber(meta.followers)}</div>
          <div className="text-[9px] text-muted-foreground">Seguidores</div>
        </div>
        <div className="text-center rounded-lg bg-secondary/50 p-2">
          <TrendingUp className="h-3 w-3 text-muted-foreground mx-auto mb-0.5" />
          <div className="text-sm font-bold text-foreground">{formatNumber(meta.avg_reach)}</div>
          <div className="text-[9px] text-muted-foreground">Alcance prom.</div>
        </div>
        <div className="text-center rounded-lg bg-secondary/50 p-2">
          <Heart className="h-3 w-3 text-muted-foreground mx-auto mb-0.5" />
          <div className="text-sm font-bold text-foreground">
            {meta.avg_engagement ? `${meta.avg_engagement.toFixed(1)}%` : "—"}
          </div>
          <div className="text-[9px] text-muted-foreground">Engagement</div>
        </div>
      </div>

      {/* Notes preview */}
      {meta.notes && (
        <p className="text-[11px] text-muted-foreground mt-3 line-clamp-2">{meta.notes}</p>
      )}
    </div>
  );
}

function AccountDetailSheet({
  account,
  onClose,
}: {
  account: PlatformAccount | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const meta = account ? getMeta(account) : {};

  const [platform, setPlatform] = useState(account?.platform ?? "instagram");
  const [accountName, setAccountName] = useState(account?.account_name ?? "");
  const [accountId, setAccountId] = useState(account?.account_id ?? "");
  const [isActive, setIsActive] = useState(account?.is_active ?? true);
  const [url, setUrl] = useState(meta.url ?? "");
  const [followers, setFollowers] = useState(meta.followers?.toString() ?? "");
  const [following, setFollowing] = useState(meta.following?.toString() ?? "");
  const [avgReach, setAvgReach] = useState(meta.avg_reach?.toString() ?? "");
  const [avgEngagement, setAvgEngagement] = useState(meta.avg_engagement?.toString() ?? "");
  const [notes, setNotes] = useState(meta.notes ?? "");

  const buildMeta = (): AccountMeta => ({
    url: url || undefined,
    followers: followers ? parseInt(followers) : undefined,
    following: following ? parseInt(following) : undefined,
    avg_reach: avgReach ? parseInt(avgReach) : undefined,
    avg_engagement: avgEngagement ? parseFloat(avgEngagement) : undefined,
    notes: notes || undefined,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!account?.id) return;
      const { error } = await supabase.from("platform_accounts").update({
        platform,
        account_name: accountName,
        account_id: accountId || null,
        is_active: isActive,
        metadata: buildMeta() as any,
      }).eq("id", account.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform-accounts"] });
      toast.success("Cuenta actualizada");
      onClose();
    },
    onError: () => toast.error("Error al guardar"),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!account?.id) return;
      const { error } = await supabase.from("platform_accounts").delete().eq("id", account.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform-accounts"] });
      toast.success("Cuenta eliminada");
      onClose();
    },
    onError: () => toast.error("Error al eliminar"),
  });

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      if (!account?.id) return;
      const { error } = await supabase.from("platform_accounts").update({
        oauth_connected: false,
        access_token: null,
        refresh_token: null,
        token_expiry: null,
        connected_at: null,
      }).eq("id", account.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform-accounts"] });
      toast.success("OAuth desconectado");
    },
    onError: () => toast.error("Error al desconectar"),
  });

  if (!account) return null;

  return (
    <Sheet open={!!account} onOpenChange={() => onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle className="font-display">Editar cuenta</SheetTitle>
        </SheetHeader>

        <div className="space-y-5">
          {/* OAuth status banner */}
          {PLATFORM_CONFIG[account.platform]?.supportsOAuth && (
            <div className={`rounded-lg p-3 border text-sm flex items-center justify-between gap-3 ${
              account.oauth_connected
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600"
                : "bg-muted border-border text-muted-foreground"
            }`}>
              <div className="flex items-center gap-2">
                {account.oauth_connected ? (
                  <><CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span>
                      Conectado vía OAuth
                      {account.connected_at && (
                        <span className="text-[11px] ml-1 opacity-70">
                          · {new Date(account.connected_at).toLocaleDateString("es-MX")}
                        </span>
                      )}
                    </span>
                  </>
                ) : (
                  <><Unlink className="h-4 w-4 shrink-0" />Sin conexión OAuth — las publicaciones deben marcarse manualmente</>
                )}
              </div>
              {account.oauth_connected && (
                <button
                  onClick={() => disconnectMutation.mutate()}
                  disabled={disconnectMutation.isPending}
                  className="text-[11px] underline underline-offset-2 hover:opacity-70 shrink-0"
                >
                  Desconectar
                </button>
              )}
            </div>
          )}

          {/* Platform + Active */}
          <div className="flex items-center justify-between">
            <div className="space-y-1.5 flex-1 mr-4">
              <Label>Plataforma</Label>
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PLATFORM_CONFIG).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.emoji} {v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 text-center">
              <Label>Activa</Label>
              <div className="pt-1">
                <Switch checked={isActive} onCheckedChange={setIsActive} />
              </div>
            </div>
          </div>

          {/* Identity */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Usuario / Handle *</Label>
              <Input value={accountName} onChange={(e) => setAccountName(e.target.value)} placeholder="@usuario" />
            </div>
            <div className="space-y-1.5">
              <Label>ID de cuenta</Label>
              <Input value={accountId} onChange={(e) => setAccountId(e.target.value)} placeholder="ID numérico" />
            </div>
          </div>

          {/* URL */}
          <div className="space-y-1.5">
            <Label>URL del perfil</Label>
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." />
          </div>

          {/* Stats */}
          <div className="surface rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Métricas de la cuenta</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Seguidores</Label>
                <Input type="number" value={followers} onChange={(e) => setFollowers(e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Siguiendo</Label>
                <Input type="number" value={following} onChange={(e) => setFollowing(e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Alcance promedio</Label>
                <Input type="number" value={avgReach} onChange={(e) => setAvgReach(e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Engagement % promedio</Label>
                <Input type="number" step="0.1" value={avgEngagement} onChange={(e) => setAvgEngagement(e.target.value)} placeholder="0.0" />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label>Notas</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Observaciones sobre esta cuenta..." />
          </div>

          {/* Actions */}
          <div className="flex justify-between items-center pt-2 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              className="text-destructive border-destructive/30 hover:bg-destructive/10"
              onClick={() => {
                if (confirm("¿Eliminar esta cuenta?")) deleteMutation.mutate();
              }}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />Eliminar
            </Button>
            <Button onClick={() => saveMutation.mutate()} disabled={!accountName.trim() || saveMutation.isPending}>
              {saveMutation.isPending ? "Guardando..." : "Guardar cambios"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default function PlatformAccounts() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selected, setSelected] = useState<PlatformAccount | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);

  // Create form
  const [newPlatform, setNewPlatform] = useState("instagram");
  const [newUsername, setNewUsername] = useState("");
  const [newUrl, setNewUrl] = useState("");

  // Handle OAuth redirect results
  useEffect(() => {
    const oauthSuccess = searchParams.get("oauth_success");
    const oauthError = searchParams.get("oauth_error");

    if (oauthSuccess) {
      const cfg = PLATFORM_CONFIG[oauthSuccess];
      toast.success(`${cfg?.emoji ?? ""} ${cfg?.label ?? oauthSuccess} conectado correctamente`);
      qc.invalidateQueries({ queryKey: ["platform-accounts"] });
      setSearchParams({}, { replace: true });
    }
    if (oauthError) {
      toast.error(`Error al conectar: ${decodeURIComponent(oauthError)}`);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams]);

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ["platform-accounts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_accounts")
        .select("*")
        .order("platform");
      if (error) throw error;
      return (data || []) as PlatformAccount[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("No user");
      const { error } = await supabase.from("platform_accounts").insert({
        user_id: user.id,
        platform: newPlatform,
        account_name: newUsername,
        is_active: true,
        metadata: newUrl ? { url: newUrl } : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform-accounts"] });
      toast.success("Cuenta añadida");
      setCreateOpen(false);
      setNewPlatform("instagram");
      setNewUsername("");
      setNewUrl("");
    },
    onError: () => toast.error("Error al crear la cuenta"),
  });

  // Trigger OAuth flow for a platform
  const connectOAuth = async (platform: string) => {
    if (!user) return;
    setConnectingPlatform(platform);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke("oauth-init", {
        body: { platform, user_id: user.id },
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined,
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      // Redirect to OAuth provider
      window.location.href = data.url;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al iniciar OAuth");
      setConnectingPlatform(null);
    }
  };

  const activeAccounts = accounts.filter((a) => a.is_active);
  const connectedAccounts = accounts.filter((a) => a.oauth_connected);
  const totalFollowers = accounts.reduce((sum, a) => {
    const meta = getMeta(a);
    return sum + (meta.followers ?? 0);
  }, 0);
  const avgEngagement = accounts.length > 0
    ? accounts.reduce((sum, a) => {
        const meta = getMeta(a);
        return sum + (meta.avg_engagement ?? 0);
      }, 0) / accounts.filter((a) => getMeta(a).avg_engagement).length || 0
    : 0;

  return (
    <div className="page-container animate-fade-in">
      <PageHeader
        title="Cuentas de Plataformas"
        subtitle="Gestiona tus perfiles y conéctalos vía OAuth para publicar automáticamente."
        actions={
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />Añadir cuenta
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-sm">
              <DialogHeader>
                <DialogTitle className="font-display">Nueva cuenta</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <Label>Plataforma *</Label>
                  <Select value={newPlatform} onValueChange={setNewPlatform}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PLATFORM_CONFIG).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v.emoji} {v.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Usuario / Handle *</Label>
                  <Input value={newUsername} onChange={(e) => setNewUsername(e.target.value)} placeholder="@amtme" />
                </div>
                <div className="space-y-1.5">
                  <Label>URL del perfil</Label>
                  <Input value={newUrl} onChange={(e) => setNewUrl(e.target.value)} placeholder="https://..." />
                </div>
                {PLATFORM_CONFIG[newPlatform]?.supportsOAuth && (
                  <p className="text-xs text-muted-foreground bg-muted rounded-lg p-3">
                    💡 Después de añadir la cuenta, haz clic en "Conectar OAuth" para autorizar publicaciones automáticas vía API.
                  </p>
                )}
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
                  <Button
                    onClick={() => createMutation.mutate()}
                    disabled={!newUsername.trim() || createMutation.isPending}
                  >
                    {createMutation.isPending ? "Guardando..." : "Añadir"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Plataformas",      value: accounts.length,                                          color: "text-foreground" },
          { label: "OAuth conectadas", value: connectedAccounts.length,                                 color: "text-emerald-500" },
          { label: "Total seguidores", value: formatNumber(totalFollowers),                             color: "text-blue-500" },
          { label: "Engagement prom.", value: avgEngagement ? `${avgEngagement.toFixed(1)}%` : "—",    color: "text-yellow-500" },
        ].map((s) => (
          <div key={s.label} className="surface rounded-xl p-4 text-center">
            <div className={`text-2xl font-display font-bold ${s.color}`}>{s.value}</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* OAuth setup instructions */}
      {accounts.some((a) => PLATFORM_CONFIG[a.platform]?.supportsOAuth && !a.oauth_connected) && (
        <div className="surface rounded-xl p-4 border-amber-500/20 bg-amber-500/5 text-sm text-amber-600 space-y-1">
          <p className="font-medium">Conecta tus cuentas vía OAuth para publicar automáticamente</p>
          <p className="text-xs text-amber-600/70">
            Requiere registrar una app en el portal de desarrolladores de cada plataforma y agregar las variables de entorno
            <code className="mx-1 px-1 bg-amber-500/10 rounded">INSTAGRAM_CLIENT_ID</code>,
            <code className="mx-1 px-1 bg-amber-500/10 rounded">INSTAGRAM_CLIENT_SECRET</code>, etc. en
            Supabase → Settings → Edge Functions → Secrets.
          </p>
        </div>
      )}

      {/* Grid */}
      {isLoading ? (
        <LoadingSkeleton count={4} variant="card" />
      ) : accounts.length === 0 ? (
        <EmptyState
          icon={Users}
          message="Sin cuentas registradas — añade tus perfiles de redes sociales"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {accounts.map((account) => (
            <AccountCard
              key={account.id}
              account={account}
              onClick={() => setSelected(account)}
              onConnect={() => connectOAuth(account.platform)}
              connecting={connectingPlatform === account.platform}
            />
          ))}
        </div>
      )}

      <AccountDetailSheet account={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
