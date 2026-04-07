import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Tables } from "@/integrations/supabase/types";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { invokeEdgeFunction } from "@/services/functions/invokeEdgeFunction";
import { isAuthError, showEdgeFunctionError } from "@/services/functions/edgeFunctionErrors";
import { Plus, Quote, Star, CheckCircle2, Archive, Sparkles, Clock, Mic, Loader2, Wand2 } from "lucide-react";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { useSmartTable } from "@/hooks/useSmartTable";
import {
  ListingToolbar,
  FiltersPanel,
  ViewsTabs,
  BulkActionsBar,
  SmartEmptyState,
} from "@/components/smart-table";
import type { FilterDef, SortOption, SavedView } from "@/components/smart-table";

type QuoteWithEpisode = Tables<"quote_candidates"> & {
  episodes: { title: string | null; working_title: string | null; number: string | null } | null;
};

// ─── Config ────────────────────────────────────────────────────────────────

export const QUOTE_COLUMNS = [
  { id: 'text', label: 'Cita', sortable: false, visible: true },
  { id: 'quote_type', label: 'Tipo', sortable: true, visible: true },
  { id: 'score_total', label: 'Score', sortable: true, visible: true },
  { id: 'status', label: 'Estado', sortable: true, visible: true },
  { id: 'timestamp_ref', label: 'Timestamp', sortable: false, visible: false },
  { id: 'created_at', label: 'Fecha', sortable: true, visible: false },
];

const QUOTE_SORT_OPTIONS: SortOption[] = [
  { value: 'score_total', label: 'Score' },
  { value: 'status', label: 'Estado' },
  { value: 'quote_type', label: 'Tipo' },
  { value: 'created_at', label: 'Fecha' },
];

const QUOTE_FILTER_DEFS: FilterDef[] = [
  {
    field: 'status',
    label: 'Estado',
    type: 'select',
    options: [
      { value: 'captured', label: 'Capturada' },
      { value: 'approved', label: 'Aprobada' },
      { value: 'used', label: 'Usada' },
      { value: 'discarded', label: 'Descartada' },
    ],
  },
  {
    field: 'quote_type',
    label: 'Tipo',
    type: 'select',
    options: [
      { value: 'hook', label: 'Hook' },
      { value: 'opening', label: 'Apertura' },
      { value: 'closing', label: 'Cierre' },
      { value: 'social', label: 'Social' },
      { value: 'bridge', label: 'Puente' },
      { value: 'punchline', label: 'Punchline' },
      { value: 'revelation', label: 'Revelación' },
      { value: 'question', label: 'Pregunta' },
    ],
  },
  {
    field: 'score_total',
    label: 'Score mínimo',
    type: 'number_range',
    min: 0,
    max: 5,
  },
];

const QUOTE_DEFAULT_VIEWS: SavedView[] = [];

const STATUS_CONFIG: Record<string, { label: string; color: string; badgeVariant: "default" | "secondary" | "outline" | "destructive" }> = {
  captured:  { label: "Capturada",  color: "text-blue-500",   badgeVariant: "secondary" },
  approved:  { label: "Aprobada",   color: "text-green-500",  badgeVariant: "default" },
  used:      { label: "Usada",      color: "text-purple-500", badgeVariant: "outline" },
  discarded: { label: "Descartada", color: "text-muted-foreground", badgeVariant: "outline" },
};

const QUOTE_TYPES: Record<string, string> = {
  hook:        "🎣 Hook",
  opening:     "🔓 Apertura",
  closing:     "🔒 Cierre",
  social:      "📱 Social",
  bridge:      "🌉 Puente",
  punchline:   "💥 Punchline",
  revelation:  "💡 Revelación",
  question:    "❓ Pregunta",
};

const SCORE_FIELDS: { key: keyof Tables<"quote_candidates">; label: string; color: string }[] = [
  { key: "clarity",           label: "Claridad",    color: "bg-blue-500" },
  { key: "emotional_intensity", label: "Emoción",   color: "bg-red-500" },
  { key: "memorability",      label: "Memorable",   color: "bg-yellow-500" },
  { key: "shareability",      label: "Compartible", color: "bg-green-500" },
  { key: "visual_fit",        label: "Visual",      color: "bg-purple-500" },
];

function ScoreBar({ value, color }: { value: number | null; color: string }) {
  const pct = ((value ?? 0) / 5) * 100;
  return (
    <div className="h-1.5 flex-1 rounded-full bg-secondary overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function QuoteCard({ q, onClick, selected, onToggleSelect }: { q: QuoteWithEpisode; onClick: () => void; selected?: boolean; onToggleSelect?: () => void }) {
  const status = STATUS_CONFIG[q.status ?? "captured"] ?? STATUS_CONFIG.captured;
  const qtype = q.quote_type ? QUOTE_TYPES[q.quote_type] : null;
  const episodeLabel = q.episodes
    ? (q.episodes.title || q.episodes.working_title || "Sin título") + (q.episodes.number ? ` #${q.episodes.number}` : "")
    : null;

  return (
    <div
      className={`surface p-5 cursor-pointer hover:border-primary/30 transition-all group rounded-xl border ${selected ? 'border-primary/50 bg-primary/5' : 'border-border'}`}
      onClick={onClick}
    >
      <div className="flex gap-3 mb-4">
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
        <Quote className="h-4 w-4 text-primary/40 shrink-0 mt-0.5" />
        <p className="text-sm text-foreground leading-relaxed line-clamp-3 italic">
          {q.text}
        </p>
      </div>

      <div className="flex items-center gap-2 flex-wrap mb-3">
        <Badge variant={status.badgeVariant} className="text-xs">
          {status.label}
        </Badge>
        {qtype && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
            {qtype}
          </span>
        )}
        {q.timestamp_ref && (
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-2.5 w-2.5" />{q.timestamp_ref}
          </span>
        )}
      </div>

      {episodeLabel && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
          <Mic className="h-3 w-3" />
          <span className="truncate">{episodeLabel}</span>
        </div>
      )}

      {q.score_total !== null && (
        <div className="flex items-center gap-2">
          <Star className="h-3 w-3 text-yellow-500 shrink-0" />
          <div className="flex-1 flex gap-1">
            {SCORE_FIELDS.map((f) => (
              <ScoreBar key={f.key} value={q[f.key] as number | null} color={f.color} />
            ))}
          </div>
          <span className="text-xs font-bold text-foreground">{q.score_total?.toFixed(1)}</span>
        </div>
      )}
    </div>
  );
}

function ScoreEditor({
  label, value, onChange, color,
}: { label: string; value: number; onChange: (v: number) => void; color: string }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <Label className="text-xs">{label}</Label>
        <span className="text-xs font-bold text-foreground">{value}/5</span>
      </div>
      <div className="flex items-center gap-3">
        <Slider min={0} max={5} step={0.5} value={[value]} onValueChange={([v]) => onChange(v)} className="flex-1" />
        <div className={`h-2 w-2 rounded-full ${color}`} />
      </div>
    </div>
  );
}

function QuoteDetailSheet({
  quote, onClose, episodes,
}: {
  quote: QuoteWithEpisode | null;
  onClose: () => void;
  episodes: { id: string; title: string | null; working_title: string | null; number: string | null }[];
}) {
  const qc = useQueryClient();
  const { user } = useAuth();

  const [text, setText] = useState(quote?.text ?? "");
  const [status] = useState(quote?.status ?? "captured");
  const [quoteType, setQuoteType] = useState(quote?.quote_type ?? "");
  const [timestampRef, setTimestampRef] = useState(quote?.timestamp_ref ?? "");
  const [assignedFormat, setAssignedFormat] = useState(quote?.assigned_format ?? "");
  const [episodeId, setEpisodeId] = useState<string | null>(quote?.episode_id ?? null);
  const [scores, setScores] = useState({
    clarity:            (quote?.clarity ?? 3) as number,
    emotional_intensity:(quote?.emotional_intensity ?? 3) as number,
    memorability:       (quote?.memorability ?? 3) as number,
    shareability:       (quote?.shareability ?? 3) as number,
    visual_fit:         (quote?.visual_fit ?? 3) as number,
  });

  const scoreTotal = Object.values(scores).reduce((a, b) => a + b, 0) / SCORE_FIELDS.length;

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!quote?.id || !user) return;
      const { error } = await supabase.from("quote_candidates").update({
        text,
        status,
        quote_type: quoteType || null,
        timestamp_ref: timestampRef || null,
        assigned_format: assignedFormat || null,
        episode_id: episodeId || null,
        ...scores,
        score_total: scoreTotal,
      }).eq("id", quote.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quote-candidates"] });
      toast.success("Cita actualizada");
      onClose();
    },
    onError: () => toast.error("Error al guardar"),
  });

  const statusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      if (!quote?.id) return;
      const { error } = await supabase.from("quote_candidates").update({ status: newStatus }).eq("id", quote.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quote-candidates"] });
      toast.success("Estado actualizado");
    },
  });

  if (!quote) return null;

  return (
    <Sheet open={!!quote} onOpenChange={() => onClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle className="font-display">Editar cita</SheetTitle>
        </SheetHeader>

        <div className="space-y-6">
          <div className="space-y-1.5">
            <Label>Texto de la cita *</Label>
            <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={5} placeholder="Escribe aquí la cita textual..." className="text-sm leading-relaxed font-medium italic" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Episodio</Label>
              <Select value={episodeId ?? ""} onValueChange={(v) => setEpisodeId(v || null)}>
                <SelectTrigger className="text-xs"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent>
                  {episodes.map((ep) => (
                    <SelectItem key={ep.id} value={ep.id} className="text-xs">
                      {ep.number ? `#${ep.number} ` : ""}{ep.title || ep.working_title || "Sin título"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Timestamp (ej. 12:34)</Label>
              <Input value={timestampRef} onChange={(e) => setTimestampRef(e.target.value)} placeholder="00:00" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Tipo de cita</Label>
              <Select value={quoteType} onValueChange={setQuoteType}>
                <SelectTrigger className="text-xs"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent>
                  {Object.entries(QUOTE_TYPES).map(([k, v]) => (
                    <SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Formato asignado</Label>
              <Input value={assignedFormat} onChange={(e) => setAssignedFormat(e.target.value)} placeholder="ej. carrusel, reel..." />
            </div>
          </div>

          <div className="surface rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Star className="h-4 w-4 text-yellow-500" />
                Puntuación
              </h3>
              <span className="text-lg font-display font-bold text-foreground">
                {scoreTotal.toFixed(1)}<span className="text-xs text-muted-foreground">/5</span>
              </span>
            </div>
            {SCORE_FIELDS.map((f) => (
              <ScoreEditor
                key={f.key}
                label={f.label}
                value={scores[f.key as keyof typeof scores]}
                onChange={(v) => setScores((prev) => ({ ...prev, [f.key]: v }))}
                color={f.color}
              />
            ))}
          </div>

          <div className="flex gap-2 flex-wrap">
            {quote.status !== "approved" && (
              <Button size="sm" variant="outline" className="text-green-600 border-green-200 hover:bg-green-50"
                onClick={() => statusMutation.mutate("approved")}>
                <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />Aprobar
              </Button>
            )}
            {quote.status !== "used" && (
              <Button size="sm" variant="outline" className="text-purple-600 border-purple-200 hover:bg-purple-50"
                onClick={() => statusMutation.mutate("used")}>
                <Sparkles className="h-3.5 w-3.5 mr-1.5" />Marcar usada
              </Button>
            )}
            {quote.status !== "discarded" && (
              <Button size="sm" variant="outline" className="text-muted-foreground"
                onClick={() => statusMutation.mutate("discarded")}>
                <Archive className="h-3.5 w-3.5 mr-1.5" />Descartar
              </Button>
            )}
          </div>

          <div className="flex justify-end pt-2 border-t border-border">
            <Button onClick={() => saveMutation.mutate()} disabled={!text.trim() || !episodeId || saveMutation.isPending}>
              {saveMutation.isPending ? "Guardando..." : "Guardar cambios"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default function QuoteCandidates() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<QuoteWithEpisode | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [extractOpen, setExtractOpen] = useState(false);
  const [extractEpisodeId, setExtractEpisodeId] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [newText, setNewText] = useState("");
  const [newEpisodeId, setNewEpisodeId] = useState("");
  const [newType, setNewType] = useState("");
  const [newTimestamp, setNewTimestamp] = useState("");

  const extractFromScript = async () => {
    if (!extractEpisodeId || !user) return;
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

      const result = await invokeEdgeFunction<{
        quotes?: Array<{ text: string; quote_type: string; timestamp_hint: string }>;
      }>("extract-from-script", {
        script,
        mode: "quotes",
        episode_title: ep.title || ep.working_title,
        episode_number: ep.number,
      });
      const quotes = (result.quotes || []) as Array<{
        text: string;
        quote_type: string;
        timestamp_hint: string;
      }>;

      if (quotes.length === 0) {
        toast.error("No se encontraron citas en el guión");
        return;
      }

      const rows = quotes.map((q) => ({
        user_id: user.id,
        episode_id: extractEpisodeId,
        text: q.text,
        quote_type: q.quote_type || null,
        timestamp_ref: q.timestamp_hint || null,
        status: "captured" as const,
        clarity: 3,
        emotional_intensity: 3,
        memorability: 3,
        shareability: 3,
        visual_fit: 3,
        score_total: 3,
      }));

      const { error: insertError } = await supabase.from("quote_candidates").insert(rows);
      if (insertError) throw insertError;

      qc.invalidateQueries({ queryKey: ["quote-candidates"] });
      qc.invalidateQueries({ queryKey: ["dashboard-counts-v2"] });
      toast.success(`${rows.length} citas extraídas del guión`);
      setExtractOpen(false);
      setExtractEpisodeId("");
    } catch (e: unknown) {
      if (isAuthError(e)) { showEdgeFunctionError(e); return; }
      toast.error(e instanceof Error ? e.message : "Error al extraer citas");
    } finally {
      setIsExtracting(false);
    }
  };

  const { data: episodes = [] } = useQuery({
    queryKey: ["episodes-for-select"],
    queryFn: async () => {
      const { data } = await supabase
        .from("episodes")
        .select("id, title, working_title, number")
        .order("number", { ascending: false });
      return data || [];
    },
  });

  const { data: quotes = [], isLoading } = useQuery({
    queryKey: ["quote-candidates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quote_candidates")
        .select("*, episodes(title, working_title, number)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as QuoteWithEpisode[];
    },
  });

  const table = useSmartTable({
    data: quotes,
    columns: QUOTE_COLUMNS,
    searchFields: ['text'],
    defaultSort: [{ field: 'score_total', direction: 'desc' }],
    defaultViews: QUOTE_DEFAULT_VIEWS,
    persistKey: 'amtme:list:quotes:v1',
    pageSize: 50,
    defaultViewType: 'grid',
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("No user");
      const { error } = await supabase.from("quote_candidates").insert({
        user_id: user.id,
        text: newText,
        episode_id: newEpisodeId,
        quote_type: newType || null,
        timestamp_ref: newTimestamp || null,
        status: "captured",
        clarity: 3,
        emotional_intensity: 3,
        memorability: 3,
        shareability: 3,
        visual_fit: 3,
        score_total: 3,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quote-candidates"] });
      toast.success("Cita capturada");
      setCreateOpen(false);
      setNewText("");
      setNewEpisodeId("");
      setNewType("");
      setNewTimestamp("");
    },
    onError: () => toast.error("Error al crear la cita"),
  });

  const approveBulk = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from("quote_candidates").update({ status: 'approved' }).in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quote-candidates"] });
      table.clearSelection();
      toast.success("Citas aprobadas");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const discardBulk = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from("quote_candidates").update({ status: 'discarded' }).in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quote-candidates"] });
      table.clearSelection();
      toast.success("Citas descartadas");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const counts = {
    all:      quotes.length,
    captured: quotes.filter((q) => q.status === "captured").length,
    approved: quotes.filter((q) => q.status === "approved").length,
    used:     quotes.filter((q) => q.status === "used").length,
  };

  return (
    <div className="page-container animate-fade-in">
      <PageHeader
        title="Banco de Citas"
        subtitle="Captura y puntúa frases memorables de tus episodios para reutilizarlas como contenido."
        actions={
          <div className="flex gap-2">
            <Dialog open={extractOpen} onOpenChange={setExtractOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="gap-2">
                  <Wand2 className="h-4 w-4" />Extraer del guión
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                  <DialogTitle className="font-display">Extraer citas con IA</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <p className="text-sm text-muted-foreground">
                    Selecciona un episodio con guión generado. La IA extraerá automáticamente las frases más poderosas como candidatas a citas.
                  </p>
                  <div className="space-y-1.5">
                    <Label>Episodio *</Label>
                    <Select value={extractEpisodeId} onValueChange={setExtractEpisodeId}>
                      <SelectTrigger className="text-xs"><SelectValue placeholder="Seleccionar episodio..." /></SelectTrigger>
                      <SelectContent>
                        {episodes.map((ep) => (
                          <SelectItem key={ep.id} value={ep.id} className="text-xs">
                            {ep.number ? `#${ep.number} ` : ""}{ep.title || ep.working_title || "Sin título"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" onClick={() => setExtractOpen(false)} disabled={isExtracting}>Cancelar</Button>
                    <Button onClick={extractFromScript} disabled={!extractEpisodeId || isExtracting} className="gap-2">
                      {isExtracting
                        ? <><Loader2 className="h-4 w-4 animate-spin" />Extrayendo...</>
                        : <><Sparkles className="h-4 w-4" />Extraer</>}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />Capturar cita
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="font-display">Nueva cita</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="space-y-1.5">
                    <Label>Texto *</Label>
                    <Textarea value={newText} onChange={(e) => setNewText(e.target.value)} rows={4} placeholder="Escribe la frase textual aquí..." className="italic" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Episodio *</Label>
                      <Select value={newEpisodeId} onValueChange={setNewEpisodeId}>
                        <SelectTrigger className="text-xs"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                        <SelectContent>
                          {episodes.map((ep) => (
                            <SelectItem key={ep.id} value={ep.id} className="text-xs">
                              {ep.number ? `#${ep.number} ` : ""}{ep.title || ep.working_title || "Sin título"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Tipo</Label>
                      <Select value={newType} onValueChange={setNewType}>
                        <SelectTrigger className="text-xs"><SelectValue placeholder="Opcional..." /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(QUOTE_TYPES).map(([k, v]) => (
                            <SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Timestamp (ej. 12:34)</Label>
                    <Input value={newTimestamp} onChange={(e) => setNewTimestamp(e.target.value)} placeholder="00:00" />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
                    <Button onClick={() => createMutation.mutate()} disabled={!newText.trim() || !newEpisodeId || createMutation.isPending}>
                      {createMutation.isPending ? "Guardando..." : "Capturar"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total", value: counts.all, color: "text-foreground" },
          { label: "Capturadas", value: counts.captured, color: "text-blue-500" },
          { label: "Aprobadas", value: counts.approved, color: "text-green-500" },
          { label: "Usadas", value: counts.used, color: "text-purple-500" },
        ].map((s) => (
          <div key={s.label} className="surface rounded-xl p-4 text-center">
            <div className={`text-2xl font-display font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      <BulkActionsBar
        selectedCount={table.selectedIds.size}
        totalCount={table.filteredCount}
        onSelectAll={table.selectAll}
        onClearSelection={table.clearSelection}
        isAllSelected={table.isAllSelected}
        isIndeterminate={table.isIndeterminate}
        actions={[
          {
            label: 'Aprobar',
            icon: <CheckCircle2 className="h-3.5 w-3.5" />,
            onClick: () => approveBulk.mutate(Array.from(table.selectedIds)),
          },
          {
            label: 'Descartar',
            variant: 'destructive',
            icon: <Archive className="h-3.5 w-3.5" />,
            onClick: () => discardBulk.mutate(Array.from(table.selectedIds)),
          },
        ]}
      />

      <ListingToolbar
        searchQuery={table.searchQuery}
        onSearchChange={table.setSearchQuery}
        searchPlaceholder="Buscar en citas..."
        sortOptions={QUOTE_SORT_OPTIONS}
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
        filterDefs={QUOTE_FILTER_DEFS}
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
        <LoadingSkeleton count={6} variant="card" />
      ) : table.filteredCount === 0 ? (
        <SmartEmptyState
          filtered={table.filters.length > 0 || !!table.searchQuery}
          onClearFilters={table.clearFilters}
          title="No hay citas"
          description="Captura frases memorables de tus episodios para reutilizarlas como contenido"
          action={
            <Button variant="outline" size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />Capturar cita
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {table.paginated.map((q) => (
            <QuoteCard
              key={q.id}
              q={q}
              onClick={() => setSelected(q)}
              selected={table.selectedIds.has(q.id)}
              onToggleSelect={() => table.toggleSelection(q.id)}
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

      <QuoteDetailSheet
        quote={selected}
        onClose={() => setSelected(null)}
        episodes={episodes}
      />
    </div>
  );
}
