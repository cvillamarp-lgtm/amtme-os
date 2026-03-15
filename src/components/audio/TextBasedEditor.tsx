import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Segment {
  id: string;
  start_seconds: number;
  end_seconds: number;
  text: string;
  is_hook: boolean;
  is_quote: boolean;
  is_clip_candidate: boolean;
  emotional_score: number | null;
  clarity_score: number | null;
  reuse_score: number | null;
}

interface Selection {
  id: string;
  transcript_segment_id: string;
  action_type: "keep" | "remove" | "clip" | "quote";
}

function formatSeconds(seconds: number) {
  const total = Math.floor(seconds);
  const minutes = Math.floor(total / 60);
  const secs = String(total % 60).padStart(2, "0");
  return `${minutes}:${secs}`;
}

export function TextBasedEditor({
  segments,
  selections,
  onSeek,
  onMarkRemove,
  onMarkClip,
  onMarkQuote,
}: {
  segments: Segment[];
  selections: Selection[];
  onSeek?: (seconds: number) => void;
  onMarkRemove: (segment: Segment) => void;
  onMarkClip: (segment: Segment) => void;
  onMarkQuote: (segment: Segment) => void;
}) {
  const selectionMap = useMemo(() => {
    const map = new Map<string, string[]>();
    selections.forEach((selection) => {
      const current = map.get(selection.transcript_segment_id) || [];
      current.push(selection.action_type);
      map.set(selection.transcript_segment_id, current);
    });
    return map;
  }, [selections]);

  if (!segments.length) {
    return <div className="text-sm text-muted-foreground">No hay segmentos disponibles.</div>;
  }

  return (
    <div className="space-y-3">
      {segments.map((segment) => {
        const actions = selectionMap.get(segment.id) || [];
        const removed = actions.includes("remove");
        const clipped = actions.includes("clip");
        const quoted = actions.includes("quote");

        return (
          <div
            key={segment.id}
            className={`rounded-lg border p-3 space-y-3 ${
              removed ? "border-destructive/40 bg-destructive/5" : "border-border"
            }`}
          >
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => onSeek?.(Number(segment.start_seconds))}>
                {formatSeconds(Number(segment.start_seconds))}
              </Button>

              {segment.is_hook && <Badge>Hook</Badge>}
              {segment.is_quote && <Badge variant="secondary">Quote</Badge>}
              {segment.is_clip_candidate && <Badge variant="secondary">Clip</Badge>}
              {removed && <Badge variant="destructive">Eliminar</Badge>}
              {clipped && <Badge variant="secondary">Exportar clip</Badge>}
              {quoted && <Badge variant="secondary">Quote candidate</Badge>}
            </div>

            <p className="text-sm text-foreground whitespace-pre-wrap">{segment.text}</p>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => onMarkRemove(segment)}>
                Marcar eliminación
              </Button>
              <Button variant="outline" size="sm" onClick={() => onMarkClip(segment)}>
                Marcar clip
              </Button>
              <Button variant="outline" size="sm" onClick={() => onMarkQuote(segment)}>
                Crear quote
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
