import { useState, useCallback } from "react";
import { brandSections, type BrandSection } from "@/lib/brand-system-data";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { BrandSidebar } from "@/components/brand/BrandSidebar";
import { BrandCardView } from "@/components/brand/BrandCardView";
import { BrandTableView } from "@/components/brand/BrandTableView";

export default function BrandStudio() {
  const [activeSection, setActiveSection] = useState(brandSections[0].id);
  const [activeOptions, setActiveOptions] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    brandSections.forEach(s => { init[s.id] = s.options[0].id; });
    return init;
  });
  const [sections, setSections] = useState<BrandSection[]>(brandSections);
  const queryClient = useQueryClient();

  // Load saved overrides
  useQuery({
    queryKey: ["brand_system_overrides"],
    queryFn: async () => {
      const { data, error } = await supabase.from("brand_assets").select("*").eq("type", "brand_system_override");
      if (error) throw error;
      return data;
    },
  });

  const saveOverride = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");
      const { data: existing } = await supabase.from("brand_assets")
        .select("id").eq("type", "brand_system_override").eq("label", key).maybeSingle();
      if (existing) {
        const { error } = await supabase.from("brand_assets").update({ value }).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("brand_assets").insert({ user_id: user.id, type: "brand_system_override", label: key, value });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brand_system_overrides"] });
      toast.success("Cambio guardado");
    },
    onError: (e) => toast.error(e.message),
  });

  const currentSection = sections.find(s => s.id === activeSection)!;
  const currentOptionId = activeOptions[activeSection];
  const currentOption = currentSection.options.find(o => o.id === currentOptionId)!;

  const handleCardSave = useCallback((cardIndex: number, field: "title" | "body" | "eyebrow", value: string) => {
    setSections(prev => prev.map(s => {
      if (s.id !== activeSection) return s;
      return {
        ...s,
        options: s.options.map(o => {
          if (o.id !== currentOptionId) return o;
          return { ...o, cards: o.cards.map((c, i) => i === cardIndex ? { ...c, [field]: value } : c) };
        }),
      };
    }));
    saveOverride.mutate({ key: `${activeSection}.${currentOptionId}.${cardIndex}.${field}`, value });
  }, [activeSection, currentOptionId, saveOverride]);

  const handleTableSave = useCallback((rowIndex: number, colIndex: number, value: string) => {
    setSections(prev => prev.map(s => {
      if (s.id !== activeSection) return s;
      return {
        ...s,
        options: s.options.map(o => {
          if (o.id !== currentOptionId || !o.table) return o;
          const newRows = o.table.rows.map((row, ri) =>
            ri === rowIndex ? row.map((cell, ci) => ci === colIndex ? value : cell) : row
          );
          return { ...o, table: { ...o.table, rows: newRows } };
        }),
      };
    }));
    saveOverride.mutate({ key: `${activeSection}.${currentOptionId}.table.${rowIndex}.${colIndex}`, value });
  }, [activeSection, currentOptionId, saveOverride]);

  return (
    <div className="flex h-[calc(100vh-4rem)] animate-fade-in">
      <BrandSidebar
        sections={sections}
        activeSection={activeSection}
        onSelect={setActiveSection}
      />

      <div className="flex-1 overflow-y-auto">
        {/* Top Bar */}
        <div className="sticky top-0 z-10 bg-primary px-6 py-3 flex items-center gap-3">
          <span className="text-primary-foreground text-xs font-bold tracking-[.2em] uppercase">
            AMTME <span className="text-primary-foreground/70">Brand System</span>
          </span>
          <span className="bg-primary-foreground/15 text-primary-foreground text-[10px] font-bold px-2.5 py-0.5 rounded-full tracking-wider">
            {sections.length} Secciones · 3 Variantes
          </span>
        </div>

        <div className="p-6 max-w-5xl">
          {/* Section Header */}
          <div className="mb-6">
            <p className="text-[10px] font-extrabold tracking-[.3em] text-primary uppercase">{currentSection.number} — {currentSection.eyebrow}</p>
            <h1 className="text-2xl font-black text-foreground mt-1">{currentSection.title}</h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-xl">{currentSection.description}</p>
          </div>

          {/* Option Tabs */}
          <div className="flex flex-wrap gap-2 mb-6">
            {currentSection.options.map(opt => (
              <button
                key={opt.id}
                onClick={() => setActiveOptions(prev => ({ ...prev, [activeSection]: opt.id }))}
                className={cn(
                  "px-4 py-1.5 rounded-full text-xs font-bold border-2 transition-all",
                  currentOptionId === opt.id
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-transparent text-primary border-primary hover:bg-primary/5"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {currentOption.cards.map((card, cardIdx) => (
              <BrandCardView
                key={cardIdx}
                card={card}
                cardIndex={cardIdx}
                onSave={handleCardSave}
              />
            ))}
          </div>

          {/* Table */}
          {currentOption.table && (
            <BrandTableView
              headers={currentOption.table.headers}
              rows={currentOption.table.rows}
              onSave={handleTableSave}
            />
          )}
        </div>
      </div>
    </div>
  );
}
