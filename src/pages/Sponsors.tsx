import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DollarSign, Plus, Search, Handshake, Trash2, ExternalLink, Mic } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Sponsor {
  id: string;
  user_id: string;
  name: string;
  website: string | null;
  contact: string | null;
  notes: string | null;
  status: "prospect" | "active" | "paused" | "ended";
  created_at: string;
  updated_at: string;
}

interface Sponsorship {
  id: string;
  user_id: string;
  sponsor_id: string;
  episode_id: string | null;
  type: "pre-roll" | "mid-roll" | "post-roll" | "host-read" | "segment";
  rate: number | null;
  currency: string;
  status: "prospect" | "confirmed" | "recorded" | "published" | "paid";
  notes: string | null;
  created_at: string;
  updated_at: string;
  // joined
  sponsors?: { name: string };
  episodes?: { title: string; number: string | null } | null;
}

// ─── Status helpers ───────────────────────────────────────────────────────────

const SPONSOR_STATUS_LABELS: Record<string, string> = {
  prospect: "Prospecto",
  active:   "Activo",
  paused:   "Pausado",
  ended:    "Finalizado",
};

const SPONSOR_STATUS_STYLES: Record<string, string> = {
  prospect: "text-amber-600 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-950/30 dark:border-amber-800",
  active:   "text-emerald-600 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-950/30 dark:border-emerald-800",
  paused:   "text-blue-600 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-950/30 dark:border-blue-800",
  ended:    "text-muted-foreground bg-muted border-border",
};

const DEAL_STATUS_LABELS: Record<string, string> = {
  prospect:  "Prospecto",
  confirmed: "Confirmado",
  recorded:  "Grabado",
  published: "Publicado",
  paid:      "Pagado",
};

const DEAL_STATUS_STYLES: Record<string, string> = {
  prospect:  "text-amber-600 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-950/30 dark:border-amber-800",
  confirmed: "text-blue-600 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-950/30 dark:border-blue-800",
  recorded:  "text-purple-600 bg-purple-50 border-purple-200 dark:text-purple-400 dark:bg-purple-950/30 dark:border-purple-800",
  published: "text-emerald-600 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-950/30 dark:border-emerald-800",
  paid:      "text-emerald-700 bg-emerald-100 border-emerald-300 dark:text-emerald-300 dark:bg-emerald-900/30 dark:border-emerald-700",
};

// ─── Hooks ────────────────────────────────────────────────────────────────────

function useSponsors() {
  return useQuery({
    queryKey: ["sponsors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sponsors")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Sponsor[];
    },
  });
}

function useSponsorships() {
  return useQuery({
    queryKey: ["sponsorships"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sponsorships")
        .select("*, sponsors(name), episodes(title, number)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Sponsorship[];
    },
  });
}

// ─── Sponsor edit sheet ───────────────────────────────────────────────────────

function SponsorSheet({
  sponsor,
  onClose,
}: {
  sponsor: Sponsor | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [name, setName] = useState(sponsor?.name ?? "");
  const [website, setWebsite] = useState(sponsor?.website ?? "");
  const [contact, setContact] = useState(sponsor?.contact ?? "");
  const [notes, setNotes] = useState(sponsor?.notes ?? "");
  const [status, setStatus] = useState(sponsor?.status ?? "prospect");

  const save = useMutation({
    mutationFn: async () => {
      if (!sponsor) return;
      const { error } = await supabase
        .from("sponsors")
        .update({
          name: name.trim(),
          website: website.trim() || null,
          contact: contact.trim() || null,
          notes: notes.trim() || null,
          status,
        })
        .eq("id", sponsor.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sponsors"] });
      toast.success("Patrocinador actualizado");
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async () => {
      if (!sponsor) return;
      const { error } = await supabase.from("sponsors").delete().eq("id", sponsor.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sponsors"] });
      toast.success("Patrocinador eliminado");
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!sponsor) return null;

  return (
    <Sheet open={!!sponsor} onOpenChange={() => onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle>Editar patrocinador</SheetTitle>
        </SheetHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nombre *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Sitio web</Label>
            <Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://..." />
          </div>
          <div className="space-y-1.5">
            <Label>Contacto</Label>
            <Input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Email o nombre de contacto" />
          </div>
          <div className="space-y-1.5">
            <Label>Estado</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="prospect">Prospecto</SelectItem>
                <SelectItem value="active">Activo</SelectItem>
                <SelectItem value="paused">Pausado</SelectItem>
                <SelectItem value="ended">Finalizado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Notas internas</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Condiciones, personas clave…" />
          </div>
          <div className="flex justify-between items-center pt-4 border-t border-border">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                if (confirm(`¿Eliminar "${sponsor.name}"?`)) remove.mutate();
              }}
              disabled={remove.isPending}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              {remove.isPending ? "Eliminando…" : "Eliminar"}
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>Cancelar</Button>
              <Button onClick={() => save.mutate()} disabled={!name.trim() || save.isPending}>
                {save.isPending ? "Guardando…" : "Guardar"}
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── Revenue summary ──────────────────────────────────────────────────────────

function RevenueSummary({ sponsorships }: { sponsorships: Sponsorship[] }) {
  const total = sponsorships
    .filter((s) => s.status !== "prospect")
    .reduce((acc, s) => acc + (s.rate ?? 0), 0);

  const paid = sponsorships
    .filter((s) => s.status === "paid")
    .reduce((acc, s) => acc + (s.rate ?? 0), 0);

  const pending = total - paid;

  return (
    <div className="grid grid-cols-3 gap-4">
      {[
        { label: "Total pactado", value: total, color: "text-foreground" },
        { label: "Cobrado", value: paid, color: "text-emerald-600 dark:text-emerald-400" },
        { label: "Por cobrar", value: pending, color: "text-amber-600 dark:text-amber-400" },
      ].map(({ label, value, color }) => (
        <Card key={label}>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground mb-1">{label}</p>
            <p className={`text-xl font-semibold ${color}`}>
              ${value.toLocaleString("es-MX", { minimumFractionDigits: 0 })}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Sponsors() {
  const [sponsorOpen, setSponsorOpen] = useState(false);
  const [dealOpen, setDealOpen] = useState(false);
  const [editingSponsor, setEditingSponsor] = useState<Sponsor | null>(null);
  const [search, setSearch] = useState("");
  const qc = useQueryClient();

  const { data: sponsors = [], isLoading: loadingSponsors } = useSponsors();
  const { data: sponsorships = [], isLoading: loadingDeals } = useSponsorships();

  const { data: episodes = [] } = useQuery({
    queryKey: ["episodes-mini"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("episodes")
        .select("id, title, number")
        .order("number", { ascending: false });
      if (error) throw error;
      return data as { id: string; title: string; number: string | null }[];
    },
  });

  const createSponsor = useMutation({
    mutationFn: async (formData: FormData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");
      const { error } = await supabase.from("sponsors").insert({
        user_id: user.id,
        name: (formData.get("name") as string).trim(),
        website: (formData.get("website") as string).trim() || null,
        contact: (formData.get("contact") as string).trim() || null,
        notes: (formData.get("notes") as string).trim() || null,
        status: (formData.get("status") as string) || "prospect",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sponsors"] });
      setSponsorOpen(false);
      toast.success("Patrocinador agregado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const createDeal = useMutation({
    mutationFn: async (formData: FormData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");
      const rateRaw = formData.get("rate") as string;
      const episodeId = formData.get("episode_id") as string;
      const { error } = await supabase.from("sponsorships").insert({
        user_id: user.id,
        sponsor_id: formData.get("sponsor_id") as string,
        episode_id: episodeId || null,
        type: (formData.get("type") as string) || "mid-roll",
        rate: rateRaw ? parseFloat(rateRaw) : null,
        currency: (formData.get("currency") as string) || "USD",
        status: (formData.get("status") as string) || "confirmed",
        notes: (formData.get("notes") as string).trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sponsorships"] });
      setDealOpen(false);
      toast.success("Acuerdo registrado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = sponsors.filter(
    (s) =>
      !search ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.contact?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="page-container animate-fade-in">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Patrocinadores"
          subtitle="Gestiona sponsors, acuerdos comerciales y revenue del podcast"
        />
        <div className="flex gap-2">
          {sponsors.length > 0 && (
            <Dialog open={dealOpen} onOpenChange={setDealOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Handshake className="h-4 w-4 mr-2" />
                  Nuevo acuerdo
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Registrar acuerdo</DialogTitle>
                </DialogHeader>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    createDeal.mutate(new FormData(e.currentTarget));
                  }}
                  className="space-y-4"
                >
                  <div>
                    <Label>Patrocinador *</Label>
                    <Select name="sponsor_id" required>
                      <SelectTrigger><SelectValue placeholder="Seleccionar…" /></SelectTrigger>
                      <SelectContent>
                        {sponsors.map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Episodio</Label>
                    <Select name="episode_id">
                      <SelectTrigger><SelectValue placeholder="Sin episodio específico" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Sin episodio específico</SelectItem>
                        {episodes.map((ep) => (
                          <SelectItem key={ep.id} value={ep.id}>
                            {ep.number ? `EP.${ep.number} — ` : ""}{ep.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Tipo de lectura</Label>
                      <Select name="type" defaultValue="mid-roll">
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pre-roll">Pre-roll</SelectItem>
                          <SelectItem value="mid-roll">Mid-roll</SelectItem>
                          <SelectItem value="post-roll">Post-roll</SelectItem>
                          <SelectItem value="host-read">Host read</SelectItem>
                          <SelectItem value="segment">Segmento</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Estado</Label>
                      <Select name="status" defaultValue="confirmed">
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="prospect">Prospecto</SelectItem>
                          <SelectItem value="confirmed">Confirmado</SelectItem>
                          <SelectItem value="recorded">Grabado</SelectItem>
                          <SelectItem value="published">Publicado</SelectItem>
                          <SelectItem value="paid">Pagado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Tarifa</Label>
                      <Input name="rate" type="number" min={0} step="0.01" placeholder="0.00" />
                    </div>
                    <div>
                      <Label>Moneda</Label>
                      <Select name="currency" defaultValue="USD">
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="MXN">MXN</SelectItem>
                          <SelectItem value="EUR">EUR</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label>Notas</Label>
                    <Textarea name="notes" rows={2} placeholder="Requisitos del ad, copy, etc." />
                  </div>
                  <Button type="submit" className="w-full" disabled={createDeal.isPending}>
                    {createDeal.isPending ? "Guardando…" : "Registrar acuerdo"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
          <Dialog open={sponsorOpen} onOpenChange={setSponsorOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nuevo patrocinador
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nuevo patrocinador</DialogTitle>
              </DialogHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  createSponsor.mutate(new FormData(e.currentTarget));
                }}
                className="space-y-4"
              >
                <div>
                  <Label>Nombre *</Label>
                  <Input name="name" required autoFocus placeholder="Nombre de la marca o empresa" />
                </div>
                <div>
                  <Label>Sitio web</Label>
                  <Input name="website" type="url" placeholder="https://..." />
                </div>
                <div>
                  <Label>Contacto</Label>
                  <Input name="contact" placeholder="Email o nombre de contacto" />
                </div>
                <div>
                  <Label>Estado</Label>
                  <Select name="status" defaultValue="prospect">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="prospect">Prospecto</SelectItem>
                      <SelectItem value="active">Activo</SelectItem>
                      <SelectItem value="paused">Pausado</SelectItem>
                      <SelectItem value="ended">Finalizado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Notas</Label>
                  <Textarea name="notes" rows={2} placeholder="Condiciones, personas clave…" />
                </div>
                <Button type="submit" className="w-full" disabled={createSponsor.isPending}>
                  {createSponsor.isPending ? "Agregando…" : "Agregar patrocinador"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Revenue summary */}
      {sponsorships.length > 0 && <RevenueSummary sponsorships={sponsorships} />}

      <Tabs defaultValue="sponsors" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="sponsors">
            <DollarSign className="h-3.5 w-3.5 mr-1.5" />
            Patrocinadores{sponsors.length > 0 && ` (${sponsors.length})`}
          </TabsTrigger>
          <TabsTrigger value="deals">
            <Handshake className="h-3.5 w-3.5 mr-1.5" />
            Acuerdos{sponsorships.length > 0 && ` (${sponsorships.length})`}
          </TabsTrigger>
        </TabsList>

        {/* Sponsors tab */}
        <TabsContent value="sponsors">
          <div className="relative max-w-md mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar patrocinadores…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {loadingSponsors ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => <Card key={i} className="h-32 animate-pulse bg-muted" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <DollarSign className="h-12 w-12 text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">
                {search ? "Sin resultados" : "No hay patrocinadores aún"}
              </p>
              <p className="text-sm text-muted-foreground/60 mt-1">
                Agrega tu primer patrocinador para empezar a trackear el revenue
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((s) => {
                const dealCount = sponsorships.filter((d) => d.sponsor_id === s.id).length;
                return (
                  <Card
                    key={s.id}
                    className="cursor-pointer hover:border-primary/30 transition-colors"
                    onClick={() => setEditingSponsor(s)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-base">{s.name}</CardTitle>
                        <span
                          className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-medium border ${SPONSOR_STATUS_STYLES[s.status] ?? ""}`}
                        >
                          {SPONSOR_STATUS_LABELS[s.status] ?? s.status}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="text-sm space-y-1.5">
                      {s.contact && (
                        <p className="text-xs text-muted-foreground">{s.contact}</p>
                      )}
                      {s.website && (
                        <a
                          href={s.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary flex items-center gap-1 hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="h-3 w-3" />
                          {s.website.replace(/^https?:\/\//, "")}
                        </a>
                      )}
                      <p className="text-xs text-muted-foreground">
                        <Mic className="h-3 w-3 inline mr-1" />
                        {dealCount} acuerdo{dealCount !== 1 ? "s" : ""}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Deals tab */}
        <TabsContent value="deals">
          {loadingDeals ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Card key={i} className="h-20 animate-pulse bg-muted" />)}
            </div>
          ) : sponsorships.length === 0 ? (
            <div className="empty-state">
              <Handshake className="h-12 w-12 text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">No hay acuerdos registrados</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sponsorships.map((deal) => (
                <Card key={deal.id}>
                  <CardContent className="flex items-center justify-between py-3 gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {deal.sponsors?.name ?? "—"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {deal.type} · {deal.episodes ? `EP.${deal.episodes.number ?? "?"} — ${deal.episodes.title}` : "Sin episodio"}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {deal.rate != null && (
                        <p className="text-sm font-semibold">
                          {deal.currency} {deal.rate.toLocaleString()}
                        </p>
                      )}
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-medium border ${DEAL_STATUS_STYLES[deal.status] ?? ""}`}
                      >
                        {DEAL_STATUS_LABELS[deal.status] ?? deal.status}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <SponsorSheet sponsor={editingSponsor} onClose={() => setEditingSponsor(null)} />
    </div>
  );
}
