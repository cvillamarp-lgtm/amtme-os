import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
import { FileText, Plus, Search, ArrowRight, Lightbulb, Mic } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
    case "draft":     return { label: "Borrador",    cls: "text-muted-foreground bg-muted border-border" };
    case "approved":  return { label: "Aprobado",    cls: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" };
    case "rejected":  return { label: "Rechazado",   cls: "text-red-400 bg-red-400/10 border-red-400/20" };
    case "converted": return { label: "Convertido",  cls: "text-blue-400 bg-blue-400/10 border-blue-400/20" };
    default:          return { label: status ?? "—", cls: "text-muted-foreground bg-muted border-border" };
  }
}

// brief con idea anidada
type BriefWithIdea = Tables<"briefs"> & {
  ideas: { title: string; status: string | null } | null;
};

// ── BriefCard ──────────────────────────────────────────────────────────────

interface BriefCardProps {
  brief: BriefWithIdea;
  onOpen: () => void;
  onStatusChange: (status: string) => void;
}

function BriefCard({ brief, onOpen, onStatusChange }: BriefCardProps) {
  const sc = statusConfig(brief.status);
  const completedFields = [
    brief.thesis, brief.audience, brief.pain_point,
    brief.promise, brief.angle, brief.cta,
  ].filter(Boolean).length;
  const totalFields = 6;
  const pct = Math.round((completedFields / totalFields) * 100);

  return (
    <Card
      className="cursor-pointer hover:border-primary/30 transition-colors"
      onClick={onOpen}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-medium text-sm leading-snug line-clamp-2 flex-1">{brief.title}</h3>
          <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium border ${sc.cls}`}>
            {sc.label}
          </span>
        </div>

        {/* Idea de origen */}
        {brief.ideas?.title && (
          <div className="flex items-center gap-1 mt-0.5">
            <Lightbulb className="h-3 w-3 text-muted-foreground/50 shrink-0" />
            <span className="text-xs text-muted-foreground line-clamp-1">{brief.ideas.title}</span>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Thesis preview */}
        {brief.thesis ? (
          <p className="text-xs text-muted-foreground line-clamp-2 italic">"{brief.thesis}"</p>
        ) : (
          <p className="text-xs text-muted-foreground italic">Sin tesis definida aún</p>
        )}

        {/* Field pills */}
        <div className="flex flex-wrap gap-1">
          {[
            { key: "audience",  label: "Audiencia" },
            { key: "angle",     label: "Ángulo" },
            { key: "tone",      label: "Tono" },
            { key: "cta",       label: "CTA" },
          ].map(({ key, label }) => (
            <span
              key={key}
              className={`text-xs px-1.5 py-0.5 rounded ${
                brief[key as keyof typeof brief]
                  ? "bg-primary/10 text-primary"
                  : "bg-muted/50 text-muted-foreground"
              }`}
            >
              {label}
            </span>
          ))}
        </div>

        {/* Completeness bar */}
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Completitud</span>
            <span className="text-xs text-muted-foreground tabular-nums">{pct}%</span>
          </div>
          <div className="h-1 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary/60 rounded-full transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between border-t border-border pt-2"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="text-xs text-muted-foreground">{timeAgo(brief.created_at)}</span>
          <div className="flex gap-1">
            {brief.status === "draft" && (
              <button
                className="text-xs text-muted-foreground hover:text-emerald-400 transition-colors px-1.5 py-0.5 rounded"
                onClick={() => onStatusChange("approved")}
              >
                Aprobar
              </button>
            )}
            {brief.status === "approved" && (
              <span className="text-xs text-emerald-400 flex items-center gap-0.5">
                <ArrowRight className="h-2.5 w-2.5" />Listo para episodio
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── BriefDetailSheet ───────────────────────────────────────────────────────

interface BriefDetailSheetProps {
  brief: BriefWithIdea | null;
  open: boolean;
  onClose: () => void;
  onUpdated: () => void;
  onStatusChange: (id: string, status: string) => void;
}

const TONE_OPTIONS = [
  "íntimo", "confrontacional", "reflexivo", "conversacional",
  "vulnerable", "urgente", "inspirador", "honesto",
];

function BriefDetailSheet({ brief, open, onClose, onUpdated, onStatusChange }: BriefDetailSheetProps) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<Tables<"briefs">>>({});

  useEffect(() => {
    if (brief) {
      setForm({ ...brief });
      setEditing(false);
    }
  }, [brief?.id]);

  function setField<K extends keyof Tables<"briefs">>(key: K, val: Tables<"briefs">[K]) {
    setForm((p) => ({ ...p, [key]: val }));
  }

  const save = useMutation({
    mutationFn: async (updates: Partial<Tables<"briefs">>) => {
      if (!brief) return;
      const { error } = await supabase.from("briefs").update(updates).eq("id", brief.id);
      if (error) throw error;
    },
    onSuccess: () => { onUpdated(); setEditing(false); toast.success("Brief actualizado"); },
    onError: (e) => toast.error(e.message),
  });

  const convertToEpisode = useMutation({
    mutationFn: async () => {
      if (!brief) return null;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");

      // Count existing episodes for auto-number
      const { count } = await supabase
        .from("episodes")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);
      const nextNumber = String((count || 0) + 1).padStart(2, "0");

      // Build traceability note from fields without a direct episode column
      const trazabilidadParts: string[] = [`Convertido desde brief: "${brief.title}"`];
      if (brief.audience) trazabilidadParts.push(`Audiencia: ${brief.audience}`);
      if (brief.emotional_transformation) trazabilidadParts.push(`Transformación emocional: ${brief.emotional_transformation}`);
      if (brief.risks) trazabilidadParts.push(`Riesgos: ${brief.risks}`);

      // Create episode pre-filled with brief data
      const { data: episode, error } = await supabase
        .from("episodes")
        .insert({
          user_id: user.id,
          title: brief.title,
          working_title: brief.title,
          // Content fields
          theme: brief.angle || null,
          core_thesis: brief.thesis || null,
          idea_principal: brief.pain_point || null,
          summary: brief.promise || null,
          cta: brief.cta || null,
          // Style & metadata
          tono: brief.tone || "íntimo",
          tags: brief.keywords || [],
          // Traceability (compiles audience, emotional_transformation, risks)
          nota_trazabilidad: trazabilidadParts.join("\n"),
          // Status
          status: "draft",
          estado_produccion: "draft",
          nivel_completitud: "D",
          number: nextNumber,
        })
        .select("id")
        .single();
      if (error) throw error;

      // Link episode back to brief + mark brief as converted
      await supabase.from("briefs").update({
        episode_id: episode.id,
        status: "converted",
      }).eq("id", brief.id);

      return episode.id;
    },
    onSuccess: (episodeId) => {
      onUpdated();
      qc.invalidateQueries({ queryKey: ["episodes"] });
      qc.invalidateQueries({ queryKey: ["episodes-for-select"] });
      qc.invalidateQueries({ queryKey: ["dashboard-counts-v2"] });
      qc.invalidateQueries({ queryKey: ["dashboard-episodes"] });
      onClose();
      toast.success("Episodio creado — abriendo workspace...");
      if (episodeId) navigate(`/episodes/${episodeId}`);
    },
    onError: (e) => toast.error(e.message),
  });

  if (!brief) return null;
  const sc = statusConfig(brief.status);

  // Section helper
  const Field = ({ label, value }: { label: string; value: string | null | undefined }) =>
    value ? (
      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
        <p className="text-sm leading-relaxed">{value}</p>
      </div>
    ) : null;

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto p-0 gap-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
          <div className="flex items-start justify-between gap-3">
            <SheetTitle className="text-base leading-snug flex-1">{brief.title}</SheetTitle>
            <Button variant="ghost" size="sm" className="shrink-0 -mt-1" onClick={() => setEditing(!editing)}>
              {editing ? "Cancelar" : "Editar"}
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${sc.cls}`}>
              {sc.label}
            </span>
            {brief.tone && (
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{brief.tone}</span>
            )}
            {brief.ideas?.title && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Lightbulb className="h-2.5 w-2.5" />{brief.ideas.title}
              </span>
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
                <Label className="text-xs">Tesis central</Label>
                <Textarea
                  className="mt-1" rows={2}
                  placeholder="La idea central que el episodio va a defender..."
                  value={form.thesis ?? ""}
                  onChange={(e) => setField("thesis", e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Audiencia objetivo</Label>
                  <Input
                    className="mt-1"
                    placeholder="¿A quién le hablas?"
                    value={form.audience ?? ""}
                    onChange={(e) => setField("audience", e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs">Tono</Label>
                  <Select value={form.tone ?? ""} onValueChange={(v) => setField("tone", v)}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Selecciona tono" /></SelectTrigger>
                    <SelectContent>
                      {TONE_OPTIONS.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="text-xs">Dolor / Problema del oyente</Label>
                <Textarea
                  className="mt-1" rows={2}
                  placeholder="¿Qué problema real tiene tu audiencia?"
                  value={form.pain_point ?? ""}
                  onChange={(e) => setField("pain_point", e.target.value)}
                />
              </div>

              <div>
                <Label className="text-xs">Promesa del episodio</Label>
                <Textarea
                  className="mt-1" rows={2}
                  placeholder="¿Qué se lleva el oyente al terminar?"
                  value={form.promise ?? ""}
                  onChange={(e) => setField("promise", e.target.value)}
                />
              </div>

              <div>
                <Label className="text-xs">Ángulo único</Label>
                <Textarea
                  className="mt-1" rows={2}
                  placeholder="¿Qué hace único este enfoque?"
                  value={form.angle ?? ""}
                  onChange={(e) => setField("angle", e.target.value)}
                />
              </div>

              <div>
                <Label className="text-xs">Transformación emocional</Label>
                <Textarea
                  className="mt-1" rows={2}
                  placeholder="¿Cómo se siente el oyente al inicio vs. al final?"
                  value={form.emotional_transformation ?? ""}
                  onChange={(e) => setField("emotional_transformation", e.target.value)}
                />
              </div>

              <div>
                <Label className="text-xs">CTA (llamada a la acción)</Label>
                <Input
                  className="mt-1"
                  placeholder="¿Qué quieres que haga el oyente?"
                  value={form.cta ?? ""}
                  onChange={(e) => setField("cta", e.target.value)}
                />
              </div>

              <div>
                <Label className="text-xs">Riesgos / Lo que puede salir mal</Label>
                <Textarea
                  className="mt-1" rows={2}
                  placeholder="Posibles problemas con este ángulo..."
                  value={form.risks ?? ""}
                  onChange={(e) => setField("risks", e.target.value)}
                />
              </div>

              <div>
                <Label className="text-xs">Palabras clave (separadas por coma)</Label>
                <Input
                  className="mt-1"
                  placeholder="identidad, dinero, miedos..."
                  value={(form.keywords ?? []).join(", ")}
                  onChange={(e) =>
                    setField(
                      "keywords",
                      e.target.value.split(",").map((s) => s.trim()).filter(Boolean)
                    )
                  }
                />
              </div>

              <div>
                <Label className="text-xs">Notas</Label>
                <Textarea
                  className="mt-1" rows={2}
                  value={form.notes ?? ""}
                  onChange={(e) => setField("notes", e.target.value)}
                />
              </div>

              <Button className="w-full" onClick={() => save.mutate(form)} disabled={save.isPending}>
                {save.isPending ? "Guardando..." : "Guardar cambios"}
              </Button>
            </div>
          ) : (
            /* ── View mode ── */
            <div className="space-y-5">
              {/* Thesis highlight */}
              {brief.thesis && (
                <blockquote className="border-l-2 border-primary/40 pl-4 italic text-sm text-muted-foreground">
                  {brief.thesis}
                </blockquote>
              )}

              {/* Core fields grid */}
              <div className="grid grid-cols-2 gap-4">
                <Field label="Audiencia" value={brief.audience} />
                <Field label="Tono" value={brief.tone} />
                <Field label="Dolor del oyente" value={brief.pain_point} />
                <Field label="Promesa" value={brief.promise} />
              </div>

              <Field label="Ángulo único" value={brief.angle} />
              <Field label="Transformación emocional" value={brief.emotional_transformation} />
              <Field label="CTA" value={brief.cta} />
              <Field label="Riesgos" value={brief.risks} />

              {/* Keywords */}
              {brief.keywords && brief.keywords.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Palabras clave</p>
                  <div className="flex flex-wrap gap-1.5">
                    {brief.keywords.map((k) => (
                      <Badge key={k} variant="secondary" className="text-xs">{k}</Badge>
                    ))}
                  </div>
                </div>
              )}

              <Field label="Notas" value={brief.notes} />

              {/* Linked episode */}
              {brief.episode_id && (
                <div className="bg-blue-400/5 border border-blue-400/20 rounded-lg p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mic className="h-4 w-4 text-blue-400" />
                    <span className="text-sm text-blue-400">Episodio creado</span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-blue-400 h-9 text-xs"
                    onClick={() => { onClose(); navigate(`/episodes/${brief.episode_id}`); }}
                  >
                    Abrir <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              )}

              {/* Action buttons */}
              <div className="border-t border-border pt-4 space-y-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Acciones</p>
                <div className="grid grid-cols-2 gap-2">
                  {brief.status === "draft" && (
                    <>
                      <Button
                        variant="outline" size="sm"
                        onClick={() => { onStatusChange(brief.id, "approved"); onClose(); }}
                      >
                        Aprobar brief
                      </Button>
                      <Button
                        variant="ghost" size="sm"
                        className="text-red-400 hover:text-red-400"
                        onClick={() => { onStatusChange(brief.id, "rejected"); onClose(); }}
                      >
                        Rechazar
                      </Button>
                    </>
                  )}

                  {brief.status === "approved" && !brief.episode_id && (
                    <Button
                      size="sm"
                      className="col-span-2"
                      onClick={() => convertToEpisode.mutate()}
                      disabled={convertToEpisode.isPending}
                    >
                      <Mic className="h-4 w-4 mr-2" />
                      {convertToEpisode.isPending ? "Creando episodio..." : "Crear Episodio"}
                    </Button>
                  )}

                  {brief.status === "rejected" && (
                    <Button
                      variant="outline" size="sm"
                      onClick={() => { onStatusChange(brief.id, "draft"); onClose(); }}
                    >
                      Volver a borrador
                    </Button>
                  )}
                </div>
              </div>

              <p className="text-xs text-muted-foreground pt-1">
                Creado {timeAgo(brief.created_at)} · Actualizado {timeAgo(brief.updated_at)}
              </p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ── Briefs (main page) ─────────────────────────────────────────────────────

const TABS = [
  { value: "all",       label: "Todos" },
  { value: "draft",     label: "Borrador" },
  { value: "approved",  label: "Aprobados" },
  { value: "rejected",  label: "Rechazados" },
  { value: "converted", label: "Convertidos" },
] as const;

export default function Briefs() {
  const [openCreate, setOpenCreate] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<string>("all");
  const qc = useQueryClient();

  // ── Fetch ──────────────────────────────────────────────────────────────
  const { data: briefs = [], isLoading } = useQuery({
    queryKey: ["briefs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("briefs")
        .select("*, ideas(title, status)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as BriefWithIdea[];
    },
  });

  // ── Mutations ──────────────────────────────────────────────────────────
  const createBrief = useMutation({
    mutationFn: async (fd: FormData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");
      const { error } = await supabase.from("briefs").insert({
        user_id: user.id,
        title: fd.get("title") as string,
        thesis: (fd.get("thesis") as string) || null,
        tone: (fd.get("tone") as string) || null,
        status: "draft",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["briefs"] });
      setOpenCreate(false);
      toast.success("Brief creado");
    },
    onError: (e) => toast.error(e.message),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("briefs").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["briefs"] });
      toast.success("Estado actualizado");
    },
    onError: (e) => toast.error(e.message),
  });

  // ── Derived ────────────────────────────────────────────────────────────
  const counts = Object.fromEntries(
    TABS.map(({ value }) => [
      value,
      value === "all" ? briefs.length : briefs.filter((b) => b.status === value).length,
    ])
  );

  const filtered = briefs.filter((b) => {
    if (tab !== "all" && b.status !== tab) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        b.title?.toLowerCase().includes(q) ||
        b.thesis?.toLowerCase().includes(q) ||
        b.ideas?.title?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const selected = briefs.find((b) => b.id === selectedId) ?? null;

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="page-container animate-fade-in">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Briefs</h1>
          <p className="page-subtitle">Define el ángulo y la promesa de cada episodio antes de grabar</p>
        </div>
        <Dialog open={openCreate} onOpenChange={setOpenCreate}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Nuevo brief</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nuevo brief</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => { e.preventDefault(); createBrief.mutate(new FormData(e.currentTarget)); }}
              className="space-y-4"
            >
              <div>
                <Label>Título del episodio *</Label>
                <Input name="title" placeholder="¿De qué va este episodio?" required autoFocus className="mt-1" />
              </div>
              <div>
                <Label>Tesis central <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                <Textarea
                  name="thesis"
                  placeholder="La idea central que vas a defender..."
                  rows={2}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Tono</Label>
                <Select name="tone" defaultValue="íntimo">
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TONE_OPTIONS.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full" disabled={createBrief.isPending}>
                {createBrief.isPending ? "Creando..." : "Crear brief"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar briefs..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="h-8">
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
          {[1, 2, 3].map((i) => <Card key={i} className="h-48 animate-pulse bg-muted" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <FileText className="h-12 w-12 text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground">
            {search
              ? "Sin resultados"
              : tab === "all"
              ? "Aún no hay briefs. Aprueba una idea o crea uno directamente."
              : "No hay briefs en esta categoría"}
          </p>
          {!search && tab === "all" && (
            <Button variant="outline" size="sm" className="mt-3" onClick={() => setOpenCreate(true)}>
              <Plus className="h-4 w-4 mr-2" />Crear primer brief
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((brief) => (
            <BriefCard
              key={brief.id}
              brief={brief}
              onOpen={() => setSelectedId(brief.id)}
              onStatusChange={(status) => updateStatus.mutate({ id: brief.id, status })}
            />
          ))}
        </div>
      )}

      {/* Detail sheet */}
      <BriefDetailSheet
        brief={selected}
        open={!!selectedId}
        onClose={() => setSelectedId(null)}
        onUpdated={() => qc.invalidateQueries({ queryKey: ["briefs"] })}
        onStatusChange={(id, status) => updateStatus.mutate({ id, status })}
      />
    </div>
  );
}
