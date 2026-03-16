import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  useKnowledgeDocs,
  useCreateKnowledgeDoc,
  useArchiveKnowledgeDoc,
  useUpdateKnowledgeDoc,
} from "@/hooks/useKnowledgeBase";
import {
  knowledgeDocSchema,
  KNOWLEDGE_DOC_TYPES,
  type KnowledgeDocInput,
} from "@/lib/schemas";
import { Plus, BookOpen, Trash2, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const DOC_TYPE_LABELS: Record<string, string> = {
  sop: "SOP (Procedimiento)",
  prompt: "Prompt de IA",
  reference: "Referencia",
  insight: "Insight",
};

const TYPE_COLORS: Record<string, string> = {
  sop: "bg-blue-500/10 text-blue-500",
  prompt: "bg-purple-500/10 text-purple-500",
  reference: "bg-green-500/10 text-green-500",
  insight: "bg-orange-500/10 text-orange-500",
};

function tagsFromString(raw?: string): string[] {
  return raw
    ? raw
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
    : [];
}

// ─── Shared form (create + edit) ──────────────────────────────────────────
function DocForm({
  defaultValues,
  onSave,
  isPending,
  submitLabel,
}: {
  defaultValues?: Partial<KnowledgeDocInput>;
  onSave: (data: KnowledgeDocInput) => Promise<void>;
  isPending: boolean;
  submitLabel: string;
}) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
  } = useForm<KnowledgeDocInput>({
    resolver: zodResolver(knowledgeDocSchema),
    defaultValues: { doc_type: "sop", ...defaultValues },
  });

  // Reset when defaultValues changes (edit mode opens with different doc)
  useEffect(() => {
    reset({ doc_type: "sop", ...defaultValues });
  }, [defaultValues, reset]);

  return (
    <form onSubmit={handleSubmit(onSave)} className="space-y-4 pt-2" noValidate>
      {/* Title */}
      <div className="space-y-1">
        <Label htmlFor="kb-title">Título</Label>
        <Input
          id="kb-title"
          placeholder="Nombre del documento"
          {...register("title")}
          aria-invalid={!!errors.title}
        />
        {errors.title && (
          <p className="text-xs text-destructive">{errors.title.message}</p>
        )}
      </div>

      {/* Type */}
      <div className="space-y-1">
        <Label>Tipo</Label>
        <Controller
          name="doc_type"
          control={control}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger aria-invalid={!!errors.doc_type}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {KNOWLEDGE_DOC_TYPES.map((v) => (
                  <SelectItem key={v} value={v}>
                    {DOC_TYPE_LABELS[v]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.doc_type && (
          <p className="text-xs text-destructive">{errors.doc_type.message}</p>
        )}
      </div>

      {/* Body */}
      <div className="space-y-1">
        <Label htmlFor="kb-body">Contenido</Label>
        <Textarea
          id="kb-body"
          placeholder="Escribe el contenido aquí…"
          rows={7}
          className="resize-y"
          {...register("body")}
          aria-invalid={!!errors.body}
        />
        {errors.body && (
          <p className="text-xs text-destructive">{errors.body.message}</p>
        )}
      </div>

      {/* Tags */}
      <div className="space-y-1">
        <Label htmlFor="kb-tags">Tags (separados por coma)</Label>
        <Input
          id="kb-tags"
          placeholder="audio, producción, guion"
          {...register("tags")}
        />
      </div>

      <Button type="submit" disabled={isPending} className="w-full">
        {submitLabel}
      </Button>
    </form>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────
export default function KnowledgeBase() {
  const [filterType, setFilterType] = useState<string>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [editDoc, setEditDoc] = useState<any>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const { data: docs = [] } = useKnowledgeDocs(
    filterType === "all" ? undefined : filterType
  );
  const createMutation = useCreateKnowledgeDoc();
  const updateMutation = useUpdateKnowledgeDoc();
  const archiveMutation = useArchiveKnowledgeDoc();

  const handleCreate = async (data: KnowledgeDocInput) => {
    if (!userId) return;
    await createMutation.mutateAsync({
      user_id: userId,
      title: data.title,
      body: data.body?.trim() || null,
      doc_type: data.doc_type,
      tags: tagsFromString(data.tags),
      status: "active",
    });
    toast.success("Documento creado");
    setCreateOpen(false);
  };

  const handleUpdate = async (data: KnowledgeDocInput) => {
    if (!editDoc) return;
    await updateMutation.mutateAsync({
      id: editDoc.id,
      title: data.title,
      body: data.body?.trim() || null,
      doc_type: data.doc_type,
      tags: tagsFromString(data.tags),
    });
    toast.success("Documento actualizado");
    setEditDoc(null);
  };

  const editDefaults = editDoc
    ? {
        title: editDoc.title,
        body: editDoc.body ?? "",
        doc_type: editDoc.doc_type,
        tags: (editDoc.tags ?? []).join(", "),
      }
    : undefined;

  return (
    <div className="page-container animate-fade-in">
      <PageHeader
        title="Knowledge Base"
        subtitle="SOPs, prompts de IA, referencias e insights del podcast."
      />

      <div className="flex items-center justify-between gap-4 mt-6 mb-4 flex-wrap">
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filtrar por tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los tipos</SelectItem>
            {KNOWLEDGE_DOC_TYPES.map((v) => (
              <SelectItem key={v} value={v}>
                {DOC_TYPE_LABELS[v]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo documento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Nuevo documento</DialogTitle>
            </DialogHeader>
            <DocForm
              onSave={handleCreate}
              isPending={createMutation.isPending}
              submitLabel="Crear documento"
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit dialog */}
      <Dialog
        open={!!editDoc}
        onOpenChange={(open) => {
          if (!open) setEditDoc(null);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar documento</DialogTitle>
          </DialogHeader>
          <DocForm
            key={editDoc?.id} // remount form when editing different doc
            defaultValues={editDefaults}
            onSave={handleUpdate}
            isPending={updateMutation.isPending}
            submitLabel="Guardar cambios"
          />
        </DialogContent>
      </Dialog>

      {/* Docs grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {docs.length === 0 ? (
          <div className="col-span-full text-center py-16 text-muted-foreground">
            <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-25" />
            <p className="font-medium">No hay documentos aún.</p>
            <p className="text-sm mt-1">
              Crea el primero haciendo clic en "Nuevo documento".
            </p>
          </div>
        ) : (
          docs.map((doc) => (
            <Card key={doc.id} className="flex flex-col">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base leading-snug">{doc.title}</CardTitle>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => setEditDoc(doc)}
                    >
                      <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => {
                        archiveMutation.mutate(doc.id);
                        toast.success("Documento archivado");
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full w-fit ${
                    TYPE_COLORS[doc.doc_type] || "bg-muted text-muted-foreground"
                  }`}
                >
                  {DOC_TYPE_LABELS[doc.doc_type] || doc.doc_type}
                </span>
              </CardHeader>
              <CardContent className="flex-1">
                {doc.body && (
                  <p className="text-sm text-muted-foreground line-clamp-5 whitespace-pre-wrap">
                    {doc.body}
                  </p>
                )}
                {doc.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {doc.tags.map((tag: string) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
