import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Lightbulb, Plus, Search } from "lucide-react";
import { TitleClamp, TruncatedText } from "@/components/ui/text-clamp";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

// ── Helpers ────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return "ahora";
  if (diff < 3600) return `hace ${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `hace ${Math.floor(diff / 86400)}d`;
  return new Date(dateStr).toLocaleDateString("es-MX", { day: "numeric", month: "short" });
}

function statusConfig(status: string | null) {
  switch (status) {
    case "captured":   return { label: "Capturada",  cls: "text-muted-foreground bg-muted border-border" };
    case "evaluating": return { label: "Evaluando",  cls: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20" };
    case "approved":   return { label: "Aprobada",   cls: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" };
    case "in_brief":   return { label: "En Brief",   cls: "text-blue-400 bg-blue-400/10 border-blue-400/20" };
    case "backlog":    return { label: "Backlog",     cls: "text-purple-400 bg-purple-400/10 border-purple-400/20" };
    case "archived":   return { label: "Archivada",  cls: "text-muted-foreground bg-muted/30 border-border/40" };
    default:           return { label: status ?? "—", cls: "text-muted-foreground bg-muted border-border" };
  }
}

function urgencyConfig(urgency: string | null) {
  switch (urgency) {
    case "low":    return { label: "Baja",    cls: "text-muted-foreground" };
    case "medium": return { label: "Media",   cls: "text-yellow-400" };
    case "high":   return { label: "Alta",    cls: "text-orange-400" };
    case "urgent": return { label: "Urgente", cls: "text-red-400" };
    default:       return { label: "—",       cls: "text-muted-foreground" };
  }
}

// ── ScoreDots ──────────────────────────────────────────────────────────────

function ScoreDots({ value, max = 5 }: { value: number | null; max?: number }) {
  const v = value ?? 0;
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <div
          key={i}
          className={`h-1.5 w-1.5 rounded-full transition-colors ${i < v ? "bg-primary" : "bg-muted-foreground/20"}`}
        />
      ))}
    </div>
  );
}

// ── IdeaCard ───────────────────────────────────────────────────────────────

interface IdeaCardProps {
  idea: Tables<"ideas">;
  onOpen: () => void;
  onStatusChange: (status: string) => void;
}

function IdeaCard({ idea, onOpen, onStatusChange }: IdeaCardProps) {
  const sc = statusConfig(idea.status);
  const uc = urgencyConfig(idea.urgency_level);

  return (
    <Card
      className="cursor-pointer hover:border-primary/30 transition-colors"
      onClick={onOpen}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <TitleClamp className="text-sm flex-1" lines={2}>{idea.title}</TitleClamp>
          <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium border ${sc.cls}`}>
            {sc.label}
          </span>
        </div>
        {(idea.theme || idea.emotional_theme) && (
          <TruncatedText className="text-xs text-muted-foreground">
            {[idea.theme, idea.emotional_theme].filter(Boolean).join(" · ")}
          </TruncatedText>
        )}
      </CardHeader>

      <CardContent className="space-y-3">
        {idea.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{idea.description}</p>
        )}

        <div className="flex items-end justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-16">Contenido</span>
              <ScoreDots value={idea.content_potential_score} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-16">Derivados</span>
              <ScoreDots value={idea.derivative_potential_score} />
            </div>
          </div>
          <span className={`text-xs font-medium ${uc.cls}`}>{uc.label}</span>
        </div>

        {idea.tags && idea.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {idea.tags.slice(0, 3).map((t) => (
              <Badge key={t} variant="secondary" className="text-xs px-1.5 py-0">{t}</Badge>
            ))}
            {idea.tags.length > 3 && (
              <span className="text-xs text-muted-foreground">+{idea.tags.length - 3}</span>
            )}
          </div>
        )}

        {/* Quick action row */}
        <div
          className="flex items-center justify-between border-t border-border pt-2"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="text-xs text-muted-foreground">{timeAgo(idea.created_at)}</span>
          <div className="flex gap-1">
            {idea.status === "captured" && (
              <button
                className="text-xs text-muted-foreground hover:text-yellow-400 transition-colors px-1.5 py-0.5 rounded hover:bg-yellow-400/10"
                onClick={() => onStatusChange("evaluating")}
              >
                Evaluar
              </button>
            )}
            {idea.status === "evaluating" && (
              <button
                className="text-xs text-muted-foreground hover:text-emerald-400 transition-colors px-1.5 py-0.5 rounded hover:bg-emerald-400/10"
                onClick={() => onStatusChange("approved")}
              >
                Aprobar
              </button>
            )}
            {!["archived", "in_brief"].includes(idea.status ?? "") && (
              <button
                className="text-xs text-muted-foreground hover:text-muted-foreground transition-colors px-1.5 py-0.5 rounded"
                onClick={() => onStatusChange("archived")}
              >
                Archivar
              </button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── IdeaDetailSheet ────────────────────────────────────────────────────────

interface IdeaDetailSheetProps {
  idea: Tables<"ideas"> | null;
  open: boolean;
  onClose: () => void;
  onUpdated: () => void;
  onStatusChange: (id: string, status: string) => void;
}

function IdeaDetailSheet({ idea, open, onClose, onUpdated, onStatusChange }: IdeaDetailSheetProps) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<Tables<"ideas">>>({});

  useEffect(() => {
    if (idea) {
      setForm({ ...idea });
      setEditing(false);
    }
  }, [idea?.id]);

  const save = useMutation({
    mutationFn: async (updates: Partial<Tables<"ideas">>) => {
      if (!idea) return;
      const { error } = await supabase.from("ideas").update(updates).eq("id", idea.id);
      if (error) throw error;
    },
    onSuccess: () => {
      onUpdated();
      setEditing(false);
      toast.success("Idea actualizada");
    },
    onError: (e) => toast.error(e.message),
  });

  const convertToBrief = useMutation({
    mutationFn: async () => {
      if (!idea) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");
      const { error: briefErr } = await supabase.from("briefs").insert({
        user_id: user.id,
        idea_id: idea.id,
        title: idea.title,
        // Transfer all available idea fields to brief
        thesis: idea.description || null,
        angle: idea.theme || null,
        emotional_transformation: idea.emotional_theme || null,
        audience: idea.audience_fit || null,
        keywords: idea.tags || [],
        notes: idea.notes || null,
        status: "draft",
      });
      if (briefErr) throw briefErr;
      const { error: ideaErr } = await supabase.from("ideas").update({ status: "in_brief" }).eq("id", idea.id);
      if (ideaErr) throw ideaErr;
    },
    onSuccess: () => {
      onUpdated();
      qc.invalidateQueries({ queryKey: ["briefs"] });
      qc.invalidateQueries({ queryKey: ["dashboard-counts-v2"] });
      onClose();
      navigate("/briefs");
      toast.success("Brief creado con los datos de la idea");
    },
    onError: (e) => toast.error(e.message),
  });

  const sc = statusConfig(idea?.status ?? null);
  const uc = urgencyConfig(idea?.urgency_level ?? null);

  function setField<K extends keyof Tables<"ideas">>(key: K, value: Tables<"ideas">[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  if (!idea) return null;

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto space-y-0 gap-0 p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
          <div className="flex items-start justify-between gap-3">
            <SheetTitle className="text-base leading-snug flex-1">{idea.title}</SheetTitle>
            <Button variant="ghost" size="sm" className="shrink-0 -mt-1" onClick={() => setEditing(!editing)}>
              {editing ? "Cancelar" : "Editar"}
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${sc.cls}`}>{sc.label}</span>
            <span className={`text-xs font-medium ${uc.cls}`}>⚡ {uc.label}</span>
            {idea.origin && (
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{idea.origin}</span>
            )}
          </div>
        </SheetHeader>

        <div className="px-6 py-5 space-y-5">
          {editing ? (
            /* ── Edit form ── */
            <div className="space-y-4">
              <div>
                <Label className="text-xs">Título</Label>
                <Input className="mt-1" value={form.title ?? ""} onChange={(e) => setField("title", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Descripción</Label>
                <Textarea
                  className="mt-1"
                  rows={3}
                  value={form.description ?? ""}
                  onChange={(e) => setField("description", e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Tema</Label>
                  <Input
                    className="mt-1"
                    placeholder="Identidad, dinero..."
                    value={form.theme ?? ""}
                    onChange={(e) => setField("theme", e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs">Tema emocional</Label>
                  <Input
                    className="mt-1"
                    placeholder="Miedo, esperanza..."
                    value={form.emotional_theme ?? ""}
                    onChange={(e) => setField("emotional_theme", e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Origen</Label>
                  <Select value={form.origin ?? "other"} onValueChange={(v) => setField("origin", v)}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="personal">Personal</SelectItem>
                      <SelectItem value="research">Investigación</SelectItem>
                      <SelectItem value="trending">Trending</SelectItem>
                      <SelectItem value="audience">Audiencia</SelectItem>
                      <SelectItem value="experience">Experiencia</SelectItem>
                      <SelectItem value="other">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Urgencia</Label>
                  <Select value={form.urgency_level ?? "medium"} onValueChange={(v) => setField("urgency_level", v)}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Baja</SelectItem>
                      <SelectItem value="medium">Media</SelectItem>
                      <SelectItem value="high">Alta</SelectItem>
                      <SelectItem value="urgent">Urgente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-xs">Potencial de contenido: {form.content_potential_score ?? 3}/5</Label>
                <Slider
                  className="mt-3"
                  min={1} max={5} step={1}
                  value={[form.content_potential_score ?? 3]}
                  onValueChange={([v]) => setField("content_potential_score", v)}
                />
              </div>
              <div>
                <Label className="text-xs">Potencial de derivados: {form.derivative_potential_score ?? 3}/5</Label>
                <Slider
                  className="mt-3"
                  min={1} max={5} step={1}
                  value={[form.derivative_potential_score ?? 3]}
                  onValueChange={([v]) => setField("derivative_potential_score", v)}
                />
              </div>
              <div>
                <Label className="text-xs">Encaje con audiencia</Label>
                <Textarea
                  className="mt-1"
                  rows={2}
                  value={form.audience_fit ?? ""}
                  onChange={(e) => setField("audience_fit", e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs">Notas</Label>
                <Textarea
                  className="mt-1"
                  rows={2}
                  value={form.notes ?? ""}
                  onChange={(e) => setField("notes", e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs">Referencias</Label>
                <Textarea
                  className="mt-1"
                  rows={2}
                  value={form.reference_links ?? ""}
                  onChange={(e) => setField("reference_links", e.target.value)}
                />
              </div>
              <Button className="w-full" onClick={() => save.mutate(form)} disabled={save.isPending}>
                {save.isPending ? "Guardando..." : "Guardar cambios"}
              </Button>
            </div>
          ) : (
            /* ── View mode ── */
            <div className="space-y-5">
              {idea.description && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Descripción</p>
                  <p className="text-sm leading-relaxed">{idea.description}</p>
                </div>
              )}

              {(idea.theme || idea.emotional_theme) && (
                <div className="grid grid-cols-2 gap-4">
                  {idea.theme && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Tema</p>
                      <p className="text-sm">{idea.theme}</p>
                    </div>
                  )}
                  {idea.emotional_theme && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Tema emocional</p>
                      <p className="text-sm">{idea.emotional_theme}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Scores */}
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Potencial</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-muted/40 rounded-lg p-3 space-y-1">
                    <p className="text-xs text-muted-foreground">Contenido</p>
                    <div className="flex items-center gap-2">
                      <ScoreDots value={idea.content_potential_score} />
                      <span className="text-base font-bold tabular-nums">{idea.content_potential_score ?? "—"}</span>
                    </div>
                  </div>
                  <div className="bg-muted/40 rounded-lg p-3 space-y-1">
                    <p className="text-xs text-muted-foreground">Derivados</p>
                    <div className="flex items-center gap-2">
                      <ScoreDots value={idea.derivative_potential_score} />
                      <span className="text-base font-bold tabular-nums">{idea.derivative_potential_score ?? "—"}</span>
                    </div>
                  </div>
                </div>
              </div>

              {idea.audience_fit && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Encaje con audiencia</p>
                  <p className="text-sm">{idea.audience_fit}</p>
                </div>
              )}

              {idea.tags && idea.tags.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Tags</p>
                  <div className="flex flex-wrap gap-1.5">
                    {idea.tags.map((t) => (
                      <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {idea.notes && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Notas</p>
                  <p className="text-sm text-muted-foreground">{idea.notes}</p>
                </div>
              )}

              {idea.reference_links && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Referencias</p>
                  <p className="text-sm text-muted-foreground">{idea.reference_links}</p>
                </div>
              )}

              {/* Action buttons */}
              <div className="border-t border-border pt-4 space-y-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Acciones</p>
                <div className="grid grid-cols-2 gap-2">
                  {idea.status === "captured" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { onStatusChange(idea.id, "evaluating"); onClose(); }}
                    >
                      Evaluar
                    </Button>
                  )}
                  {(idea.status === "captured" || idea.status === "evaluating") && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { onStatusChange(idea.id, "approved"); onClose(); }}
                    >
                      Aprobar
                    </Button>
                  )}
                  {idea.status === "approved" && (
                    <Button
                      size="sm"
                      onClick={() => convertToBrief.mutate()}
                      disabled={convertToBrief.isPending}
                    >
                      {convertToBrief.isPending ? "Creando..." : "Convertir a Brief"}
                    </Button>
                  )}
                  {!["backlog", "archived", "in_brief"].includes(idea.status ?? "") && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { onStatusChange(idea.id, "backlog"); onClose(); }}
                    >
                      Mover a Backlog
                    </Button>
                  )}
                  {idea.status !== "archived" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground col-span-2"
                      onClick={() => { onStatusChange(idea.id, "archived"); onClose(); }}
                    >
                      Archivar idea
                    </Button>
                  )}
                </div>
              </div>

              <p className="text-xs text-muted-foreground pt-1">
                Creada {timeAgo(idea.created_at)} · Actualizada {timeAgo(idea.updated_at)}
              </p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ── Ideas (main page) ──────────────────────────────────────────────────────

const TABS = [
  { value: "all",        label: "Todas" },
  { value: "captured",   label: "Capturadas" },
  { value: "evaluating", label: "Evaluando" },
  { value: "approved",   label: "Aprobadas" },
  { value: "in_brief",   label: "En Brief" },
  { value: "backlog",    label: "Backlog" },
  { value: "archived",   label: "Archivadas" },
] as const;

export default function Ideas() {
  const [openCapture, setOpenCapture] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<string>("all");
  const qc = useQueryClient();

  // ── Fetch ──────────────────────────────────────────────────────────────
  const { data: ideas = [], isLoading } = useQuery({
    queryKey: ["ideas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ideas")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Tables<"ideas">[];
    },
  });

  // ── Mutations ──────────────────────────────────────────────────────────
  const createIdea = useMutation({
    mutationFn: async (fd: FormData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");
      const { error } = await supabase.from("ideas").insert({
        user_id: user.id,
        title: fd.get("title") as string,
        description: (fd.get("description") as string) || null,
        origin: (fd.get("origin") as string) || null,
        urgency_level: (fd.get("urgency_level") as string) || "medium",
        status: "captured",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ideas"] });
      setOpenCapture(false);
      toast.success("Idea capturada");
    },
    onError: (e) => toast.error(e.message),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("ideas").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ideas"] });
      toast.success("Estado actualizado");
    },
    onError: (e) => toast.error(e.message),
  });

  // ── Derived state ──────────────────────────────────────────────────────
  const counts = Object.fromEntries(
    TABS.map(({ value }) => [
      value,
      value === "all"
        ? ideas.length
        : ideas.filter((i) => i.status === value).length,
    ])
  );

  const filtered = ideas.filter((i) => {
    if (tab !== "all" && i.status !== tab) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        i.title?.toLowerCase().includes(q) ||
        i.theme?.toLowerCase().includes(q) ||
        i.description?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const selected = ideas.find((i) => i.id === selectedId) ?? null;

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="page-container animate-fade-in">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Ideas Bank</h1>
          <p className="page-subtitle">Captura y evalúa ideas para tus episodios</p>
        </div>
        <Dialog open={openCapture} onOpenChange={setOpenCapture}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />Capturar idea
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Captura rápida</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => { e.preventDefault(); createIdea.mutate(new FormData(e.currentTarget)); }}
              className="space-y-4"
            >
              <div>
                <Label>Título *</Label>
                <Input name="title" placeholder="¿Cuál es la idea?" required autoFocus className="mt-1" />
              </div>
              <div>
                <Label>Descripción <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                <Textarea
                  name="description"
                  placeholder="Desarrolla un poco la idea..."
                  rows={3}
                  className="mt-1"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Origen</Label>
                  <Select name="origin" defaultValue="personal">
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="personal">Personal</SelectItem>
                      <SelectItem value="research">Investigación</SelectItem>
                      <SelectItem value="trending">Trending</SelectItem>
                      <SelectItem value="audience">Audiencia</SelectItem>
                      <SelectItem value="experience">Experiencia</SelectItem>
                      <SelectItem value="other">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Urgencia</Label>
                  <Select name="urgency_level" defaultValue="medium">
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Baja</SelectItem>
                      <SelectItem value="medium">Media</SelectItem>
                      <SelectItem value="high">Alta</SelectItem>
                      <SelectItem value="urgent">Urgente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={createIdea.isPending}>
                {createIdea.isPending ? "Guardando..." : "Capturar"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar ideas..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="h-8 flex-wrap">
          {TABS.map(({ value, label }) => (
            <TabsTrigger key={value} value={value} className="text-xs gap-1.5">
              {label}
              {counts[value] > 0 && (
                <span className="text-xs opacity-50 tabular-nums">{counts[value]}</span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="h-44 animate-pulse bg-muted" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <Lightbulb className="h-12 w-12 text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground">
            {search
              ? "Sin resultados para esa búsqueda"
              : tab === "all"
              ? "Aún no hay ideas. ¡Captura la primera!"
              : "No hay ideas en esta categoría"}
          </p>
          {!search && tab === "all" && (
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => setOpenCapture(true)}
            >
              <Plus className="h-4 w-4 mr-2" />Capturar primera idea
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((idea) => (
            <IdeaCard
              key={idea.id}
              idea={idea}
              onOpen={() => setSelectedId(idea.id)}
              onStatusChange={(status) => updateStatus.mutate({ id: idea.id, status })}
            />
          ))}
        </div>
      )}

      {/* Detail sheet */}
      <IdeaDetailSheet
        idea={selected}
        open={!!selectedId}
        onClose={() => setSelectedId(null)}
        onUpdated={() => qc.invalidateQueries({ queryKey: ["ideas"] })}
        onStatusChange={(id, status) => updateStatus.mutate({ id, status })}
      />
    </div>
  );
}
