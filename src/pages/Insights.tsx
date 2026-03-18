import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FlaskConical, Plus, Mic, TrendingUp, CheckCircle2, XCircle, Beaker, Wand2, Loader2, Sparkles } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { invokeEdgeFunction } from "@/services/functions/invokeEdgeFunction";
import { getEdgeFunctionErrorMessage } from "@/services/functions/edgeFunctionErrors";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";
import { useSmartTable } from "@/hooks/useSmartTable";
import {
  ListingToolbar,
  FiltersPanel,
  ViewsTabs,
  BulkActionsBar,
  SmartEmptyState,
} from "@/components/smart-table";
import type { FilterDef, SortOption, SavedView } from "@/components/smart-table";

// ── Types ──────────────────────────────────────────────────────────────────

type InsightWithEpisode = Tables<"insights"> & {
  episodes: { title: string; working_title: string | null; number: string | null } | null;
};

// ── Config ─────────────────────────────────────────────────────────────────

export const INSIGHT_COLUMNS = [
  { id: 'finding', label: 'Observación', sortable: false, visible: true },
  { id: 'confidence_level', label: 'Confianza', sortable: true, visible: true },
  { id: 'status', label: 'Estado', sortable: true, visible: true },
  { id: 'category', label: 'Categoría', sortable: true, visible: false },
  { id: 'created_at', label: 'Fecha', sortable: true, visible: false },
];

const INSIGHT_SORT_OPTIONS: SortOption[] = [
  { value: 'confidence_level', label: 'Confianza' },
  { value: 'status', label: 'Estado' },
  { value: 'category', label: 'Categoría' },
  { value: 'created_at', label: 'Fecha' },
];

const INSIGHT_FILTER_DEFS: FilterDef[] = [
  {
    field: 'status',
    label: 'Estado',
    type: 'select',
    options: [
      { value: 'active', label: 'Activo' },
      { value: 'experimenting', label: 'Experimentando' },
      { value: 'accepted', label: 'Aceptado' },
      { value: 'discarded', label: 'Descartado' },
    ],
  },
  {
    field: 'confidence_level',
    label: 'Confianza',
    type: 'select',
    options: [
      { value: 'low', label: 'Baja' },
      { value: 'medium', label: 'Media' },
      { value: 'high', label: 'Alta' },
      { value: 'confirmed', label: 'Confirmada' },
    ],
  },
];

const INSIGHT_DEFAULT_VIEWS: SavedView[] = [];

const STATUS_CONFIG = {
  active:        { label: "Activo",         cls: "text-blue-400 bg-blue-400/10 border-blue-400/20",     icon: TrendingUp },
  experimenting: { label: "Experimentando", cls: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20", icon: Beaker },
  accepted:      { label: "Aceptado",       cls: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20", icon: CheckCircle2 },
  discarded:     { label: "Descartado",     cls: "text-muted-foreground/50 bg-muted/30 border-border/40",  icon: XCircle },
} as const;

const CONFIDENCE_CONFIG = {
  low:       { label: "Baja",      cls: "text-muted-foreground",  bar: "bg-muted-foreground/30", pct: 25 },
  medium:    { label: "Media",     cls: "text-yellow-400",         bar: "bg-yellow-400",          pct: 50 },
  high:      { label: "Alta",      cls: "text-orange-400",         bar: "bg-orange-400",          pct: 75 },
  confirmed: { label: "Confirmada",cls: "text-emerald-400",        bar: "bg-emerald-400",         pct: 100 },
} as const;

function statusCfg(s: string | null) {
  return STATUS_CONFIG[s as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.active;
}
function confidenceCfg(c: string | null) {
  return CONFIDENCE_CONFIG[c as keyof typeof CONFIDENCE_CONFIG] ?? CONFIDENCE_CONFIG.medium;
}

function timeAgo(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return "ahora";
  if (diff < 3600) return `hace ${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `hace ${Math.floor(diff / 86400)}d`;
  return new Date(dateStr).toLocaleDateString("es-MX", { day: "numeric", month: "short" });
}

function episodeLabel(ep: InsightWithEpisode["episodes"]) {
  if (!ep) return null;
  const num = ep.number ? `#${ep.number} ` : "";
  return `${num}${ep.working_title || ep.title}`;
}

// ── InsightCard ────────────────────────────────────────────────────────────

interface InsightCardProps {
  insight: InsightWithEpisode;
  onOpen: () => void;
  onStatusChange: (status: string) => void;
  selected?: boolean;
  onToggleSelect?: () => void;
}

function InsightCard({ insight, onOpen, onStatusChange, selected, onToggleSelect }: InsightCardProps) {
  const sc = statusCfg(insight.status);
  const cc = confidenceCfg(insight.confidence_level);
  const StatusIcon = sc.icon;

  return (
    <Card className={`cursor-pointer hover:border-primary/30 transition-colors ${selected ? 'border-primary/50 bg-primary/5' : ''}`} onClick={onOpen}>
      <CardHeader className="pb-2">
        <div className="flex items-start gap-2">
          {onToggleSelect && (
            <div onClick={(e) => { e.stopPropagation(); onToggleSelect(); }}>
              <input
                type="checkbox"
                checked={selected}
                onChange={onToggleSelect}
                className="h-3.5 w-3.5 rounded border-border accent-primary mt-0.5"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}
          <StatusIcon className={`h-4 w-4 shrink-0 mt-0.5 ${sc.cls.split(" ")[0]}`} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium leading-snug line-clamp-2">{insight.finding}</p>
          </div>
          <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium border ${sc.cls}`}>
            {sc.label}
          </span>
        </div>

        {insight.episodes && (
          <div className="flex items-center gap-1 mt-0.5 ml-6">
            <Mic className="h-3 w-3 text-muted-foreground/40 shrink-0" />
            <span className="text-xs text-muted-foreground line-clamp-1">
              {episodeLabel(insight.episodes)}
            </span>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-3">
        {insight.hypothesis && (
          <p className="text-xs text-muted-foreground line-clamp-2 italic">
            → {insight.hypothesis}
          </p>
        )}

        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Confianza</span>
            <span className={`text-xs font-medium ${cc.cls}`}>{cc.label}</span>
          </div>
          <div className="h-1 bg-muted rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${cc.bar}`} style={{ width: `${cc.pct}%` }} />
          </div>
        </div>

        {insight.recommendation && (
          <div className="flex items-start gap-1.5 bg-primary/5 rounded-md p-2">
            <TrendingUp className="h-3 w-3 text-primary shrink-0 mt-0.5" />
            <p className="text-xs text-primary line-clamp-2">{insight.recommendation}</p>
          </div>
        )}

        <div
          className="flex items-center justify-between border-t border-border pt-2"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="text-xs text-muted-foreground">{timeAgo(insight.created_at)}</span>
          <div className="flex gap-1">
            {insight.status === "active" && (
              <button
                className="text-xs text-muted-foreground hover:text-yellow-400 transition-colors px-1.5 py-0.5 rounded"
                onClick={() => onStatusChange("experimenting")}
              >
                Experimentar
              </button>
            )}
            {insight.status === "experimenting" && (
              <>
                <button
                  className="text-xs text-muted-foreground hover:text-emerald-400 transition-colors px-1.5 py-0.5 rounded"
                  onClick={() => onStatusChange("accepted")}
                >
                  Confirmar
                </button>
                <button
                  className="text-xs text-muted-foreground hover:text-muted-foreground/60 transition-colors px-1.5 py-0.5 rounded"
                  onClick={() => onStatusChange("discarded")}
                >
                  Descartar
                </button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── InsightDetailSheet ─────────────────────────────────────────────────────

interface InsightDetailProps {
  insight: InsightWithEpisode | null;
  open: boolean;
  onClose: () => void;
  onUpdated: () => void;
  onStatusChange: (id: string, status: string) => void;
}

function InsightDetailSheet({ insight, open, onClose, onUpdated, onStatusChange }: InsightDetailProps) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<Tables<"insights">>>({});

  useEffect(() => {
    if (insight) { setForm({ ...insight }); setEditing(false); }
  }, [insight?.id]);

  function setField<K extends keyof Tables<"insights">>(key: K, val: Tables<"insights">[K]) {
    setForm((p) => ({ ...p, [key]: val }));
  }

  const save = useMutation({
    mutationFn: async (updates: Partial<Tables<"insights">>) => {
      if (!insight) return;
      const { error } = await supabase.from("insights").update(updates).eq("id", insight.id);
      if (error) throw error;
    },
    onSuccess: () => { onUpdated(); setEditing(false); toast.success("Insight actualizado"); },
    onError: (e) => toast.error(e.message),
  });

  if (!insight) return null;
  const sc = statusCfg(insight.status);
  const cc = confidenceCfg(insight.confidence_level);
  const StatusIcon = sc.icon;

  const SectionLabel = ({ children }: { children: React.ReactNode }) => (
    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">{children}</p>
  );

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto p-0 gap-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2 flex-1">
              <StatusIcon className={`h-5 w-5 shrink-0 mt-0.5 ${sc.cls.split(" ")[0]}`} />
              <SheetTitle className="text-sm font-medium leading-snug">{insight.finding}</SheetTitle>
            </div>
            <Button variant="ghost" size="sm" className="shrink-0 -mt-1" onClick={() => setEditing(!editing)}>
              {editing ? "Cancelar" : "Editar"}
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${sc.cls}`}>{sc.label}</span>
            <span className={`text-xs font-medium ${cc.cls}`}>Confianza: {cc.label}</span>
            {insight.source === "auto_detected" && (
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">Auto-detectado</span>
            )}
          </div>
          {insight.episodes && (
            <div className="flex items-center gap-1 mt-1">
              <Mic className="h-3 w-3 text-muted-foreground/40" />
              <span className="text-xs text-muted-foreground">{episodeLabel(insight.episodes)}</span>
            </div>
          )}
        </SheetHeader>

        <div className="px-6 py-5 space-y-5">
          {editing ? (
            <div className="space-y-4">
              <div>
                <Label className="text-xs">Hallazgo / Observación *</Label>
                <Textarea className="mt-1" rows={2} placeholder="¿Qué observaste concretamente?" value={form.finding ?? ""} onChange={(e) => setField("finding", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Hipótesis</Label>
                <Textarea className="mt-1" rows={2} placeholder="¿Por qué crees que ocurre esto?" value={form.hypothesis ?? ""} onChange={(e) => setField("hypothesis", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Recomendación</Label>
                <Textarea className="mt-1" rows={2} placeholder="¿Qué cambiarías en el próximo episodio?" value={form.recommendation ?? ""} onChange={(e) => setField("recommendation", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Evidencia</Label>
                <Textarea className="mt-1" rows={2} placeholder="Datos, comentarios, métricas que lo sustentan..." value={form.evidence ?? ""} onChange={(e) => setField("evidence", e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Confianza</Label>
                  <Select value={form.confidence_level ?? "medium"} onValueChange={(v) => setField("confidence_level", v)}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Baja</SelectItem>
                      <SelectItem value="medium">Media</SelectItem>
                      <SelectItem value="high">Alta</SelectItem>
                      <SelectItem value="confirmed">Confirmada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Estado</Label>
                  <Select value={form.status ?? "active"} onValueChange={(v) => setField("status", v)}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Activo</SelectItem>
                      <SelectItem value="experimenting">Experimentando</SelectItem>
                      <SelectItem value="accepted">Aceptado</SelectItem>
                      <SelectItem value="discarded">Descartado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button className="w-full" onClick={() => save.mutate(form)} disabled={save.isPending}>
                {save.isPending ? "Guardando..." : "Guardar cambios"}
              </Button>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="space-y-4">
                <div className="bg-muted/40 rounded-lg p-3 border-l-2 border-primary/40">
                  <SectionLabel>Hallazgo</SectionLabel>
                  <p className="text-sm">{insight.finding}</p>
                </div>

                {insight.hypothesis && (
                  <div>
                    <SectionLabel>Hipótesis</SectionLabel>
                    <p className="text-sm text-muted-foreground italic">"{insight.hypothesis}"</p>
                  </div>
                )}

                {insight.evidence && (
                  <div>
                    <SectionLabel>Evidencia</SectionLabel>
                    <p className="text-sm">{insight.evidence}</p>
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <SectionLabel>Nivel de confianza</SectionLabel>
                    <span className={`text-xs font-medium ${cc.cls}`}>{cc.label}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${cc.bar}`} style={{ width: `${cc.pct}%` }} />
                  </div>
                </div>

                {insight.recommendation && (
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                    <SectionLabel>Recomendación</SectionLabel>
                    <p className="text-sm font-medium text-primary">{insight.recommendation}</p>
                  </div>
                )}
              </div>

              <div className="border-t border-border pt-4 space-y-3">
                <SectionLabel>Acciones</SectionLabel>
                <div className="grid grid-cols-2 gap-2">
                  {insight.status === "active" && (
                    <Button variant="outline" size="sm" onClick={() => { onStatusChange(insight.id, "experimenting"); onClose(); }}>
                      <Beaker className="h-3.5 w-3.5 mr-1.5" />Experimentar
                    </Button>
                  )}
                  {insight.status === "experimenting" && (
                    <>
                      <Button size="sm" onClick={() => { onStatusChange(insight.id, "accepted"); onClose(); }}>
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />Confirmar
                      </Button>
                      <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => { onStatusChange(insight.id, "discarded"); onClose(); }}>
                        <XCircle className="h-3.5 w-3.5 mr-1.5" />Descartar
                      </Button>
                    </>
                  )}
                  {insight.status === "discarded" && (
                    <Button variant="outline" size="sm" onClick={() => { onStatusChange(insight.id, "active"); onClose(); }}>
                      Reactivar
                    </Button>
                  )}
                  {insight.status === "accepted" && (
                    <div className="col-span-2 flex items-center gap-2 text-emerald-400 text-xs bg-emerald-400/5 border border-emerald-400/20 rounded-lg p-3">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Este insight está siendo aplicado en tu proceso</span>
                    </div>
                  )}
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Creado {timeAgo(insight.created_at)} · Actualizado {timeAgo(insight.updated_at)}
              </p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ── Insights (main page) ───────────────────────────────────────────────────

export default function Insights() {
  const [openCreate, setOpenCreate] = useState(false);
  const [openExtract, setOpenExtract] = useState(false);
  const [extractEpisodeId, setExtractEpisodeId] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const qc = useQueryClient();

  const extractFromScript = async () => {
    if (!extractEpisodeId) return;
    setIsExtracting(true);

    try {
      const { data: ep, error: epError } = await supabase
        .from("episodes")
        .select("id, title, working_title, number, script_generated, script_base")
        .eq("id", extractEpisodeId)
        .single();
      if (epError) throw epError;

      const script = ep.script_generated || ep.script_base;
      if (!script || script.trim().length < 50) {
        toast.error("Este episodio no tiene guión generado");
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error("No autenticado"); return; }

      const result = await invokeEdgeFunction<{
        insights?: Array<{ hypothesis: string; category: string; potential_action: string }>;
      }>("extract-from-script", {
        script,
        mode: "insights",
        episode_title: ep.title || ep.working_title,
        episode_number: ep.number,
      });
      const insightItems = (result.insights || []) as Array<{
        hypothesis: string;
        category: string;
        potential_action: string;
      }>;

      if (insightItems.length === 0) {
        toast.error("No se encontraron insights en el guión");
        return;
      }

      const rows = insightItems.map((item) => ({
        user_id: session.user.id,
        episode_id: extractEpisodeId,
        finding: item.hypothesis,
        hypothesis: item.hypothesis,
        recommendation: item.potential_action || null,
        confidence_level: "medium",
        status: "active" as const,
        source: "ai_extracted",
        category: item.category || null,
      }));

      const { error: insertError } = await supabase.from("insights").insert(rows);
      if (insertError) throw insertError;

      qc.invalidateQueries({ queryKey: ["insights"] });
      qc.invalidateQueries({ queryKey: ["dashboard-counts-v2"] });
      toast.success(`${rows.length} insights extraídos del guión`);
      setOpenExtract(false);
      setExtractEpisodeId("");
    } catch (e: unknown) {
      toast.error(getEdgeFunctionErrorMessage(e));
    } finally {
      setIsExtracting(false);
    }
  };

  const { data: insights = [], isLoading } = useQuery({
    queryKey: ["insights"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("insights")
        .select("*, episodes(title, working_title, number)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as InsightWithEpisode[];
    },
  });

  const { data: episodes = [] } = useQuery({
    queryKey: ["episodes-for-select"],
    queryFn: async () => {
      const { data } = await supabase
        .from("episodes")
        .select("id, title, working_title, number")
        .order("created_at", { ascending: false })
        .limit(50);
      return data ?? [];
    },
  });

  const table = useSmartTable({
    data: insights,
    columns: INSIGHT_COLUMNS,
    searchFields: ['finding', 'hypothesis', 'recommendation'],
    defaultSort: [{ field: 'created_at', direction: 'desc' }],
    defaultViews: INSIGHT_DEFAULT_VIEWS,
    persistKey: 'amtme:list:insights:v1',
    pageSize: 50,
    defaultViewType: 'grid',
  });

  const createInsight = useMutation({
    mutationFn: async (fd: FormData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");
      const episodeId = fd.get("episode_id") as string;
      const { error } = await supabase.from("insights").insert({
        user_id: user.id,
        finding: fd.get("finding") as string,
        hypothesis: (fd.get("hypothesis") as string) || null,
        recommendation: (fd.get("recommendation") as string) || null,
        confidence_level: (fd.get("confidence_level") as string) || "medium",
        episode_id: episodeId || null,
        status: "active",
        source: "manual",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["insights"] });
      setOpenCreate(false);
      toast.success("Insight capturado");
    },
    onError: (e) => toast.error(e.message),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("insights").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["insights"] });
      toast.success("Estado actualizado");
    },
    onError: (e) => toast.error(e.message),
  });

  const discardBulk = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from("insights").update({ status: 'discarded' }).in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["insights"] });
      table.clearSelection();
      toast.success("Insights descartados");
    },
    onError: (e) => toast.error(e.message),
  });

  const selected = insights.find((i) => i.id === selectedId) ?? null;

  const acceptedCount = insights.filter((i) => i.status === "accepted").length;
  const experimentingCount = insights.filter((i) => i.status === "experimenting").length;

  return (
    <div className="page-container animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Insights</h1>
          <p className="page-subtitle">Loop de aprendizaje — qué funciona y por qué</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={openExtract} onOpenChange={setOpenExtract}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Wand2 className="h-4 w-4" />Extraer del guión
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-sm">
              <DialogHeader>
                <DialogTitle className="font-display">Extraer insights con IA</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <p className="text-sm text-muted-foreground">
                  Selecciona un episodio con guión generado. La IA identificará hipótesis de aprendizaje y acciones para validarlas.
                </p>
                <div className="space-y-1.5">
                  <Label>Episodio *</Label>
                  <Select value={extractEpisodeId} onValueChange={setExtractEpisodeId}>
                    <SelectTrigger className="text-xs"><SelectValue placeholder="Seleccionar episodio..." /></SelectTrigger>
                    <SelectContent>
                      {episodes.map((ep) => (
                        <SelectItem key={ep.id} value={ep.id} className="text-xs">
                          {ep.number ? `#${ep.number} ` : ""}{ep.working_title || ep.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setOpenExtract(false)} disabled={isExtracting}>Cancelar</Button>
                  <Button onClick={extractFromScript} disabled={!extractEpisodeId || isExtracting} className="gap-2">
                    {isExtracting
                      ? <><Loader2 className="h-4 w-4 animate-spin" />Extrayendo...</>
                      : <><Sparkles className="h-4 w-4" />Extraer</>}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={openCreate} onOpenChange={setOpenCreate}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-2" />Nuevo insight</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Capturar insight</DialogTitle>
              </DialogHeader>
              <form
                onSubmit={(e) => { e.preventDefault(); createInsight.mutate(new FormData(e.currentTarget)); }}
                className="space-y-4"
              >
                <div>
                  <Label>Hallazgo *</Label>
                  <Textarea name="finding" placeholder="¿Qué observaste?" rows={2} required autoFocus className="mt-1" />
                </div>
                <div>
                  <Label>Hipótesis <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                  <Textarea name="hypothesis" placeholder="¿Por qué crees que ocurre esto?" rows={2} className="mt-1" />
                </div>
                <div>
                  <Label>Recomendación <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                  <Input name="recommendation" placeholder="¿Qué cambiarías?" className="mt-1" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Confianza</Label>
                    <Select name="confidence_level" defaultValue="medium">
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Baja</SelectItem>
                        <SelectItem value="medium">Media</SelectItem>
                        <SelectItem value="high">Alta</SelectItem>
                        <SelectItem value="confirmed">Confirmada</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Episodio</Label>
                    <Select name="episode_id" defaultValue="">
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Ninguno" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Sin episodio</SelectItem>
                        {episodes.map((ep) => (
                          <SelectItem key={ep.id} value={ep.id}>
                            {ep.number ? `#${ep.number} ` : ""}{ep.working_title || ep.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={createInsight.isPending}>
                  {createInsight.isPending ? "Guardando..." : "Capturar insight"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {insights.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-muted/40 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold tabular-nums">{insights.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Insights totales</p>
          </div>
          <div className="bg-yellow-400/5 border border-yellow-400/20 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold tabular-nums text-yellow-400">{experimentingCount}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Experimentando</p>
          </div>
          <div className="bg-emerald-400/5 border border-emerald-400/20 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold tabular-nums text-emerald-400">{acceptedCount}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Confirmados</p>
          </div>
        </div>
      )}

      <BulkActionsBar
        selectedCount={table.selectedIds.size}
        totalCount={table.filteredCount}
        onSelectAll={table.selectAll}
        onClearSelection={table.clearSelection}
        isAllSelected={table.isAllSelected}
        isIndeterminate={table.isIndeterminate}
        actions={[
          {
            label: 'Descartar seleccionados',
            variant: 'destructive',
            onClick: () => discardBulk.mutate(Array.from(table.selectedIds)),
          },
        ]}
      />

      <ListingToolbar
        searchQuery={table.searchQuery}
        onSearchChange={table.setSearchQuery}
        searchPlaceholder="Buscar insights..."
        sortOptions={INSIGHT_SORT_OPTIONS}
        currentSort={table.currentSort}
        onSortChange={table.setSortRule}
        filters={table.filters}
        onClearFilters={table.clearFilters}
        onRemoveFilter={table.removeFilter}
        totalCount={table.totalCount}
        filteredCount={table.filteredCount}
        filtersOpen={filtersOpen}
        onFiltersToggle={() => setFiltersOpen(v => !v)}
        showViewToggle={true}
        viewType={table.viewType}
        onViewTypeChange={table.setViewType}
      />

      <FiltersPanel
        open={filtersOpen}
        filterDefs={INSIGHT_FILTER_DEFS}
        activeFilters={table.filters}
        onAddFilter={table.addFilter}
        onRemoveFilter={table.removeFilter}
        onClearAll={table.clearFilters}
      />

      <ViewsTabs
        views={table.views}
        activeViewId={table.activeViewId}
        onApplyView={table.applyView}
        onSaveView={table.saveView}
        onDeleteView={table.deleteView}
        onReset={table.resetToDefault}
      />

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <Card key={i} className="h-40 animate-pulse bg-muted" />)}
        </div>
      ) : table.filteredCount === 0 ? (
        <SmartEmptyState
          filtered={table.filters.length > 0 || !!table.searchQuery}
          onClearFilters={table.clearFilters}
          title="Aún no hay insights"
          description="Captura tu primera observación sobre un episodio"
          action={
            <Button variant="outline" size="sm" onClick={() => setOpenCreate(true)}>
              <Plus className="h-4 w-4 mr-2" />Capturar primer insight
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {table.paginated.map((insight) => (
            <InsightCard
              key={insight.id}
              insight={insight}
              onOpen={() => setSelectedId(insight.id)}
              onStatusChange={(status) => updateStatus.mutate({ id: insight.id, status })}
              selected={table.selectedIds.has(insight.id)}
              onToggleSelect={() => table.toggleSelection(insight.id)}
            />
          ))}
        </div>
      )}

      {table.totalPages > 1 && (
        <div className="flex items-center justify-between pt-4">
          <span className="text-xs text-muted-foreground">
            Página {table.currentPage + 1} de {table.totalPages}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => table.setCurrentPage(table.currentPage - 1)} disabled={!table.hasPrevPage}>
              Anterior
            </Button>
            <Button variant="outline" size="sm" onClick={() => table.setCurrentPage(table.currentPage + 1)} disabled={!table.hasNextPage}>
              Siguiente
            </Button>
          </div>
        </div>
      )}

      <InsightDetailSheet
        insight={selected}
        open={!!selectedId}
        onClose={() => setSelectedId(null)}
        onUpdated={() => qc.invalidateQueries({ queryKey: ["insights"] })}
        onStatusChange={(id, status) => updateStatus.mutate({ id, status })}
      />
    </div>
  );
}
