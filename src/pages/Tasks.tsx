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
import { Plus, Trash2, Pencil } from "lucide-react";
import { TruncatedText } from "@/components/ui/text-clamp";
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

type Task = Tables<"tasks">;

// ─── Config ────────────────────────────────────────────────────────────────

const TASK_COLUMNS = [
  { id: 'title', label: 'Tarea', sortable: true, visible: true },
  { id: 'category', label: 'Categoría', sortable: true, visible: true },
  { id: 'priority', label: 'Prioridad', sortable: true, visible: true },
  { id: 'status', label: 'Estado', sortable: true, visible: false },
  { id: 'created_at', label: 'Creada', sortable: true, visible: false },
];

const TASK_SORT_OPTIONS: SortOption[] = [
  { value: 'title', label: 'Título' },
  { value: 'priority', label: 'Prioridad' },
  { value: 'category', label: 'Categoría' },
  { value: 'created_at', label: 'Fecha de creación' },
];

const TASK_FILTER_DEFS: FilterDef[] = [
  {
    field: 'priority',
    label: 'Prioridad',
    type: 'select',
    options: [
      { value: 'high', label: 'Alta' },
      { value: 'medium', label: 'Media' },
      { value: 'low', label: 'Baja' },
    ],
  },
  {
    field: 'status',
    label: 'Estado',
    type: 'select',
    options: [
      { value: 'todo', label: 'Pendiente' },
      { value: 'done', label: 'Completada' },
    ],
  },
];

const TASK_DEFAULT_VIEWS: SavedView[] = [
  {
    id: 'view-pending',
    name: 'Pendientes',
    filters: [{ id: 'f-pending', field: 'status', operator: 'equals', value: 'todo', label: 'Estado: Pendiente' }],
    sortRules: [],
    visibleColumns: ['title', 'category', 'priority'],
    viewType: 'table',
    isDefault: true,
  },
];

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
  const [filtersOpen, setFiltersOpen] = useState(false);
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

  const table = useSmartTable({
    data: tasks,
    columns: TASK_COLUMNS,
    searchFields: ['title', 'description', 'category'],
    defaultSort: [{ field: 'created_at', direction: 'desc' }],
    defaultViews: TASK_DEFAULT_VIEWS,
    persistKey: 'amtme:list:tasks:v1',
    pageSize: 50,
    defaultViewType: 'table',
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

  const markCompletedBulk = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from("tasks")
        .update({ status: "done" })
        .in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["sidebar-counts"] });
      table.clearSelection();
      toast.success("Tareas marcadas como completadas");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteBulk = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from("tasks").delete().in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["sidebar-counts"] });
      table.clearSelection();
      toast.success("Tareas eliminadas");
    },
    onError: (e) => toast.error(e.message),
  });

  const pending = table.filtered.filter((t) => t.status !== "done");
  const done = table.filtered.filter((t) => t.status === "done");

  return (
    <div className="page-container animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Tareas</h1>
          <p className="page-subtitle">
            {tasks.filter(t => t.status !== 'done').length} pendiente{tasks.filter(t => t.status !== 'done').length !== 1 ? "s" : ""} · {tasks.filter(t => t.status === 'done').length} completada{tasks.filter(t => t.status === 'done').length !== 1 ? "s" : ""}
          </p>
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
            label: 'Marcar completadas',
            onClick: () => markCompletedBulk.mutate(Array.from(table.selectedIds)),
          },
          {
            label: 'Eliminar',
            variant: 'destructive',
            icon: <Trash2 className="h-3.5 w-3.5" />,
            onClick: () => {
              if (confirm(`¿Eliminar ${table.selectedIds.size} tarea(s)? Esta acción no se puede deshacer.`)) {
                deleteBulk.mutate(Array.from(table.selectedIds));
              }
            },
          },
        ]}
      />

      <ListingToolbar
        searchQuery={table.searchQuery}
        onSearchChange={table.setSearchQuery}
        searchPlaceholder="Buscar tareas..."
        sortOptions={TASK_SORT_OPTIONS}
        currentSort={table.currentSort}
        onSortChange={table.setSortRule}
        filters={table.filters}
        onClearFilters={table.clearFilters}
        onRemoveFilter={table.removeFilter}
        totalCount={table.totalCount}
        filteredCount={table.filteredCount}
        filtersOpen={filtersOpen}
        onFiltersToggle={() => setFiltersOpen(v => !v)}
        showViewToggle={false}
      >
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-2" />Nueva tarea</Button>
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
      </ListingToolbar>

      <FiltersPanel
        open={filtersOpen}
        filterDefs={TASK_FILTER_DEFS}
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
        <div className="space-y-3">{[1, 2, 3].map(i => <Card key={i} className="h-16 animate-pulse bg-muted" />)}</div>
      ) : table.filteredCount === 0 ? (
        <SmartEmptyState
          filtered={table.filters.length > 0 || !!table.searchQuery}
          onClearFilters={table.clearFilters}
          title="No hay tareas aún"
          description="Crea tu primera tarea"
          action={
            <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />Nueva tarea
            </Button>
          }
        />
      ) : (
        <div className="space-y-6">
          {pending.length > 0 && (
            <div className="space-y-2">
              {pending.map((t) => (
                <Card key={t.id} className={`group hover:border-primary/30 transition-colors ${table.selectedIds.has(t.id) ? 'border-primary/50 bg-primary/5' : ''}`}>
                  <CardContent className="flex items-center gap-3 py-3">
                    <Checkbox
                      checked={table.selectedIds.has(t.id)}
                      onCheckedChange={() => table.toggleSelection(t.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <Checkbox
                      checked={false}
                      onCheckedChange={(checked) => toggleTask.mutate({ id: t.id, done: !!checked })}
                    />
                    <div className="flex-1 min-w-0">
                      <TruncatedText className="text-sm font-medium text-foreground">{t.title}</TruncatedText>
                      {t.description && <TruncatedText className="text-xs text-muted-foreground mt-0.5">{t.description}</TruncatedText>}
                      {t.category && <p className="text-xs text-muted-foreground mt-0.5">{t.category}</p>}
                    </div>
                    <Badge variant={priorityVariant(t.priority)} className="text-xs shrink-0">
                      {priorityLabel(t.priority)}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => setEditing(t)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {done.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Completadas</p>
              {done.map((t) => (
                <Card key={t.id} className={`group hover:opacity-70 transition-opacity ${table.selectedIds.has(t.id) ? 'opacity-70 border-primary/50' : 'opacity-50'}`}>
                  <CardContent className="flex items-center gap-3 py-3">
                    <Checkbox
                      checked={table.selectedIds.has(t.id)}
                      onCheckedChange={() => table.toggleSelection(t.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
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
                      className="h-10 w-10 opacity-0 group-hover:opacity-100 transition-opacity"
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

      <TaskEditSheet task={editing} onClose={() => setEditing(null)} />
    </div>
  );
}
