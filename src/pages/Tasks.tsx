import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ListTodo, Plus, Trash2, Pencil, Search, X, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type Task = Tables<"tasks">;

const PRIORITY_CONFIG = {
  high:   { label: "Alta",   variant: "destructive" as const },
  medium: { label: "Media",  variant: "secondary" as const },
  low:    { label: "Baja",   variant: "outline" as const },
};

function priorityVariant(p: string | null) {
  return PRIORITY_CONFIG[p as keyof typeof PRIORITY_CONFIG]?.variant ?? "outline";
}
function priorityLabel(p: string | null) {
  return PRIORITY_CONFIG[p as keyof typeof PRIORITY_CONFIG]?.label ?? p ?? "—";
}

function TaskEditSheet({
  task,
  onClose,
}: {
  task: Task | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [priority, setPriority] = useState(task?.priority ?? "medium");
  const [category, setCategory] = useState(task?.category ?? "");

  const save = useMutation({
    mutationFn: async () => {
      if (!task) return;
      const { error } = await supabase.from("tasks").update({
        title,
        description: description || null,
        priority,
        category: category || null,
      }).eq("id", task.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["sidebar-counts"] });
      toast.success("Tarea actualizada");
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async () => {
      if (!task) return;
      const { error } = await supabase.from("tasks").delete().eq("id", task.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["sidebar-counts"] });
      toast.success("Tarea eliminada");
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

  if (!task) return null;

  return (
    <Sheet open={!!task} onOpenChange={() => onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle className="font-display">Editar tarea</SheetTitle>
        </SheetHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Título *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título de la tarea" />
          </div>

          <div className="space-y-1.5">
            <Label>Descripción</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Descripción opcional..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Prioridad</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baja</SelectItem>
                  <SelectItem value="medium">Media</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Categoría</Label>
              <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="ej. edición, social..." />
            </div>
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-border">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => remove.mutate()}
              disabled={remove.isPending}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              {remove.isPending ? "Eliminando..." : "Eliminar"}
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>Cancelar</Button>
              <Button onClick={() => save.mutate()} disabled={!title.trim() || save.isPending}>
                {save.isPending ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default function Tasks() {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"created_at" | "priority" | "title">("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const qc = useQueryClient();

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["tasks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Task[];
    },
  });

  const addTask = useMutation({
    mutationFn: async (formData: FormData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");
      const { error } = await supabase.from("tasks").insert({
        user_id: user.id,
        title: formData.get("title") as string,
        description: (formData.get("description") as string) || null,
        priority: (formData.get("priority") as string) || "medium",
        category: (formData.get("category") as string) || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["sidebar-counts"] });
      setOpen(false);
      toast.success("Tarea creada");
    },
    onError: (e) => toast.error(e.message),
  });

  const toggleTask = useMutation({
    mutationFn: async ({ id, done }: { id: string; done: boolean }) => {
      const { error } = await supabase
        .from("tasks")
        .update({ status: done ? "done" : "todo" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["sidebar-counts"] });
    },
  });

  const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };
  const allPending = tasks.filter((t) => t.status !== "done");
  const allDone = tasks.filter((t) => t.status === "done");

  const applyTaskFilters = (list: Task[]) => {
    return list
      .filter((t) => {
        if (priorityFilter !== "all" && t.priority !== priorityFilter) return false;
        if (categoryFilter !== "all" && t.category !== categoryFilter) return false;
        if (search) {
          const q = search.toLowerCase();
          if (!t.title.toLowerCase().includes(q) && !t.description?.toLowerCase().includes(q) && !t.category?.toLowerCase().includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "priority") {
          const pa = PRIORITY_ORDER[a.priority ?? "low"] ?? 99;
          const pb = PRIORITY_ORDER[b.priority ?? "low"] ?? 99;
          return sortDir === "asc" ? pa - pb : pb - pa;
        }
        const aVal = (a as any)[sortBy] ?? "";
        const bVal = (b as any)[sortBy] ?? "";
        const cmp = String(aVal) < String(bVal) ? -1 : String(aVal) > String(bVal) ? 1 : 0;
        return sortDir === "asc" ? cmp : -cmp;
      });
  };

  const pending = applyTaskFilters(allPending);
  const done = applyTaskFilters(allDone);

  const categories = [...new Set(tasks.map((t) => t.category).filter(Boolean))];

  const toggleSort = (col: "created_at" | "priority" | "title") => {
    if (sortBy === col) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortBy(col); setSortDir("asc"); }
  };

  const sortIcon = (col: string) => {
    if (sortBy !== col) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
    return sortDir === "asc" ? <ArrowUp className="h-3 w-3 text-primary" /> : <ArrowDown className="h-3 w-3 text-primary" />;
  };

  const activeFilters = (priorityFilter !== "all" ? 1 : 0) + (categoryFilter !== "all" ? 1 : 0) + (search ? 1 : 0);

  return (
    <div className="page-container animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Tareas</h1>
          <p className="page-subtitle">
            {allPending.length} pendiente{allPending.length !== 1 ? "s" : ""} · {allDone.length} completada{allDone.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Nueva tarea</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nueva tarea</DialogTitle></DialogHeader>
            <form
              onSubmit={(e) => { e.preventDefault(); addTask.mutate(new FormData(e.currentTarget)); }}
              className="space-y-4"
            >
              <div><Label>Título *</Label><Input name="title" required autoFocus /></div>
              <div><Label>Descripción</Label><Textarea name="description" rows={2} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Prioridad</Label>
                  <Select name="priority" defaultValue="medium">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Baja</SelectItem>
                      <SelectItem value="medium">Media</SelectItem>
                      <SelectItem value="high">Alta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Categoría</Label>
                  <Input name="category" placeholder="ej. edición, social..." />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={addTask.isPending}>
                {addTask.isPending ? "Creando..." : "Crear tarea"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <Card key={i} className="h-16 animate-pulse bg-muted" />)}</div>
      ) : tasks.length === 0 ? (
        <div className="empty-state">
          <ListTodo className="h-12 w-12 text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground">No hay tareas aún</p>
        </div>
      ) : (
        <>
          {/* Search & filter bar */}
          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[180px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar tareas..." className="pl-9 h-9 text-sm" />
            </div>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="h-9 w-[120px] text-xs"><SelectValue placeholder="Prioridad" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
                <SelectItem value="medium">Media</SelectItem>
                <SelectItem value="low">Baja</SelectItem>
              </SelectContent>
            </Select>
            {categories.length > 0 && (
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="h-9 w-[140px] text-xs"><SelectValue placeholder="Categoría" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {categories.map((c) => <SelectItem key={c!} value={c!}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            {/* Sort */}
            <div className="flex items-center gap-1 text-xs text-muted-foreground border border-border rounded-md px-2 h-9">
              {([
                { col: "created_at" as const,  label: "Fecha" },
                { col: "priority" as const,    label: "Prio." },
                { col: "title" as const,       label: "Título" },
              ]).map(({ col, label }) => (
                <button key={col} className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded hover:text-foreground ${sortBy === col ? "text-foreground font-medium" : ""}`} onClick={() => toggleSort(col)}>
                  {label} {sortIcon(col)}
                </button>
              ))}
            </div>
            {activeFilters > 0 && (
              <Button variant="ghost" size="sm" className="h-9 text-muted-foreground" onClick={() => { setSearch(""); setPriorityFilter("all"); setCategoryFilter("all"); }}>
                <X className="h-3.5 w-3.5 mr-1" />Limpiar
              </Button>
            )}
          </div>

          <div className="space-y-6">
            {/* Pending */}
            {pending.length > 0 && (
              <div className="space-y-2">
                {pending.map((t) => (
                  <Card key={t.id} className="group hover:border-primary/30 transition-colors">
                    <CardContent className="flex items-center gap-3 py-3">
                      <Checkbox
                        checked={false}
                        onCheckedChange={(checked) => toggleTask.mutate({ id: t.id, done: !!checked })}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{t.title}</p>
                        {t.description && <p className="text-xs text-muted-foreground mt-0.5 truncate">{t.description}</p>}
                        {t.category && <p className="text-[10px] text-muted-foreground/70 mt-0.5">{t.category}</p>}
                      </div>
                      <Badge variant={priorityVariant(t.priority)} className="text-[10px] shrink-0">
                        {priorityLabel(t.priority)}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => setEditing(t)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Empty pending after filters */}
            {allPending.length > 0 && pending.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Sin pendientes para esos filtros</p>
            )}

            {/* Done */}
            {done.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Completadas</p>
                {done.map((t) => (
                  <Card key={t.id} className="opacity-50 group hover:opacity-70 transition-opacity">
                    <CardContent className="flex items-center gap-3 py-3">
                      <Checkbox
                        checked={true}
                        onCheckedChange={(checked) => toggleTask.mutate({ id: t.id, done: !!checked })}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-muted-foreground line-through">{t.title}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => setEditing(t)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <TaskEditSheet task={editing} onClose={() => setEditing(null)} />
    </div>
  );
}
