import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check } from "lucide-react";

interface BrandTableViewProps {
  headers: string[];
  rows: string[][];
  onSave: (rowIndex: number, colIndex: number, value: string) => void;
}

export function BrandTableView({ headers, rows, onSave }: BrandTableViewProps) {
  const [editing, setEditing] = useState<{ row: number; col: number; value: string } | null>(null);

  const handleSave = useCallback(() => {
    if (!editing) return;
    onSave(editing.row, editing.col, editing.value);
    setEditing(null);
  }, [editing, onSave]);

  return (
    <div className="rounded-lg border border-border overflow-hidden mb-6">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-[hsl(var(--sidebar-background))]">
            {headers.map((h, i) => (
              <th key={i} className="px-3 py-2 text-left text-[10px] font-bold tracking-wider text-primary-foreground uppercase">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className={ri % 2 === 1 ? "bg-muted/30" : ""}>
              {row.map((cell, ci) => (
                <td key={ci} className="px-3 py-2 border-b border-border">
                  {editing?.row === ri && editing?.col === ci ? (
                    <div className="flex items-center gap-1">
                      <Input
                        value={editing.value}
                        onChange={e => setEditing({ ...editing, value: e.target.value })}
                        className="h-6 text-xs px-1"
                        autoFocus
                        onKeyDown={e => {
                          if (e.key === "Enter") handleSave();
                          if (e.key === "Escape") setEditing(null);
                        }}
                      />
                      <Button size="icon" variant="ghost" className="h-5 w-5" onClick={handleSave}>
                        <Check className="w-3 h-3" />
                      </Button>
                    </div>
                  ) : (
                    <span
                      className="cursor-pointer hover:underline"
                      onClick={() => setEditing({ row: ri, col: ci, value: cell })}
                    >
                      {cell}
                    </span>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
