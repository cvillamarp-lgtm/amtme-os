import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Users, Plus } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

export default function Audience() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: members = [], isLoading } = useQuery({
    queryKey: ["audience_members"],
    queryFn: async () => {
      const { data, error } = await supabase.from("audience_members").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Tables<"audience_members">[];
    },
  });

  const addMember = useMutation({
    mutationFn: async (formData: FormData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");
      const member = {
        user_id: user.id,
        name: formData.get("name") as string,
        gender: formData.get("gender") as string || null,
        age_range: formData.get("age_range") as string || null,
        occupation: formData.get("occupation") as string || null,
        description: formData.get("description") as string || null,
      };
      const { error } = await supabase.from("audience_members").insert(member);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["audience_members"] });
      setOpen(false);
      toast.success("Miembro añadido");
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="page-container animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Audiencia</h1>
          <p className="page-subtitle">Perfiles de tu público objetivo</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Añadir</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nuevo miembro</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); addMember.mutate(new FormData(e.currentTarget)); }} className="space-y-4">
              <div><Label>Nombre *</Label><Input name="name" required /></div>
              <div><Label>Género</Label>
                <Select name="gender"><SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Masculino</SelectItem>
                    <SelectItem value="female">Femenino</SelectItem>
                    <SelectItem value="non-binary">No binario</SelectItem>
                    <SelectItem value="prefer_not_to_say">Prefiero no decir</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Rango de edad</Label>
                <Select name="age_range"><SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="18-24">18-24</SelectItem>
                    <SelectItem value="25-34">25-34</SelectItem>
                    <SelectItem value="35-44">35-44</SelectItem>
                    <SelectItem value="45+">45+</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Ocupación</Label><Input name="occupation" /></div>
              <div><Label>Descripción</Label><Textarea name="description" /></div>
              <Button type="submit" className="w-full" disabled={addMember.isPending}>Guardar</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <Card key={i} className="h-32 animate-pulse bg-muted" />)}
        </div>
      ) : members.length === 0 ? (
        <div className="empty-state">
          <Users className="h-12 w-12 text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground">No hay perfiles de audiencia aún</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {members.map((m) => (
            <Card key={m.id}>
              <CardHeader><CardTitle className="text-base">{m.name}</CardTitle></CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-1">
                {m.occupation && <p>{m.occupation}</p>}
                {m.age_range && <p>{m.age_range} años</p>}
                {m.description && <p className="line-clamp-2">{m.description}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
