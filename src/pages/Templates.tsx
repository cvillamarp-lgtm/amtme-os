import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { FileText, Plus, Copy } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

export default function Templates() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["episode_templates"],
    queryFn: async () => {
      const { data, error } = await supabase.from("episode_templates").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Tables<"episode_templates">[];
    },
  });

  const addTemplate = useMutation({
    mutationFn: async (formData: FormData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");
      const t = {
        user_id: user.id,
        title: formData.get("title") as string,
        structure: formData.get("structure") as string || null,
        hook: formData.get("hook") as string || null,
        body: formData.get("body") as string || null,
        cta: formData.get("cta") as string || null,
        closing: formData.get("closing") as string || null,
      };
      const { error } = await supabase.from("episode_templates").insert(t);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["episode_templates"] });
      setOpen(false);
      toast.success("Template creado");
    },
    onError: (e) => toast.error(e.message),
  });

  const copyTemplate = (t: Tables<"episode_templates">) => {
    const text = [
      t.hook && `🎣 Hook: ${t.hook}`,
      t.body && `📝 Cuerpo: ${t.body}`,
      t.cta && `📣 CTA: ${t.cta}`,
      t.closing && `🎬 Cierre: ${t.closing}`,
    ].filter(Boolean).join("\n\n");
    navigator.clipboard.writeText(text);
    toast.success("Template copiado");
  };

  return (
    <div className="page-container animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Templates</h1>
          <p className="page-subtitle">Estructuras reutilizables para tus episodios</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Nuevo template</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Nuevo template</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); addTemplate.mutate(new FormData(e.currentTarget)); }} className="space-y-4">
              <div><Label>Nombre *</Label><Input name="title" required placeholder="Ej: Episodio solo, Entrevista..." /></div>
              <div><Label>Estructura general</Label><Textarea name="structure" placeholder="Intro → Tema 1 → Break → Tema 2 → Cierre" /></div>
              <div><Label>Hook</Label><Textarea name="hook" rows={2} placeholder="Cómo abrir el episodio..." /></div>
              <div><Label>Cuerpo</Label><Textarea name="body" rows={2} placeholder="Desarrollo del contenido..." /></div>
              <div><Label>CTA</Label><Textarea name="cta" rows={2} placeholder="Llamada a la acción..." /></div>
              <div><Label>Cierre</Label><Textarea name="closing" rows={2} placeholder="Cómo cerrar el episodio..." /></div>
              <Button type="submit" className="w-full" disabled={addTemplate.isPending}>Crear</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map(i => <Card key={i} className="h-48 animate-pulse bg-muted" />)}
        </div>
      ) : templates.length === 0 ? (
        <div className="empty-state">
          <FileText className="h-12 w-12 text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground">No hay templates aún</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map((t) => (
            <Card key={t.id} className="group">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base">{t.title}</CardTitle>
                  <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => copyTemplate(t)}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                {t.structure && <p className="text-xs text-muted-foreground">{t.structure}</p>}
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {t.hook && (
                  <div className="bg-secondary/50 rounded-lg p-3">
                    <p className="text-xs font-medium text-primary mb-1">🎣 Hook</p>
                    <p className="text-muted-foreground text-xs line-clamp-2">{t.hook}</p>
                  </div>
                )}
                {t.body && (
                  <div className="bg-secondary/50 rounded-lg p-3">
                    <p className="text-xs font-medium text-primary mb-1">📝 Cuerpo</p>
                    <p className="text-muted-foreground text-xs line-clamp-2">{t.body}</p>
                  </div>
                )}
                {t.cta && (
                  <div className="bg-secondary/50 rounded-lg p-3">
                    <p className="text-xs font-medium text-primary mb-1">📣 CTA</p>
                    <p className="text-muted-foreground text-xs line-clamp-2">{t.cta}</p>
                  </div>
                )}
                {t.closing && (
                  <div className="bg-secondary/50 rounded-lg p-3">
                    <p className="text-xs font-medium text-primary mb-1">🎬 Cierre</p>
                    <p className="text-muted-foreground text-xs line-clamp-2">{t.closing}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
