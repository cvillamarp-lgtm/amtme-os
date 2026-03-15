import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus, Plus, Search, Mail, Briefcase, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type Guest = Tables<"guests">;

const STATUS_STYLES: Record<string, string> = {
  confirmed: "text-[hsl(var(--chart-2))] bg-[hsl(var(--chart-2)/0.1)] border-[hsl(var(--chart-2)/0.2)]",
  contacted: "text-[hsl(var(--chart-3))] bg-[hsl(var(--chart-3)/0.1)] border-[hsl(var(--chart-3)/0.2)]",
  recorded:  "text-[hsl(var(--chart-1))] bg-[hsl(var(--chart-1)/0.1)] border-[hsl(var(--chart-1)/0.2)]",
};
const STATUS_LABELS: Record<string, string> = {
  confirmed: "Confirmado",
  contacted: "Contactado",
  recorded:  "Grabado",
  pending:   "Pendiente",
};

function statusStyle(s: string | null) { return STATUS_STYLES[s ?? ""] ?? "text-muted-foreground bg-muted border-border"; }
function statusLabel(s: string | null) { return STATUS_LABELS[s ?? ""] ?? "Pendiente"; }

function GuestEditSheet({ guest, onClose }: { guest: Guest | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState(guest?.name ?? "");
  const [role, setRole] = useState(guest?.role ?? "");
  const [bio, setBio] = useState(guest?.bio ?? "");
  const [contact, setContact] = useState(guest?.contact ?? "");
  const [topics, setTopics] = useState((guest?.topics as string[] ?? []).join(", "));
  const [status, setStatus] = useState(guest?.status ?? "pending");

  const save = useMutation({
    mutationFn: async () => {
      if (!guest) return;
      const { error } = await supabase.from("guests").update({
        name,
        role: role || null,
        bio: bio || null,
        contact: contact || null,
        topics: topics ? topics.split(",").map((t) => t.trim()).filter(Boolean) : [],
        status,
      }).eq("id", guest.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["guests"] });
      toast.success("Invitado actualizado");
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async () => {
      if (!guest) return;
      const { error } = await supabase.from("guests").delete().eq("id", guest.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["guests"] });
      toast.success("Invitado eliminado");
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

  if (!guest) return null;

  return (
    <Sheet open={!!guest} onOpenChange={() => onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle className="font-display">Editar invitado</SheetTitle>
        </SheetHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nombre *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre completo" />
          </div>
          <div className="space-y-1.5">
            <Label>Rol / Cargo</Label>
            <Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="CEO, Autor, Coach..." />
          </div>
          <div className="space-y-1.5">
            <Label>Bio</Label>
            <Textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} placeholder="Descripción breve..." />
          </div>
          <div className="space-y-1.5">
            <Label>Contacto</Label>
            <Input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Email o red social" />
          </div>
          <div className="space-y-1.5">
            <Label>Temas (separados por coma)</Label>
            <Input value={topics} onChange={(e) => setTopics(e.target.value)} placeholder="marketing, startups, IA" />
          </div>
          <div className="space-y-1.5">
            <Label>Estado</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pendiente</SelectItem>
                <SelectItem value="contacted">Contactado</SelectItem>
                <SelectItem value="confirmed">Confirmado</SelectItem>
                <SelectItem value="recorded">Grabado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-border">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                if (confirm(`¿Eliminar a "${guest.name}"?`)) remove.mutate();
              }}
              disabled={remove.isPending}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              {remove.isPending ? "Eliminando..." : "Eliminar"}
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>Cancelar</Button>
              <Button onClick={() => save.mutate()} disabled={!name.trim() || save.isPending}>
                {save.isPending ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default function Guests() {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Guest | null>(null);
  const [search, setSearch] = useState("");
  const qc = useQueryClient();

  const { data: guests = [], isLoading } = useQuery({
    queryKey: ["guests"],
    queryFn: async () => {
      const { data, error } = await supabase.from("guests").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Guest[];
    },
  });

  const addGuest = useMutation({
    mutationFn: async (formData: FormData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");
      const topicsRaw = formData.get("topics") as string;
      const { error } = await supabase.from("guests").insert({
        user_id: user.id,
        name: formData.get("name") as string,
        role: (formData.get("role") as string) || null,
        bio: (formData.get("bio") as string) || null,
        contact: (formData.get("contact") as string) || null,
        status: (formData.get("status") as string) || "pending",
        topics: topicsRaw ? topicsRaw.split(",").map((t) => t.trim()).filter(Boolean) : [],
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["guests"] });
      setOpen(false);
      toast.success("Invitado agregado");
    },
    onError: (e) => toast.error(e.message),
  });

  const filtered = guests.filter((g) =>
    !search ||
    g.name?.toLowerCase().includes(search.toLowerCase()) ||
    g.role?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page-container animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Invitados</h1>
          <p className="page-subtitle">Gestiona los invitados de tu podcast</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Nuevo invitado</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nuevo invitado</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); addGuest.mutate(new FormData(e.currentTarget)); }} className="space-y-4">
              <div><Label>Nombre *</Label><Input name="name" required autoFocus /></div>
              <div><Label>Rol / Cargo</Label><Input name="role" placeholder="CEO, Autor, Coach..." /></div>
              <div><Label>Bio</Label><Textarea name="bio" rows={2} /></div>
              <div><Label>Contacto</Label><Input name="contact" placeholder="Email o red social" /></div>
              <div><Label>Temas (separados por coma)</Label><Input name="topics" placeholder="marketing, startups, IA" /></div>
              <div>
                <Label>Estado</Label>
                <Select name="status" defaultValue="pending">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pendiente</SelectItem>
                    <SelectItem value="contacted">Contactado</SelectItem>
                    <SelectItem value="confirmed">Confirmado</SelectItem>
                    <SelectItem value="recorded">Grabado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full" disabled={addGuest.isPending}>
                {addGuest.isPending ? "Agregando..." : "Agregar"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar invitados..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Card key={i} className="h-40 animate-pulse bg-muted" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <UserPlus className="h-12 w-12 text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground">{search ? "Sin resultados" : "No hay invitados aún"}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((g) => (
            <Card
              key={g.id}
              className="cursor-pointer hover:border-primary/30 transition-colors"
              onClick={() => setEditing(g)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base">{g.name}</CardTitle>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${statusStyle(g.status)}`}>
                    {statusLabel(g.status)}
                  </span>
                </div>
                {g.role && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Briefcase className="w-3 h-3" /> {g.role}
                  </p>
                )}
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                {g.bio && <p className="text-muted-foreground line-clamp-2">{g.bio}</p>}
                {g.contact && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Mail className="w-3 h-3" /> {g.contact}
                  </p>
                )}
                {Array.isArray(g.topics) && g.topics.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {(g.topics as string[]).map((t) => (
                      <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <GuestEditSheet guest={editing} onClose={() => setEditing(null)} />
    </div>
  );
}
