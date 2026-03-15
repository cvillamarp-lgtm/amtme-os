import { useEffect, useState } from "react";
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
import { Plus, BookOpen, Trash2, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const DOC_TYPES = [
  { value: "sop", label: "SOP (Procedimiento)" },
  { value: "prompt", label: "Prompt de IA" },
  { value: "reference", label: "Referencia" },
  { value: "insight", label: "Insight" },
];

const TYPE_COLORS: Record<string, string> = {
  sop: "bg-blue-500/10 text-blue-500",
  prompt: "bg-purple-500/10 text-purple-500",
  reference: "bg-green-500/10 text-green-500",
  insight: "bg-orange-500/10 text-orange-500",
};

const EMPTY_FORM = { title: "", body: "", doc_type: "sop", tags: "" };

export default function KnowledgeBase() {
  const [filterType, setFilterType] = useState<string>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [editDoc, setEditDoc] = useState<any>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const { data: docs = [] } = useKnowledgeDocs(
    filterType === "all" ? undefined : filterType
  );
  const createMutation = useCreateKnowledgeDoc();
  const updateMutation = useUpdateKnowledgeDoc();
  const archiveMutation = useArchiveKnowledgeDoc();

  const handleCreate = async () => {
    if (!form.title.trim() || !userId) {
      toast.error("Escribe un título para el documento.");
      return;
    }
    try {
      await createMutation.mutateAsync({
        user_id: userId,
        title: form.title.trim(),
        body: form.body.trim() || null,
        doc_type: form.doc_type,
        tags: form.tags
          ? form.tags
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean)
          : [],
        status: "active",
      });
      toast.success("Documento creado");
      setForm(EMPTY_FORM);
      setCreateOpen(false);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleUpdate = async () => {
    if (!editDoc || !form.title.trim()) return;
    try {
      await updateMutation.mutateAsync({
        id: editDoc.id,
        title: form.title.trim(),
        body: form.body.trim() || null,
        doc_type: form.doc_type,
        tags: form.tags
          ? form.tags
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean)
          : [],
      });
      toast.success("Documento actualizado");
      setEditDoc(null);
      setForm(EMPTY_FORM);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const openEdit = (doc: any) => {
    setEditDoc(doc);
    setForm({
      title: doc.title,
      body: doc.body || "",
      doc_type: doc.doc_type,
      tags: (doc.tags || []).join(", "),
    });
  };

  const DocForm = ({ onSubmit, label }: { onSubmit: () => void; label: string }) => (
    <div className="space-y-4 pt-2">
      <div className="space-y-2">
        <Label>Título</Label>
        <Input
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          placeholder="Nombre del documento"
        />
      </div>
      <div className="space-y-2">
        <Label>Tipo</Label>
        <Select
          value={form.doc_type}
          onValueChange={(v) => setForm((f) => ({ ...f, doc_type: v }))}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DOC_TYPES.map((dt) => (
              <SelectItem key={dt.value} value={dt.value}>
                {dt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Contenido</Label>
        <Textarea
          value={form.body}
          onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
          placeholder="Escribe el contenido aquí…"
          rows={7}
          className="resize-y"
        />
      </div>
      <div className="space-y-2">
        <Label>Tags (separados por coma)</Label>
        <Input
          value={form.tags}
          onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
          placeholder="audio, producción, guion"
        />
      </div>
      <Button
        onClick={onSubmit}
        disabled={createMutation.isPending || updateMutation.isPending}
        className="w-full"
      >
        {label}
      </Button>
    </div>
  );

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
            {DOC_TYPES.map((dt) => (
              <SelectItem key={dt.value} value={dt.value}>
                {dt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setForm(EMPTY_FORM)}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo documento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Nuevo documento</DialogTitle>
            </DialogHeader>
            <DocForm onSubmit={handleCreate} label="Crear documento" />
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit dialog */}
      <Dialog open={!!editDoc} onOpenChange={(open) => { if (!open) setEditDoc(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar documento</DialogTitle>
          </DialogHeader>
          <DocForm onSubmit={handleUpdate} label="Guardar cambios" />
        </DialogContent>
      </Dialog>

      {/* Docs grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {docs.length === 0 ? (
          <div className="col-span-full text-center py-16 text-muted-foreground">
            <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-25" />
            <p className="font-medium">No hay documentos aún.</p>
            <p className="text-sm mt-1">Crea el primero haciendo clic en "Nuevo documento".</p>
          </div>
        ) : (
          (docs as any[]).map((doc) => (
            <Card key={doc.id} className="flex flex-col">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base leading-snug">{doc.title}</CardTitle>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => openEdit(doc)}
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
                  {DOC_TYPES.find((t) => t.value === doc.doc_type)?.label || doc.doc_type}
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
