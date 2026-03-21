import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Layers, Plus, Pencil, Trash2, Mic } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Season {
  id: string;
  user_id: string;
  number: number;
  name: string;
  description: string | null;
  year: number | null;
  status: "active" | "completed" | "archived";
  created_at: string;
  updated_at: string;
  _episode_count?: number;
}

// ─── Status helpers ───────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  active: "Activa",
  completed: "Completada",
  archived: "Archivada",
};

const STATUS_STYLES: Record<string, string> = {
  active:    "text-emerald-600 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-950/30 dark:border-emerald-800",
  completed: "text-blue-600 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-950/30 dark:border-blue-800",
  archived:  "text-muted-foreground bg-muted border-border",
};

// ─── Hooks ────────────────────────────────────────────────────────────────────

function useSeasons() {
  return useQuery({
    queryKey: ["seasons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seasons")
        .select("*")
        .order("number", { ascending: false });
      if (error) throw error;

      // Count episodes per season
      const seasons = data as Season[];
      if (seasons.length === 0) return seasons;

      const ids = seasons.map((s) => s.id);
      const { data: eps } = await supabase
        .from("episodes")
        .select("season_id")
        .in("season_id", ids);

      const counts: Record<string, number> = {};
      (eps ?? []).forEach((e) => {
        if (e.season_id) counts[e.season_id] = (counts[e.season_id] ?? 0) + 1;
      });

      return seasons.map((s) => ({ ...s, _episode_count: counts[s.id] ?? 0 }));
    },
  });
}

// ─── Edit sheet ───────────────────────────────────────────────────────────────

function SeasonSheet({
  season,
  onClose,
}: {
  season: Season | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [number, setNumber] = useState(String(season?.number ?? ""));
  const [name, setName] = useState(season?.name ?? "");
  const [description, setDescription] = useState(season?.description ?? "");
  const [year, setYear] = useState(String(season?.year ?? new Date().getFullYear()));
  const [status, setStatus] = useState(season?.status ?? "active");

  const save = useMutation({
    mutationFn: async () => {
      if (!season) return;
      const { error } = await supabase
        .from("seasons")
        .update({
          number: parseInt(number) || season.number,
          name: name.trim(),
          description: description.trim() || null,
          year: year ? parseInt(year) : null,
          status,
        })
        .eq("id", season.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["seasons"] });
      toast.success("Temporada actualizada");
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async () => {
      if (!season) return;
      const { error } = await supabase.from("seasons").delete().eq("id", season.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["seasons"] });
      toast.success("Temporada eliminada");
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!season) return null;

  return (
    <Sheet open={!!season} onOpenChange={() => onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle>Editar temporada</SheetTitle>
        </SheetHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Número</Label>
              <Input
                type="number"
                min={1}
                value={number}
                onChange={(e) => setNumber(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Año</Label>
              <Input
                type="number"
                min={2000}
                max={2099}
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="2025"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Nombre *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Crecimiento personal"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Descripción</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Tema o hilo conductor de la temporada…"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Estado</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Activa</SelectItem>
                <SelectItem value="completed">Completada</SelectItem>
                <SelectItem value="archived">Archivada</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-between items-center pt-4 border-t border-border">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                if (confirm(`¿Eliminar la temporada "${season.name}"? Los episodios no se eliminarán.`)) {
                  remove.mutate();
                }
              }}
              disabled={remove.isPending}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              {remove.isPending ? "Eliminando…" : "Eliminar"}
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>Cancelar</Button>
              <Button
                onClick={() => save.mutate()}
                disabled={!name.trim() || save.isPending}
              >
                {save.isPending ? "Guardando…" : "Guardar"}
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Seasons() {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Season | null>(null);
  const qc = useQueryClient();

  const { data: seasons = [], isLoading } = useSeasons();

  const create = useMutation({
    mutationFn: async (formData: FormData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");
      const { error } = await supabase.from("seasons").insert({
        user_id: user.id,
        number: parseInt(formData.get("number") as string) || 1,
        name: (formData.get("name") as string).trim(),
        description: (formData.get("description") as string).trim() || null,
        year: formData.get("year") ? parseInt(formData.get("year") as string) : null,
        status: (formData.get("status") as string) || "active",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["seasons"] });
      setOpen(false);
      toast.success("Temporada creada");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="page-container animate-fade-in">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Temporadas"
          subtitle="Organiza tus episodios en temporadas o series temáticas"
        />
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nueva temporada
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nueva temporada</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                create.mutate(new FormData(e.currentTarget));
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Número</Label>
                  <Input
                    name="number"
                    type="number"
                    min={1}
                    defaultValue={seasons.length + 1}
                  />
                </div>
                <div>
                  <Label>Año</Label>
                  <Input
                    name="year"
                    type="number"
                    min={2000}
                    max={2099}
                    defaultValue={new Date().getFullYear()}
                  />
                </div>
              </div>
              <div>
                <Label>Nombre *</Label>
                <Input name="name" required autoFocus placeholder="Ej. Crecimiento personal" />
              </div>
              <div>
                <Label>Descripción</Label>
                <Textarea name="description" rows={2} placeholder="Tema o hilo conductor…" />
              </div>
              <div>
                <Label>Estado</Label>
                <Select name="status" defaultValue="active">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Activa</SelectItem>
                    <SelectItem value="completed">Completada</SelectItem>
                    <SelectItem value="archived">Archivada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full" disabled={create.isPending}>
                {create.isPending ? "Creando…" : "Crear temporada"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="h-36 animate-pulse bg-muted" />
          ))}
        </div>
      ) : seasons.length === 0 ? (
        <div className="empty-state">
          <Layers className="h-12 w-12 text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground">No hay temporadas aún</p>
          <p className="text-sm text-muted-foreground/60 mt-1">
            Crea tu primera temporada para organizar los episodios
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {seasons.map((s) => (
            <Card
              key={s.id}
              className="cursor-pointer hover:border-primary/30 transition-colors"
              onClick={() => setEditing(s)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium mb-0.5">
                      Temporada {s.number}{s.year ? ` · ${s.year}` : ""}
                    </p>
                    <CardTitle className="text-base leading-tight">{s.name}</CardTitle>
                  </div>
                  <span
                    className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-medium border ${STATUS_STYLES[s.status] ?? STATUS_STYLES.archived}`}
                  >
                    {STATUS_LABELS[s.status] ?? s.status}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                {s.description && (
                  <p className="text-muted-foreground line-clamp-2">{s.description}</p>
                )}
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Mic className="h-3.5 w-3.5" />
                  <span>{s._episode_count ?? 0} episodio{s._episode_count !== 1 ? "s" : ""}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-auto h-6 px-2 text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditing(s);
                    }}
                  >
                    <Pencil className="h-3 w-3 mr-1" />
                    Editar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <SeasonSheet season={editing} onClose={() => setEditing(null)} />
    </div>
  );
}
