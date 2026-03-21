import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, ChevronLeft, ChevronRight, Mic } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, isToday } from "date-fns";
import { es } from "date-fns/locale";

export default function EditorialCalendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const { data: episodes = [] } = useQuery({
    queryKey: ["episodes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("episodes").select("*").order("release_date", { ascending: true });
      if (error) throw error;
      return data as Tables<"episodes">[];
    },
  });

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDay = getDay(monthStart); // 0=Sun

  const episodesByDate = useMemo(() => {
    const map: Record<string, Tables<"episodes">[]> = {};
    episodes.forEach((ep) => {
      if (ep.release_date) {
        const key = ep.release_date.split("T")[0];
        if (!map[key]) map[key] = [];
        map[key].push(ep);
      }
    });
    return map;
  }, [episodes]);

  const statusDot = (status: string | null) => {
    switch (status) {
      case "published": return "bg-[hsl(var(--chart-2))]";
      case "recording": return "bg-[hsl(var(--chart-1))]";
      case "editing": return "bg-[hsl(var(--chart-3))]";
      default: return "bg-muted-foreground";
    }
  };

  const weekDays = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

  return (
    <div className="page-container animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Calendario Editorial</h1>
          <p className="page-subtitle">Planifica tu contenido visualmente</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium text-foreground min-w-[140px] text-center capitalize">
            {format(currentMonth, "MMMM yyyy", { locale: es })}
          </span>
          <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-muted-foreground" /> Borrador</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[hsl(var(--chart-1))]" /> Grabando</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[hsl(var(--chart-3))]" /> Editando</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[hsl(var(--chart-2))]" /> Publicado</span>
      </div>

      <Card>
        <CardContent className="p-0">
          {/* Week header */}
          <div className="grid grid-cols-7 border-b border-border">
            {weekDays.map((d) => (
              <div key={d} className="text-center text-xs font-medium text-muted-foreground py-3">{d}</div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7">
            {/* Empty cells for offset */}
            {Array.from({ length: startDay }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-[100px] border-b border-r border-border bg-secondary/20" />
            ))}
            {days.map((day) => {
              const key = format(day, "yyyy-MM-dd");
              const dayEpisodes = episodesByDate[key] || [];
              const today = isToday(day);
              return (
                <div
                  key={key}
                  className={`min-h-[100px] border-b border-r border-border p-2 transition-colors hover:bg-secondary/30 ${today ? "bg-primary/5" : ""}`}
                >
                  <span className={`text-xs font-medium ${today ? "text-primary bg-primary/20 rounded-full w-6 h-6 flex items-center justify-center" : "text-muted-foreground"}`}>
                    {format(day, "d")}
                  </span>
                  <div className="mt-1 space-y-1">
                    {dayEpisodes.map((ep) => (
                      <div
                        key={ep.id}
                        className="flex items-center gap-1.5 bg-secondary/60 rounded px-1.5 py-1 cursor-default"
                        title={ep.title}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${statusDot(ep.status)}`} />
                        <span className="text-[10px] text-foreground truncate">{ep.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Upcoming */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Próximos lanzamientos</CardTitle></CardHeader>
        <CardContent>
          {episodes.filter((ep) => ep.release_date && ep.release_date >= format(new Date(), "yyyy-MM-dd")).length === 0 ? (
            <div className="text-center py-6">
              <Calendar className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No hay episodios programados</p>
            </div>
          ) : (
            <div className="space-y-2">
              {episodes
                .filter((ep) => ep.release_date && ep.release_date >= format(new Date(), "yyyy-MM-dd"))
                .slice(0, 5)
                .map((ep) => (
                  <div key={ep.id} className="flex items-center gap-3 py-2 px-3 rounded-lg surface-hover">
                    <Mic className="w-4 h-4 text-primary flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{ep.title}</p>
                      <p className="text-xs text-muted-foreground">{ep.release_date}</p>
                    </div>
                    <span className={`w-2 h-2 rounded-full ${statusDot(ep.status)}`} />
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
