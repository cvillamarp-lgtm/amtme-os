import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart3, Plus, TrendingUp, TrendingDown } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { Tables } from "@/integrations/supabase/types";

export default function MetricsPage() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: metrics = [], isLoading } = useQuery({
    queryKey: ["metrics"],
    queryFn: async () => {
      const { data, error } = await supabase.from("metrics").select("*").order("date", { ascending: true });
      if (error) throw error;
      return data as Tables<"metrics">[];
    },
  });

  const addMetric = useMutation({
    mutationFn: async (formData: FormData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");
      const m = {
        user_id: user.id,
        name: formData.get("name") as string,
        value: parseFloat(formData.get("value") as string),
        source: formData.get("source") as string || null,
        unit: formData.get("unit") as string || null,
        date: formData.get("date") as string || new Date().toISOString().split("T")[0],
      };
      const { error } = await supabase.from("metrics").insert(m);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["metrics"] });
      setOpen(false);
      toast.success("Métrica registrada");
    },
    onError: (e) => toast.error(e.message),
  });

  // Group metrics by name for summary cards
  const grouped = metrics.reduce<Record<string, Tables<"metrics">[]>>((acc, m) => {
    const key = m.name || "Sin nombre";
    if (!acc[key]) acc[key] = [];
    acc[key].push(m);
    return acc;
  }, {});

  const summaryCards = Object.entries(grouped).map(([name, items]) => {
    const sorted = [...items].sort((a, b) => (a.date || "").localeCompare(b.date || ""));
    const latest = sorted[sorted.length - 1];
    const prev = sorted.length > 1 ? sorted[sorted.length - 2] : null;
    const change = prev && prev.value && latest.value ? ((latest.value - prev.value) / prev.value * 100) : 0;
    return { name, value: latest.value, unit: latest.unit, change, source: latest.source, data: sorted };
  });

  // Chart data: downloads over time
  const downloadsData = (grouped["Descargas"] || grouped["descargas"] || metrics.filter((m) => m.name?.toLowerCase().includes("descarga")))
    ?.map((m) => ({ date: m.date, value: m.value })) || [];

  return (
    <div className="page-container animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Métricas</h1>
          <p className="page-subtitle">Analítica de tu podcast</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Registrar métrica</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nueva métrica</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); addMetric.mutate(new FormData(e.currentTarget)); }} className="space-y-4">
              <div><Label>Nombre *</Label>
                <Select name="name">
                  <SelectTrigger><SelectValue placeholder="Seleccionar o escribir" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Descargas">Descargas</SelectItem>
                    <SelectItem value="Oyentes únicos">Oyentes únicos</SelectItem>
                    <SelectItem value="Seguidores">Seguidores</SelectItem>
                    <SelectItem value="Reproducciones">Reproducciones</SelectItem>
                    <SelectItem value="Calificación">Calificación</SelectItem>
                    <SelectItem value="Suscriptores">Suscriptores</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Valor *</Label><Input name="value" type="number" step="any" required /></div>
              <div><Label>Unidad</Label><Input name="unit" placeholder="descargas, %, estrellas..." /></div>
              <div><Label>Fuente</Label>
                <Select name="source">
                  <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="spotify">Spotify</SelectItem>
                    <SelectItem value="apple">Apple Podcasts</SelectItem>
                    <SelectItem value="youtube">YouTube</SelectItem>
                    <SelectItem value="instagram">Instagram</SelectItem>
                    <SelectItem value="manual">Manual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Fecha</Label><Input name="date" type="date" defaultValue={new Date().toISOString().split("T")[0]} /></div>
              <Button type="submit" className="w-full" disabled={addMetric.isPending}>Guardar</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Card key={i} className="h-28 animate-pulse bg-muted" />)}
        </div>
      ) : metrics.length === 0 ? (
        <div className="empty-state">
          <BarChart3 className="h-12 w-12 text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground">Registra tu primera métrica para ver las gráficas</p>
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {summaryCards.map((card) => (
              <Card key={card.name} className="stat-card">
                <CardContent className="p-5">
                  <p className="text-xs text-muted-foreground mb-1">{card.name}</p>
                  <div className="flex items-end gap-2">
                    <p className="text-2xl font-bold font-display text-foreground">
                      {typeof card.value === "number" ? card.value.toLocaleString() : card.value}
                    </p>
                    {card.unit && <span className="text-xs text-muted-foreground mb-1">{card.unit}</span>}
                  </div>
                  {card.change !== 0 && (
                    <div className={`flex items-center gap-1 mt-1 text-xs ${card.change > 0 ? "text-[hsl(var(--chart-2))]" : "text-destructive"}`}>
                      {card.change > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {Math.abs(card.change).toFixed(1)}%
                    </div>
                  )}
                  {card.source && <p className="text-[10px] text-muted-foreground/60 mt-1 capitalize">{card.source}</p>}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Charts */}
          {downloadsData.length > 1 && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Tendencia</CardTitle></CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={downloadsData}>
                      <defs>
                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                      <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", color: "hsl(var(--foreground))" }} />
                      <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" fill="url(#colorValue)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* All metrics table */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Historial</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-muted-foreground border-b border-border">
                    <tr>
                      <th className="text-left py-2 px-3 font-medium">Métrica</th>
                      <th className="text-left py-2 px-3 font-medium">Valor</th>
                      <th className="text-left py-2 px-3 font-medium">Fuente</th>
                      <th className="text-left py-2 px-3 font-medium">Fecha</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {[...metrics].reverse().slice(0, 20).map((m) => (
                      <tr key={m.id} className="surface-hover">
                        <td className="py-2 px-3 text-foreground">{m.name}</td>
                        <td className="py-2 px-3 text-foreground">{m.value} {m.unit || ""}</td>
                        <td className="py-2 px-3 text-muted-foreground capitalize">{m.source || "—"}</td>
                        <td className="py-2 px-3 text-muted-foreground">{m.date || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
