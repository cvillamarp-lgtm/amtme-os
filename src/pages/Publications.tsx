import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Send, Plus, CheckSquare, Square, ExternalLink, Calendar, Mic } from "lucide-react";
import { TruncatedText, SubtitleClamp } from "@/components/ui/text-clamp";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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

type ChecklistItem = { id: string; label: string; done: boolean };

type PublicationWithEpisode = Tables<"publications"> & {
  episodes: {
    title: string;
    working_title: string | null;
    number: string | null;
  } | null;
};

// ── Column / Filter Config ─────────────────────────────────────────────────

export const PUB_COLUMNS = [
  { id: "platform", label: "Plataforma", sortable: true, visible: true },
  { id: "status", label: "Estado", sortable: true, visible: true },
  { id: "copy_final", label: "Copy", sortable: false, visible: true },
  { id: "scheduled_at", label: "Programada", sortable: true, visible: true },
  { id: "created_at", label: "Creada", sortable: true, visible: false },
];

const PUB_SORT_OPTIONS: SortOption[] = [
  { value: "platform", label: "Plataforma" },
  { value: "status", label: "Estado" },
  { value: "scheduled_at", label: "Fecha programada" },
  { value: "created_at", label: "Fecha de creación" },
];

const PUB_FILTER_DEFS: FilterDef[] = [
  {
    field: "status",
    label: "Estado",
    type: "select",
    options: [
      { value: "draft", label: "Borrador" },
      { value: "approved", label: "Aprobado" },
      { value: "scheduled", label: "Programado" },
      { value: "published", label: "Publicado" },
      { value: "failed", label: "Fallido" },
    ],
  },
  {
    field: "platform",
    label: "Plataforma",
    type: "select",
    options: [
      { value: "instagram_feed", label: "IG Feed" },
      { value: "instagram_reel", label: "IG Reel" },
      { value: "instagram_story", label: "IG Story" },
      { value: "tiktok", label: "TikTok" },
      { value: "youtube", label: "YouTube" },
      { value: "spotify", label: "Spotify" },
      { value: "x", label: "X" },
    ],
  },
];

const PUB_DEFAULT_VIEWS: SavedView[] = [
  {
    id: "view-all",
    name: "Todos",
    filters: [],
    sortRules: [{ field: "created_at", direction: "desc" }],
    visibleColumns: ["platform", "status", "copy_final", "scheduled_at"],
    viewType: "grid",
    isDefault: true,
  },
  {
    id: "view-draft",
    name: "Borradores",
    filters: [
      {
        id: "f-draft",
        field: "status",
        operator: "equals",
        value: "draft",
        label: "Estado: Borrador",
      },
    ],
    sortRules: [],
    visibleColumns: ["platform", "status", "copy_final", "scheduled_at"],
    viewType: "grid",
  },
  {
    id: "view-approved",
    name: "Aprobados",
    filters: [
      {
        id: "f-approved",
        field: "status",
        operator: "equals",
        value: "approved",
        label: "Estado: Aprobado",
      },
    ],
    sortRules: [],
    visibleColumns: ["platform", "status", "copy_final", "scheduled_at"],
    viewType: "grid",
  },
  {
    id: "view-published",
    name: "Publicados",
    filters: [
      {
        id: "f-published",
        field: "status",
        operator: "equals",
        value: "published",
        label: "Estado: Publicado",
      },
    ],
    sortRules: [],
    visibleColumns: ["platform", "status", "copy_final", "scheduled_at"],
    viewType: "grid",
  },
];

// ── Platform config ────────────────────────────────────────────────────────

const PLATFORMS = [
  {
    value: "instagram_feed",
    label: "IG Feed",
    color: "text-pink-400",
    bg: "bg-pink-400/10",
    border: "border-pink-400/20",
    emoji: "📸",
  },
  {
    value: "instagram_reel",
    label: "IG Reel",
    color: "text-purple-400",
    bg: "bg-purple-400/10",
    border: "border-purple-400/20",
    emoji: "🎬",
  },
  {
    value: "instagram_story",
    label: "IG Story",
    color: "text-orange-400",
    bg: "bg-orange-400/10",
    border: "border-orange-400/20",
    emoji: "⭕",
  },
  {
    value: "tiktok",
    label: "TikTok",
    color: "text-foreground",
    bg: "bg-muted",
    border: "border-border",
    emoji: "🎵",
  },
  {
    value: "youtube",
    label: "YouTube",
    color: "text-red-400",
    bg: "bg-red-400/10",
    border: "border-red-400/20",
    emoji: "▶️",
  },
  {
    value: "spotify",
    label: "Spotify",
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
    border: "border-emerald-400/20",
    emoji: "🎧",
  },
  {
    value: "x",
    label: "X",
    color: "text-sky-400",
    bg: "bg-sky-400/10",
    border: "border-sky-400/20",
    emoji: "𝕏",
  },
] as const;

type PlatformValue = (typeof PLATFORMS)[number]["value"];

function platformCfg(platform: string | null) {
  return PLATFORMS.find((p) => p.value === platform) ?? PLATFORMS[0];
}

// ── Default checklists ─────────────────────────────────────────────────────

const DEFAULT_CHECKLISTS: Record<string, ChecklistItem[]> = {
  instagram_feed: [
    { id: "copy", label: "Copy revisado", done: false },
    { id: "hashtags", label: "Hashtags optimizados (20-30)", done: false },
    { id: "asset", label: "Asset visual listo", done: false },
    { id: "schedule", label: "Horario definido", done: false },
    { id: "link_bio", label: "Link en bio actualizado", done: false },
  ],
  instagram_reel: [
    { id: "video", label: "Video editado y exportado", done: false },
    { id: "cover", label: "Portada del reel", done: false },
    { id: "copy", label: "Copy + hashtags escritos", done: false },
    { id: "audio", label: "Audio/música ajustado", done: false },
    { id: "cta", label: "CTA visible en el video", done: false },
  ],
  instagram_story: [
    { id: "asset", label: "Asset de story listo", done: false },
    { id: "link", label: "Link sticker configurado", done: false },
    { id: "sequence", label: "Secuencia de stories", done: false },
  ],
  tiktok: [
    { id: "video", label: "Video optimizado para TikTok", done: false },
    { id: "hook", label: "Hook en los primeros 3s", done: false },
    { id: "caption", label: "Caption con keywords", done: false },
    { id: "hashtags", label: "Hashtags trending", done: false },
  ],
  youtube: [
    { id: "thumbnail", label: "Thumbnail diseñada", done: false },
    { id: "title", label: "Título SEO optimizado", done: false },
    { id: "description", label: "Descripción con timestamps", done: false },
    { id: "tags", label: "Tags configurados", done: false },
    { id: "cards", label: "Cards y end screens", done: false },
  ],
  spotify: [
    { id: "upload", label: "Episodio subido", done: false },
    { id: "description", label: "Descripción editada", done: false },
    { id: "cover", label: "Portada actualizada", done: false },
    { id: "scheduled", label: "Fecha de publicación set", done: false },
  ],
  x: [
    { id: "copy", label: "Copy (280 chars)", done: false },
    { id: "media", label: "Media adjunta", done: false },
    { id: "thread", label: "Thread si aplica", done: false },
  ],
};

// ── Helpers ────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return "ahora";
  if (diff < 3600) return `hace ${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `hace ${Math.floor(diff / 86400)}d`;
  return new Date(dateStr).toLocaleDateString("es-MX", { day: "numeric", month: "short" });
}

function formatScheduled(dateStr: string | null) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusConfig(status: string | null) {
  switch (status) {
    case "draft":
      return { label: "Borrador", cls: "text-muted-foreground bg-muted border-border" };
    case "approved":
      return { label: "Aprobado", cls: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" };
    case "scheduled":
      return { label: "Programado", cls: "text-blue-400 bg-blue-400/10 border-blue-400/20" };
    case "published":
      return { label: "Publicado", cls: "text-primary bg-primary/10 border-primary/20" };
    case "failed":
      return { label: "Fallido", cls: "text-red-400 bg-red-400/10 border-red-400/20" };
    default:
      return { label: status ?? "—", cls: "text-muted-foreground bg-muted border-border" };
  }
}

function episodeLabel(ep: PublicationWithEpisode["episodes"]) {
  if (!ep) return "—";
  const num = ep.number ? `#${ep.number} ` : "";
  return `${num}${ep.working_title || ep.title}`;
}

function parseChecklist(raw: unknown): ChecklistItem[] {
  if (!raw || !Array.isArray(raw)) return [];
  return raw as ChecklistItem[];
}

// ── ChecklistEditor ────────────────────────────────────────────────────────

function ChecklistEditor({
  items,
  onChange,
}: {
  items: ChecklistItem[];
  onChange: (items: ChecklistItem[]) => void;
}) {
  const toggle = (id: string) =>
    onChange(items.map((item) => (item.id === id ? { ...item, done: !item.done } : item)));

  const done = items.filter((i) => i.done).length;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Checklist
        </p>
        <span className="text-xs text-muted-foreground tabular-nums">
          {done}/{items.length}
        </span>
      </div>
      <div className="h-1 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary/60 rounded-full transition-all"
          style={{ width: items.length ? `${(done / items.length) * 100}%` : "0%" }}
        />
      </div>
      <div className="space-y-1.5 mt-2">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            className="flex items-center gap-2 w-full text-left group"
            onClick={() => toggle(item.id)}
          >
            {item.done ? (
              <CheckSquare className="h-4 w-4 text-primary shrink-0" />
            ) : (
              <Square className="h-4 w-4 text-muted-foreground/40 group-hover:text-muted-foreground shrink-0 transition-colors" />
            )}
            <span
              className={`text-sm transition-colors ${item.done ? "line-through text-muted-foreground/40" : "text-foreground"}`}
            >
              {item.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── PublicationCard ────────────────────────────────────────────────────────

interface PubCardProps {
  pub: PublicationWithEpisode;
  onOpen: () => void;
  onStatusChange: (status: string) => void;
  selected?: boolean;
  onToggleSelect?: () => void;
}

function PublicationCard({ pub, onOpen, onStatusChange, selected, onToggleSelect }: PubCardProps) {
  const pc = platformCfg(pub.platform);
  const sc = statusConfig(pub.status);
  const checklist = parseChecklist(pub.checklist_json);
  const checkDone = checklist.filter((i) => i.done).length;
  const checkTotal = checklist.length;

  return (
    <Card
      className={`cursor-pointer hover:border-primary/30 transition-colors ${selected ? "border-primary/50 bg-primary/5" : ""}`}
      onClick={onOpen}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            {onToggleSelect && (
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleSelect();
                }}
              >
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={onToggleSelect}
                  className="h-3.5 w-3.5 rounded border-border accent-primary"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            )}
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-medium border ${pc.bg} ${pc.color} ${pc.border}`}
            >
              {pc.emoji} {pc.label}
            </span>
          </div>
          <span
            className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium border ${sc.cls}`}
          >
            {sc.label}
          </span>
        </div>

        <div className="flex items-center gap-1 mt-1">
          <Mic className="h-3 w-3 text-muted-foreground/40 shrink-0" />
          <TruncatedText className="text-xs text-muted-foreground">
            {episodeLabel(pub.episodes)}
          </TruncatedText>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {pub.copy_final ? (
          <SubtitleClamp>{pub.copy_final}</SubtitleClamp>
        ) : (
          <p className="text-xs text-muted-foreground/30 italic">Sin copy definido</p>
        )}

        {pub.scheduled_at && (
          <div className="flex items-center gap-1.5 text-xs text-blue-400">
            <Calendar className="h-3 w-3" />
            {formatScheduled(pub.scheduled_at)}
          </div>
        )}

        {checkTotal > 0 && (
          <div className="space-y-1">
            <div className="h-1 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary/60 rounded-full"
                style={{ width: `${(checkDone / checkTotal) * 100}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground">
              {checkDone}/{checkTotal} pasos
            </span>
          </div>
        )}

        <div
          className="flex items-center justify-between border-t border-border pt-2"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="text-xs text-muted-foreground">{timeAgo(pub.created_at)}</span>
          {pub.status === "draft" && (
            <button
              className="text-xs text-muted-foreground hover:text-emerald-400 transition-colors px-1.5 py-0.5 rounded"
              onClick={() => onStatusChange("approved")}
            >
              Aprobar
            </button>
          )}
          {pub.status === "approved" && (
            <button
              className="text-xs text-muted-foreground hover:text-blue-400 transition-colors px-1.5 py-0.5 rounded"
              onClick={() => onStatusChange("scheduled")}
            >
              Programar
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ── PublicationDetailSheet ─────────────────────────────────────────────────

interface PubDetailProps {
  pub: PublicationWithEpisode | null;
  open: boolean;
  onClose: () => void;
  onUpdated: () => void;
  onStatusChange: (id: string, status: string) => void;
}

function PublicationDetailSheet({ pub, open, onClose, onUpdated, onStatusChange }: PubDetailProps) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<Tables<"publications">>>({});
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);

  useEffect(() => {
    if (pub) {
      setForm({ ...pub });
      setChecklist(parseChecklist(pub.checklist_json));
      setEditing(false);
    }
  }, [pub]);

  function setField<K extends keyof Tables<"publications">>(
    key: K,
    val: Tables<"publications">[K]
  ) {
    setForm((p) => ({ ...p, [key]: val }));
  }

  const save = useMutation({
    mutationFn: async () => {
      if (!pub) return;
      const updates = {
        ...form,
        checklist_json: checklist as unknown as Tables<"publications">["checklist_json"],
      };
      const { error } = await supabase.from("publications").update(updates).eq("id", pub.id);
      if (error) throw error;
    },
    onSuccess: () => {
      onUpdated();
      setEditing(false);
      toast.success("Publicación actualizada");
    },
    onError: (e) => toast.error(e.message),
  });

  const markPublished = useMutation({
    mutationFn: async (link: string) => {
      if (!pub) return;
      const { error } = await supabase
        .from("publications")
        .update({
          status: "published",
          published_at: new Date().toISOString(),
          link_published: link || null,
          checklist_json: checklist.map((i) => ({
            ...i,
            done: true,
          })) as unknown as Tables<"publications">["checklist_json"],
        })
        .eq("id", pub.id);
      if (error) throw error;
    },
    onSuccess: () => {
      onUpdated();
      onClose();
      toast.success("¡Publicado! 🎉");
    },
    onError: (e) => toast.error(e.message),
  });

  if (!pub) return null;

  const pc = platformCfg(pub.platform);
  const sc = statusConfig(pub.status);

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto p-0 gap-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${pc.bg} ${pc.color} ${pc.border}`}
                >
                  {pc.emoji} {pc.label}
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${sc.cls}`}>
                  {sc.label}
                </span>
              </div>
              <SheetTitle className="text-sm font-medium text-muted-foreground">
                {episodeLabel(pub.episodes)}
              </SheetTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0 -mt-1"
              onClick={() => setEditing(!editing)}
            >
              {editing ? "Cancelar" : "Editar"}
            </Button>
          </div>
        </SheetHeader>

        <div className="px-6 py-5 space-y-5">
          {editing ? (
            <div className="space-y-4">
              <div>
                <Label className="text-xs">Copy final</Label>
                <Textarea
                  className="mt-1 font-mono text-xs"
                  rows={6}
                  placeholder="Escribe el copy para esta plataforma..."
                  value={form.copy_final ?? ""}
                  onChange={(e) => setField("copy_final", e.target.value)}
                />
              </div>

              <div>
                <Label className="text-xs">CTA texto</Label>
                <Input
                  className="mt-1"
                  placeholder="Ej: Escucha en Spotify → link en bio"
                  value={form.cta_text ?? ""}
                  onChange={(e) => setField("cta_text", e.target.value)}
                />
              </div>

              <div>
                <Label className="text-xs">Hashtags (separados por espacio)</Label>
                <Input
                  className="mt-1"
                  placeholder="#podcast #amtme #crecimientopersonal"
                  value={(form.hashtags ?? []).join(" ")}
                  onChange={(e) =>
                    setField(
                      "hashtags",
                      e.target.value
                        .split(/\s+/)
                        .map((h) => h.trim())
                        .filter(Boolean)
                    )
                  }
                />
              </div>

              <div>
                <Label className="text-xs">Fecha programada</Label>
                <Input
                  type="datetime-local"
                  className="mt-1"
                  value={
                    form.scheduled_at ? new Date(form.scheduled_at).toISOString().slice(0, 16) : ""
                  }
                  onChange={(e) =>
                    setField(
                      "scheduled_at",
                      e.target.value ? new Date(e.target.value).toISOString() : null
                    )
                  }
                />
              </div>

              <div>
                <Label className="text-xs">Objetivo de esta publicación</Label>
                <Input
                  className="mt-1"
                  placeholder="Ej: Llevar tráfico al episodio, generar guardados..."
                  value={form.objective ?? ""}
                  onChange={(e) => setField("objective", e.target.value)}
                />
              </div>

              <ChecklistEditor items={checklist} onChange={setChecklist} />

              <Button className="w-full" onClick={() => save.mutate()} disabled={save.isPending}>
                {save.isPending ? "Guardando..." : "Guardar cambios"}
              </Button>
            </div>
          ) : (
            <div className="space-y-5">
              {pub.copy_final ? (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                    Copy
                  </p>
                  <div className="bg-muted/40 rounded-lg p-3">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{pub.copy_final}</p>
                  </div>
                </div>
              ) : (
                <div className="bg-muted/20 rounded-lg p-4 text-center">
                  <p className="text-sm text-muted-foreground/50">
                    Sin copy — edita para agregar el texto
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4">
                {pub.cta_text && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                      CTA
                    </p>
                    <p className="text-sm">{pub.cta_text}</p>
                  </div>
                )}
                {pub.hashtags && pub.hashtags.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                      Hashtags
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {pub.hashtags.map((h) => (
                        <span
                          key={h}
                          className="text-xs text-primary bg-primary/10 px-1.5 py-0.5 rounded"
                        >
                          {h}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {pub.scheduled_at && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-blue-400" />
                  <span className="text-blue-400">
                    Programado para {formatScheduled(pub.scheduled_at)}
                  </span>
                </div>
              )}

              {pub.objective && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                    Objetivo
                  </p>
                  <p className="text-sm text-muted-foreground">{pub.objective}</p>
                </div>
              )}

              {pub.link_published && (
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 flex items-center justify-between">
                  <span className="text-sm text-primary truncate">{pub.link_published}</span>
                  <a
                    href={pub.link_published}
                    target="_blank"
                    rel="noreferrer"
                    className="ml-2 shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="h-4 w-4 text-primary" />
                  </a>
                </div>
              )}

              {checklist.length > 0 && (
                <ChecklistEditor
                  items={checklist}
                  onChange={(updated) => {
                    setChecklist(updated);
                    supabase
                      .from("publications")
                      .update({
                        checklist_json:
                          updated as unknown as Tables<"publications">["checklist_json"],
                      })
                      .eq("id", pub.id)
                      .then(({ error }) => {
                        if (!error) onUpdated();
                      });
                  }}
                />
              )}

              <div className="border-t border-border pt-4 space-y-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Acciones
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {pub.status === "draft" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        onStatusChange(pub.id, "approved");
                        onClose();
                      }}
                    >
                      Aprobar
                    </Button>
                  )}
                  {pub.status === "approved" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        onStatusChange(pub.id, "scheduled");
                        onClose();
                      }}
                    >
                      Programar
                    </Button>
                  )}
                  {(pub.status === "approved" || pub.status === "scheduled") && (
                    <MarkPublishedButton
                      onConfirm={(link) => markPublished.mutate(link)}
                      loading={markPublished.isPending}
                    />
                  )}
                  {pub.status === "published" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-400 hover:text-red-400"
                      onClick={() => {
                        onStatusChange(pub.id, "failed");
                        onClose();
                      }}
                    >
                      Reportar error
                    </Button>
                  )}
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Creada {timeAgo(pub.created_at)} · Actualizada {timeAgo(pub.updated_at)}
              </p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function MarkPublishedButton({
  onConfirm,
  loading,
}: {
  onConfirm: (link: string) => void;
  loading: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [link, setLink] = useState("");
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="col-span-2">
          <Send className="h-3.5 w-3.5 mr-2" />
          Marcar como publicado
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>¿Publicado?</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Label>
            Link de la publicación{" "}
            <span className="text-muted-foreground font-normal">(opcional)</span>
          </Label>
          <Input
            placeholder="https://www.instagram.com/p/..."
            value={link}
            onChange={(e) => setLink(e.target.value)}
            autoFocus
          />
          <Button
            className="w-full"
            onClick={() => {
              onConfirm(link);
              setOpen(false);
            }}
            disabled={loading}
          >
            {loading ? "Guardando..." : "Confirmar publicación"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Publications (main page) ───────────────────────────────────────────────

export default function Publications() {
  const [openCreate, setOpenCreate] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createPlatform, setCreatePlatform] = useState<string>("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const qc = useQueryClient();

  const { data: publications = [], isLoading } = useQuery({
    queryKey: ["publications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("publications")
        .select("*, episodes(title, working_title, number)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as PublicationWithEpisode[];
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

  const { data: platformAccounts = [] } = useQuery({
    queryKey: ["platform-accounts-active"],
    queryFn: async () => {
      const { data } = await supabase
        .from("platform_accounts")
        .select("id, account_name, platform")
        .eq("is_active", true)
        .order("platform");
      return data ?? [];
    },
  });

  const matchingAccounts = platformAccounts.filter((a) => {
    if (!createPlatform) return false;
    const base = createPlatform.split("_")[0];
    return a.platform.toLowerCase().includes(base);
  });

  const table = useSmartTable({
    data: publications,
    columns: PUB_COLUMNS,
    searchFields: ["copy_final", "platform"],
    defaultSort: [{ field: "created_at", direction: "desc" }],
    defaultViews: PUB_DEFAULT_VIEWS,
    persistKey: "amtme:list:publications:v1",
    pageSize: 50,
    defaultViewType: "grid",
  });

  const createPublication = useMutation({
    mutationFn: async (fd: FormData) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");
      const episodeId = fd.get("episode_id") as string;
      if (!episodeId) throw new Error("Selecciona un episodio");
      const platform = fd.get("platform") as PlatformValue;
      if (!platform) throw new Error("Selecciona una plataforma");
      const accountId = fd.get("account_id") as string | null;
      const selectedAccount = accountId ? platformAccounts.find((a) => a.id === accountId) : null;
      const { error } = await supabase.from("publications").insert({
        user_id: user.id,
        episode_id: episodeId,
        platform,
        copy_final: (fd.get("copy_final") as string) || null,
        status: "draft",
        checklist_json: (DEFAULT_CHECKLISTS[platform] ??
          []) as unknown as Tables<"publications">["checklist_json"],
        ...(selectedAccount && {
          metadata: { account_id: selectedAccount.id, account_name: selectedAccount.account_name },
        }),
      });
      if (error) throw error;
      setCreatePlatform("");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["publications"] });
      qc.invalidateQueries({ queryKey: ["dashboard-counts-v2"] });
      setOpenCreate(false);
      toast.success("Publicación creada con checklist");
    },
    onError: (e) => toast.error(e.message),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: Record<string, string | null> = { status };
      if (status === "published") updates.published_at = new Date().toISOString();
      const { error } = await supabase.from("publications").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["publications"] });
      qc.invalidateQueries({ queryKey: ["dashboard-counts-v2"] });
      toast.success("Estado actualizado");
    },
    onError: (e) => toast.error(e.message),
  });

  const approveBulk = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from("publications")
        .update({ status: "approved" })
        .in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["publications"] });
      qc.invalidateQueries({ queryKey: ["dashboard-counts-v2"] });
      table.clearSelection();
      toast.success("Publicaciones aprobadas");
    },
    onError: (e) => toast.error(e.message),
  });

  const exportCSV = () => {
    const selected =
      table.selectedIds.size > 0
        ? publications.filter((p) => table.selectedIds.has(p.id))
        : table.filtered;
    if (!selected.length) return;
    const headers = ["platform", "status", "copy_final", "scheduled_at", "created_at"];
    const rows = selected.map((p) =>
      headers.map((h) => {
        const val = (p as any)[h];
        return val === null || val === undefined ? "" : String(val).replace(/"/g, '""');
      })
    );
    const csv = [headers.join(","), ...rows.map((r) => r.map((v) => `"${v}"`).join(","))].join(
      "\n"
    );
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "publicaciones.csv";
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success("CSV exportado");
  };

  const selected = publications.find((p) => p.id === selectedId) ?? null;

  return (
    <div className="page-container animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Publicaciones</h1>
          <p className="page-subtitle">Planea y rastrea la distribución de cada episodio</p>
        </div>
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
            label: "Aprobar",
            onClick: () => approveBulk.mutate(Array.from(table.selectedIds)),
          },
          {
            label: "Exportar CSV",
            onClick: exportCSV,
          },
        ]}
      />

      <ListingToolbar
        searchQuery={table.searchQuery}
        onSearchChange={table.setSearchQuery}
        searchPlaceholder="Buscar publicaciones..."
        sortOptions={PUB_SORT_OPTIONS}
        currentSort={table.currentSort}
        onSortChange={table.setSortRule}
        filters={table.filters}
        onClearFilters={table.clearFilters}
        onRemoveFilter={table.removeFilter}
        totalCount={table.totalCount}
        filteredCount={table.filteredCount}
        filtersOpen={filtersOpen}
        onFiltersToggle={() => setFiltersOpen((v) => !v)}
        showViewToggle={true}
        viewType={table.viewType}
        onViewTypeChange={table.setViewType}
      >
        <Dialog
          open={openCreate}
          onOpenChange={(v) => {
            setOpenCreate(v);
            if (!v) setCreatePlatform("");
          }}
        >
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Nueva publicación
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nueva publicación</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createPublication.mutate(new FormData(e.currentTarget));
              }}
              className="space-y-4"
            >
              <div>
                <Label>Episodio *</Label>
                <Select name="episode_id" required>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Selecciona un episodio" />
                  </SelectTrigger>
                  <SelectContent>
                    {episodes.map((ep) => (
                      <SelectItem key={ep.id} value={ep.id}>
                        {ep.number ? `#${ep.number} ` : ""}
                        {ep.working_title || ep.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Plataforma *</Label>
                <Select
                  name="platform"
                  required
                  value={createPlatform}
                  onValueChange={setCreatePlatform}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Selecciona plataforma" />
                  </SelectTrigger>
                  <SelectContent>
                    {PLATFORMS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.emoji} {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {matchingAccounts.length > 0 && (
                <div>
                  <Label>
                    Cuenta <span className="text-muted-foreground font-normal">(opcional)</span>
                  </Label>
                  <Select name="account_id">
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Selecciona cuenta" />
                    </SelectTrigger>
                    <SelectContent>
                      {matchingAccounts.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.account_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <Label>
                  Copy inicial <span className="text-muted-foreground font-normal">(opcional)</span>
                </Label>
                <Textarea
                  name="copy_final"
                  placeholder="Puedes editarlo después..."
                  rows={3}
                  className="mt-1"
                />
              </div>

              <Button type="submit" className="w-full" disabled={createPublication.isPending}>
                {createPublication.isPending ? "Creando..." : "Crear publicación"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </ListingToolbar>

      <FiltersPanel
        open={filtersOpen}
        filterDefs={PUB_FILTER_DEFS}
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
          {[1, 2, 3].map((i) => (
            <Card key={i} className="h-44 animate-pulse bg-muted" />
          ))}
        </div>
      ) : table.filteredCount === 0 ? (
        <SmartEmptyState
          filtered={table.filters.length > 0 || !!table.searchQuery}
          onClearFilters={table.clearFilters}
          title="Sin publicaciones"
          description="Crea la primera publicación para un episodio"
          action={
            <Button variant="outline" size="sm" onClick={() => setOpenCreate(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Crear primera publicación
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {table.paginated.map((pub) => (
            <PublicationCard
              key={pub.id}
              pub={pub}
              onOpen={() => setSelectedId(pub.id)}
              onStatusChange={(status) => updateStatus.mutate({ id: pub.id, status })}
              selected={table.selectedIds.has(pub.id)}
              onToggleSelect={() => table.toggleSelection(pub.id)}
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.setCurrentPage(table.currentPage - 1)}
              disabled={!table.hasPrevPage}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.setCurrentPage(table.currentPage + 1)}
              disabled={!table.hasNextPage}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}

      <PublicationDetailSheet
        pub={selected}
        open={!!selectedId}
        onClose={() => setSelectedId(null)}
        onUpdated={() => qc.invalidateQueries({ queryKey: ["publications"] })}
        onStatusChange={(id, status) => updateStatus.mutate({ id, status })}
      />
    </div>
  );
}
