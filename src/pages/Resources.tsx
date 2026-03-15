import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { FileText, Plus, ExternalLink } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

export default function Resources() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: resources = [], isLoading } = useQuery({
    queryKey: ["resources"],
    queryFn: async () => {
      const { data, error } = await supabase.from("resources").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Tables<"resources">[];
    },
  });

  const addResource = useMutation({
    mutationFn: async (formData: FormData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");
      const r = {
        user_id: user.id,
        title: formData.get("title") as string,
        type: formData.get("type") as string || null,
        link: formData.get("link") as string || null,
        description: formData.get("description") as string || null,
      };
      const { error } = await supabase.from("resources").insert(r);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resources"] });
      setOpen(false);
      toast.success("Recurso añadido");
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="page-container animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Recursos</h1>
          <p className="page-subtitle">Enlaces, herramientas y referencias</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Añadir recurso</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nuevo recurso</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); addResource.mutate(new FormData(e.currentTarget)); }} className="space-y-4">
              <div><Label>Título *</Label><Input name="title" required /></div>
              <div><Label>Tipo</Label><Input name="type" placeholder="Artículo, herramienta, libro..." /></div>
              <div><Label>Enlace</Label><Input name="link" type="url" /></div>
              <div><Label>Descripción</Label><Textarea name="description" /></div>
              <Button type="submit" className="w-full" disabled={addResource.isPending}>Guardar</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1,2].map(i => <Card key={i} className="h-16 animate-pulse bg-muted" />)}</div>
      ) : resources.length === 0 ? (
        <div className="empty-state">
          <FileText className="h-12 w-12 text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground">No hay recursos aún</p>
        </div>
      ) : (
        <div className="space-y-3">
          {resources.map((r) => (
            <Card key={r.id}>
              <CardContent className="flex items-center justify-between py-4">
                <div>
                  <p className="font-medium text-sm">{r.title}</p>
                  {r.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{r.description}</p>}
                </div>
                {r.link && (
                  <a href={r.link} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
