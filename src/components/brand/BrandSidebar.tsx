import { cn } from "@/lib/utils";
import type { BrandSection } from "@/lib/brand-system-data";

interface BrandSidebarProps {
  sections: BrandSection[];
  activeSection: string;
  onSelect: (id: string) => void;
}

const GROUPS = [
  { label: "Identidad", range: [0, 8] as const },
  { label: "Estrategia", range: [8, 10] as const },
  { label: "Marketing Digital", range: [10, Infinity] as const },
];

export function BrandSidebar({ sections, activeSection, onSelect }: BrandSidebarProps) {
  return (
    <aside className="w-60 shrink-0 border-r border-border bg-card/50 overflow-y-auto">
      <div className="p-4 border-b border-border">
        <p className="text-[10px] font-extrabold tracking-[.3em] uppercase text-muted-foreground">Brand System</p>
        <p className="text-sm font-black mt-1">
          A mi tampoco<br />
          <span className="text-primary">me explicaron</span>
        </p>
      </div>
      <div className="py-2">
        {GROUPS.map(({ label, range }) => (
          <div key={label}>
            <p className="px-4 py-2 mt-2 first:mt-0 text-[9px] font-bold tracking-[.2em] uppercase text-muted-foreground/60">
              {label}
            </p>
            {sections.slice(range[0], range[1]).map(s => (
              <button
                key={s.id}
                onClick={() => onSelect(s.id)}
                className={cn(
                  "w-full flex items-center gap-2 px-4 py-2 text-xs font-medium transition-colors text-left border-l-2",
                  activeSection === s.id
                    ? "border-l-primary bg-primary/5 text-foreground"
                    : "border-l-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                <span className="text-[9px] font-extrabold text-primary min-w-[24px]">{s.number}</span>
                {s.eyebrow}
              </button>
            ))}
          </div>
        ))}
      </div>
    </aside>
  );
}
