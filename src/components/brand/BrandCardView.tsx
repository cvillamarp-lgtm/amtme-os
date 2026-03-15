import { useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Check, Pencil, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BrandCard } from "@/lib/brand-system-data";

interface BrandCardViewProps {
  card: BrandCard;
  cardIndex: number;
  onSave: (cardIndex: number, field: "title" | "body" | "eyebrow", value: string) => void;
}

export function BrandCardView({ card, cardIndex, onSave }: BrandCardViewProps) {
  const [editing, setEditing] = useState<{ field: "title" | "body" | "eyebrow"; value: string } | null>(null);

  const handleSave = useCallback(() => {
    if (!editing) return;
    onSave(cardIndex, editing.field, editing.value);
    setEditing(null);
  }, [editing, cardIndex, onSave]);

  const textColor = card.accent ? "text-primary-foreground" : card.dark ? "text-primary-foreground" : "text-foreground";
  const mutedColor = card.accent ? "text-primary-foreground/80" : card.dark ? "text-primary-foreground/70" : "text-muted-foreground";
  const eyebrowColor = card.accent ? "text-primary-foreground/60" : card.dark ? "text-primary/80" : "text-primary/60";

  return (
    <Card
      className={cn(
        "group relative transition-all",
        card.accent && "bg-primary border-primary",
        card.dark && "bg-[hsl(var(--sidebar-background))] border-[hsl(var(--sidebar-background))]"
      )}
    >
      <CardContent className="pt-5 pb-4 px-5">
        {/* Eyebrow */}
        {editing?.field === "eyebrow" ? (
          <div className="flex items-center gap-1 mb-1">
            <Input
              value={editing.value}
              onChange={e => setEditing({ ...editing, value: e.target.value })}
              className="h-6 text-[9px] px-1"
              autoFocus
              onKeyDown={e => e.key === "Enter" && handleSave()}
            />
            <Button size="icon" variant="ghost" className="h-5 w-5" onClick={handleSave}><Check className="w-3 h-3" /></Button>
            <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => setEditing(null)}><X className="w-3 h-3" /></Button>
          </div>
        ) : (
          <p
            className={cn("text-[9px] font-extrabold tracking-[.2em] uppercase mb-1.5 cursor-pointer hover:underline", eyebrowColor)}
            onClick={() => setEditing({ field: "eyebrow", value: card.eyebrow })}
          >
            {card.eyebrow}
          </p>
        )}

        {/* Title */}
        {editing?.field === "title" ? (
          <div className="flex items-center gap-1 mb-2">
            <Input
              value={editing.value}
              onChange={e => setEditing({ ...editing, value: e.target.value })}
              className="h-7 text-sm font-bold px-1"
              autoFocus
              onKeyDown={e => e.key === "Enter" && handleSave()}
            />
            <Button size="icon" variant="ghost" className="h-5 w-5" onClick={handleSave}><Check className="w-3 h-3" /></Button>
            <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => setEditing(null)}><X className="w-3 h-3" /></Button>
          </div>
        ) : (
          <p
            className={cn("text-sm font-extrabold mb-2 cursor-pointer hover:underline", textColor)}
            onClick={() => setEditing({ field: "title", value: card.title })}
          >
            {card.title}
          </p>
        )}

        {/* Body */}
        {editing?.field === "body" ? (
          <div className="space-y-1">
            <Textarea
              value={editing.value}
              onChange={e => setEditing({ ...editing, value: e.target.value })}
              className="text-xs min-h-[60px]"
              autoFocus
            />
            <div className="flex gap-1">
              <Button size="sm" variant="secondary" className="h-6 text-[10px]" onClick={handleSave}><Check className="w-3 h-3 mr-1" />Guardar</Button>
              <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => setEditing(null)}><X className="w-3 h-3 mr-1" />Cancelar</Button>
            </div>
          </div>
        ) : (
          <p
            className={cn("text-xs leading-relaxed cursor-pointer hover:bg-foreground/5 rounded p-1 -m-1 transition-colors", mutedColor)}
            onClick={() => setEditing({ field: "body", value: card.body })}
          >
            {card.body}
          </p>
        )}

        {/* Edit hint */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Pencil className={cn("w-3 h-3", card.accent || card.dark ? "text-primary-foreground/40" : "text-muted-foreground/40")} />
        </div>
      </CardContent>
    </Card>
  );
}
