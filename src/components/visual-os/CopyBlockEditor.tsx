/**
 * CopyBlockEditor
 * ───────────────
 * Editable copy fields for a piece. Each block maps to a row in piece_copy_blocks.
 * Required blocks are marked. Fixed blocks are read-only.
 */
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { CopyBlock } from "@/lib/visual-os/types";
import type { TemplateCopyBlockDef } from "@/lib/visual-os/types";

interface CopyBlockEditorProps {
  blocks:     CopyBlock[];
  blockDefs:  TemplateCopyBlockDef[];
  onChange:   (blockId: string, value: string) => void;
  readOnly?:  boolean;
  className?: string;
}

export function CopyBlockEditor({
  blocks,
  blockDefs,
  onChange,
  readOnly = false,
  className,
}: CopyBlockEditorProps) {
  // Merge defs with actual block values, sorted by order
  const merged = blockDefs.map(def => {
    const block = blocks.find(b => b.block_name === def.rule_key);
    return { def, block };
  });

  return (
    <div className={cn("space-y-3", className)}>
      {merged.map(({ def, block }) => {
        if (!block) return null;
        const isFixed      = block.is_fixed;
        const isRequired   = def.is_required;
        const isEmpty      = !block.block_value.trim();
        const isPlaceholder= /^\[.+\]$/.test(block.block_value.trim());
        const hasIssue     = isRequired && (isEmpty || isPlaceholder);

        return (
          <div key={def.rule_key} className="space-y-1">
            <div className="flex items-center gap-1.5">
              <Label className="text-xs text-muted-foreground">{def.label}</Label>
              {isRequired && (
                <span className="text-[10px] text-amber-500 font-medium">*obligatorio</span>
              )}
              {isFixed && (
                <Badge variant="outline" className="text-[9px] h-4 px-1">fijo</Badge>
              )}
            </div>
            <Input
              value={block.block_value}
              onChange={e => !isFixed && !readOnly && onChange(block.id, e.target.value)}
              readOnly={isFixed || readOnly}
              placeholder={def.default_value}
              maxLength={def.max_chars}
              className={cn(
                "h-8 text-xs font-mono",
                isFixed && "opacity-50 cursor-default bg-muted",
                hasIssue && "border-amber-500/50 focus-visible:ring-amber-500/30",
                readOnly && "cursor-default",
              )}
            />
            <div className="flex justify-between text-[10px] text-muted-foreground/60">
              {hasIssue && (
                <span className="text-amber-500">
                  {isEmpty ? "Campo vacío" : "Reemplaza el placeholder"}
                </span>
              )}
              <span className="ml-auto">{block.block_value.length}/{def.max_chars}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
