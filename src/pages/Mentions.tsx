import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AtSign, Plus, ExternalLink } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

export default function Mentions() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: mentions = [], isLoading } = useQuery({
    queryKey: ["mentions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("mentions").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Tables<"mentions">[];
    },
  });

  const addMention = useMutation({
    mutationFn: async (formData: FormData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");
      const m = {
        user_id: user.id,
        name: formData.get("name") as string || null,
        platform: formData.get("platform") as string || null,
        link: formData.get("link") as string || null,
        context: formData.get("context") as string || null,
        date: formData.get("date") as string || null,
      };
      const { error } = await supabase.from("mentions").insert(m);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mentions"] });
      setOpen(false);
      toast.success("Mención agregada");
    },
    onError: (e) => toast.error(e.message),
  });

  const platformIcon = (p: string | null) => {
    const colors: Record<string, string> = {
      twitter: "text-[hsl(var(--chart-1))]",
      instagram: "text-[hsl(var(--chart-4))]",
      youtube: "text-destructive",
      linkedin: "text-[hsl(var(--chart-1))]",
      podcast: "text-[hsl(var(--chart-2))]",
    };
    return colors[p || ""] || "text-muted-foreground";
  };

  return (
    <div className="page-container animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Menciones</h1>
          <p className="page-subtitle">Rastrea dónde te mencionan</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Nueva mención</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nueva mención</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); addMention.mutate(new FormData(e.currentTarget)); }} className="space-y-4">
              <div><Label>Quien te mencionó *</Label><Input name="name" required autoFocus /></div>
              <div><Label>Plataforma</Label>
                <Select name="platform">
                  <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="twitter">Twitter / X</SelectItem>
                    <SelectItem value="instagram">Instagram</SelectItem>
                    <SelectItem value="youtube">YouTube</SelectItem>
                    <SelectItem value="linkedin">LinkedIn</SelectItem>
                    <SelectItem value="podcast">Podcast</SelectItem>
                    <SelectItem value="blog">Blog</SelectItem>
                    <SelectItem value="other">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Enlace</Label><Input name="link" type="url" placeholder="https://..." /></div>
              <div><Label>Contexto</Label><Textarea name="context" placeholder="¿En qué contexto te mencionaron?" /></div>
              <div><Label>Fecha</Label><Input name="date" type="date" /></div>
              <Button type="submit" className="w-full" disabled={addMention.isPending}>Agregar</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <Card key={i} className="h-20 animate-pulse bg-muted" />)}</div>
      ) : mentions.length === 0 ? (
        <div className="empty-state">
          <AtSign className="h-12 w-12 text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground">No hay menciones registradas</p>
        </div>
      ) : (
        <div className="space-y-3">
          {mentions.map((m) => (
            <Card key={m.id}>
              <CardContent className="flex items-center gap-4 py-4">
                <div className={`w-10 h-10 rounded-full bg-secondary flex items-center justify-center ${platformIcon(m.platform)}`}>
                  <AtSign className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground">{m.name || "Anónimo"}</p>
                    {m.platform && <span className="text-xs text-muted-foreground capitalize">{m.platform}</span>}
                  </div>
                  {m.context && <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{m.context}</p>}
                  {m.date && <p className="text-xs text-muted-foreground/60 mt-0.5">{m.date}</p>}
                </div>
                {m.link && (
                  <a href={m.link} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80">
                    <ExternalLink className="w-4 h-4" />
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
