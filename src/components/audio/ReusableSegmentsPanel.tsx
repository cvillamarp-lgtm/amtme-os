import { Badge } from "@/components/ui/badge";

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

export function ReusableSegmentsPanel({ segments }: { segments: Segment[] }) {
  const filtered = [...segments]
    .filter((segment) => segment.is_hook || segment.is_quote || segment.is_clip_candidate)
    .sort((a, b) => Number(b.reuse_score ?? 0) - Number(a.reuse_score ?? 0))
    .slice(0, 12);

  if (!filtered.length) {
    return <div className="text-sm text-muted-foreground">Aún no hay fragmentos reutilizables detectados.</div>;
  }

  return (
    <div className="space-y-3">
      {filtered.map((segment) => (
        <div key={segment.id} className="rounded-lg border border-border p-3 space-y-2">
          <div className="flex flex-wrap gap-2">
            {segment.is_hook && <Badge>Hook</Badge>}
            {segment.is_quote && <Badge variant="secondary">Quote</Badge>}
            {segment.is_clip_candidate && <Badge variant="secondary">Clip</Badge>}
            <Badge variant="outline">Score {segment.reuse_score ?? "—"}</Badge>
          </div>
          <p className="text-sm text-foreground">{segment.text}</p>
        </div>
      ))}
    </div>
  );
}
