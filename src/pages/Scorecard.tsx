import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { EmptyState } from "@/components/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Settings, CheckCircle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ScoreData {
  episodes: number;
  templates: number;
  audience: number;
  guests: number;
  metrics: number;
  mentions: number;
  resources: number;
  tasks: number;
  brandAssets: number;
}

interface ScoreItem {
  label: string;
  check: (data: ScoreData) => boolean;
  category: string;
}

const SCORE_ITEMS: ScoreItem[] = [
  { label: "Al menos 1 episodio creado", check: (d) => d.episodes > 0, category: "Contenido" },
  { label: "Al menos 5 episodios", check: (d) => d.episodes >= 5, category: "Contenido" },
  { label: "Templates creados", check: (d) => d.templates > 0, category: "Contenido" },
  { label: "Audiencia definida", check: (d) => d.audience > 0, category: "Estrategia" },
  { label: "Invitados registrados", check: (d) => d.guests > 0, category: "Estrategia" },
  { label: "Métricas registradas", check: (d) => d.metrics > 0, category: "Analítica" },
  { label: "Menciones rastreadas", check: (d) => d.mentions > 0, category: "Analítica" },
  { label: "Recursos documentados", check: (d) => d.resources > 0, category: "Operaciones" },
  { label: "Tareas activas", check: (d) => d.tasks > 0, category: "Operaciones" },
  { label: "Brand System configurado", check: (d) => d.brandAssets > 0, category: "Marca" },
];

export default function Scorecard() {
  const { data, isLoading } = useQuery({
    queryKey: ["scorecard-data"],
    queryFn: async () => {
      const [episodes, templates, audience, guests, metrics, mentions, resources, tasks, brandAssets] = await Promise.all([
        supabase.from("episodes").select("*", { count: "exact", head: true }),
        supabase.from("episode_templates").select("*", { count: "exact", head: true }),
        supabase.from("audience_members").select("*", { count: "exact", head: true }),
        supabase.from("guests").select("*", { count: "exact", head: true }),
        supabase.from("metrics").select("*", { count: "exact", head: true }),
        supabase.from("mentions").select("*", { count: "exact", head: true }),
        supabase.from("resources").select("*", { count: "exact", head: true }),
        supabase.from("tasks").select("*", { count: "exact", head: true }),
        supabase.from("brand_assets").select("*", { count: "exact", head: true }),
      ]);
      return {
        episodes: episodes.count || 0,
        templates: templates.count || 0,
        audience: audience.count || 0,
        guests: guests.count || 0,
        metrics: metrics.count || 0,
        mentions: mentions.count || 0,
        resources: resources.count || 0,
        tasks: tasks.count || 0,
        brandAssets: brandAssets.count || 0,
      };
    },
  });

  const score = data ? SCORE_ITEMS.filter(item => item.check(data)).length : 0;
  const total = SCORE_ITEMS.length;
  const percentage = Math.round((score / total) * 100);

  const categories = [...new Set(SCORE_ITEMS.map(i => i.category))];

  return (
    <div className="page-container animate-fade-in">
      <PageHeader title="Scorecard" subtitle="Evaluación del estado de tu podcast" />

      {isLoading ? (
        <LoadingSkeleton count={3} variant="card" />
      ) : !data ? (
        <EmptyState icon={Settings} message="No se pudieron cargar los datos" />
      ) : (
        <>
          {/* Score summary */}
          <Card>
            <CardContent className="p-6 flex items-center gap-6">
              <div className="relative w-20 h-20">
                <svg className="w-20 h-20 -rotate-90" viewBox="0 0 36 36">
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="hsl(var(--secondary))"
                    strokeWidth="3"
                  />
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="hsl(var(--primary))"
                    strokeWidth="3"
                    strokeDasharray={`${percentage}, 100`}
                    strokeLinecap="round"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-lg font-display font-bold text-foreground">
                  {percentage}%
                </span>
              </div>
              <div>
                <h2 className="text-xl font-display font-bold text-foreground">{score}/{total} criterios cumplidos</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {percentage >= 80 ? "¡Excelente! Tu podcast está muy bien configurado." :
                   percentage >= 50 ? "Buen avance. Hay áreas por completar." :
                   "Estás empezando. Completa más secciones para mejorar tu score."}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Score items by category */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {categories.map(cat => (
              <Card key={cat}>
                <CardContent className="p-5">
                  <h3 className="text-sm font-semibold text-foreground mb-3">{cat}</h3>
                  <div className="space-y-2">
                    {SCORE_ITEMS.filter(i => i.category === cat).map(item => {
                      const passed = item.check(data);
                      return (
                        <div key={item.label} className="flex items-center gap-2 text-sm">
                          {passed ? (
                            <CheckCircle className="w-4 h-4 text-[hsl(var(--chart-2))] shrink-0" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-muted-foreground/40 shrink-0" />
                          )}
                          <span className={cn(passed ? "text-foreground" : "text-muted-foreground")}>{item.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
