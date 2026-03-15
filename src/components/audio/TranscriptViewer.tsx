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

function formatSeconds(seconds: number) {
  const total = Math.floor(seconds);
  const minutes = Math.floor(total / 60);
  const secs = String(total % 60).padStart(2, "0");
  return `${minutes}:${secs}`;
}

export function TranscriptViewer({
  segments,
  onSeek,
}: {
  segments: Segment[];
  onSeek?: (seconds: number) => void;
}) {
  if (!segments.length) {
    return <div className="text-sm text-muted-foreground">No hay segmentos aún.</div>;
  }

  return (
    <div className="space-y-3">
      {segments.map((segment) => (
        <div key={segment.id} className="rounded-lg border border-border p-3 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSeek?.(Number(segment.start_seconds))}
            >
              {formatSeconds(Number(segment.start_seconds))}
            </Button>

            {segment.is_hook && <Badge>Hook</Badge>}
            {segment.is_quote && <Badge variant="secondary">Quote</Badge>}
            {segment.is_clip_candidate && <Badge variant="secondary">Clip</Badge>}
          </div>

          <p className="text-sm text-foreground whitespace-pre-wrap">{segment.text}</p>

          <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
            <span>Emoción: {segment.emotional_score ?? "—"}</span>
            <span>Claridad: {segment.clarity_score ?? "—"}</span>
            <span>Reuse: {segment.reuse_score ?? "—"}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
