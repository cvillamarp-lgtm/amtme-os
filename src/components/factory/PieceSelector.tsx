import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { VisualPiece } from "@/lib/visual-templates";

interface PieceSelectorProps {
  pieces: VisualPiece[];
  selected: Set<number>;
  onToggle: (id: number) => void;
  onSelectAll: () => void;
  onSelectNone: () => void;
}

export function PieceSelector({ pieces, selected, onToggle, onSelectAll, onSelectNone }: PieceSelectorProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Seleccionar piezas a producir</p>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onSelectAll}>
            Todas
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onSelectNone}>
            Ninguna
          </Button>
          <Badge variant="secondary">{selected.size}/{pieces.length}</Badge>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
        {pieces.map((piece) => (
          <label
            key={piece.id}
            className="flex items-center gap-2 rounded-md border border-border px-3 py-2 cursor-pointer hover:bg-secondary/50 transition-colors"
          >
            <Checkbox
              checked={selected.has(piece.id)}
              onCheckedChange={() => onToggle(piece.id)}
            />
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-medium truncate">{piece.shortName}</span>
              <span className="text-[10px] text-muted-foreground">{piece.format}</span>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}
