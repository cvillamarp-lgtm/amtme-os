import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  useAssetCandidates,
  useCreateAssetCandidates,
  useUpdateAssetCandidateStatus,
} from "@/hooks/useAssetCandidates";
import { recommendAssetsForQuote } from "@/lib/asset-recommendation";
import { Sparkles, CheckCircle, XCircle } from "lucide-react";

interface Props {
  audioTakeId?: string;
  episodeId?: string;
  quoteCandidates: Array<{ id: string } & Record<string, unknown>>;
  userId?: string;
}

const PLATFORM_COLORS: Record<string, string> = {
  instagram: "bg-pink-500/10 text-pink-500",
  twitter: "bg-sky-500/10 text-sky-500",
  linkedin: "bg-blue-600/10 text-blue-600",
  youtube: "bg-red-500/10 text-red-500",
  tiktok: "bg-purple-500/10 text-purple-500",
};

export function AssetCandidatesPanel({ audioTakeId, episodeId, quoteCandidates, userId }: Props) {
  const { data: candidates = [] } = useAssetCandidates(audioTakeId);
  const createMutation = useCreateAssetCandidates(audioTakeId);
  const updateStatusMutation = useUpdateAssetCandidateStatus(audioTakeId);
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!audioTakeId || !userId || !quoteCandidates.length) {
      toast.error("Necesitas quotes y una toma guardada para generar assets.");
      return;
    }
    setGenerating(true);
    try {
      const topQuotes = quoteCandidates.slice(0, 5);
      const allRecs = topQuotes.flatMap((quote) =>
        recommendAssetsForQuote(quote).map((rec) => ({
          user_id: userId,
          episode_id: episodeId || null,
          audio_take_id: audioTakeId,
          quote_candidate_id: quote.id,
          asset_type: rec.asset_type,
          platform: rec.platform,
          title: rec.title,
          body_text: rec.body_text,
          score: rec.score,
          score_breakdown: rec.score_breakdown,
          status: "candidate",
        }))
      );
      await createMutation.mutateAsync(allRecs);
      toast.success(`${allRecs.length} asset candidates generados`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error generando assets");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Motor de recomendación automático basado en scores de quotes.
        </p>
        <Button
          size="sm"
          onClick={handleGenerate}
          disabled={generating || createMutation.isPending || !quoteCandidates.length}
        >
          <Sparkles className="h-4 w-4 mr-2" />
          Generar assets
        </Button>
      </div>

      {candidates.length === 0 ? (
        <div className="text-sm text-muted-foreground">
          Aún no hay asset candidates. Haz clic en "Generar assets" para crear recomendaciones desde los quotes.
        </div>
      ) : (
        <div className="space-y-2">
          {candidates.map((candidate) => (
            <div key={candidate.id} className="rounded-lg border border-border p-3 space-y-2">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      PLATFORM_COLORS[candidate.platform] || "bg-muted text-muted-foreground"
                    }`}
                  >
                    {candidate.platform}
                  </span>
                  <span className="text-sm font-medium">{candidate.title}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">Score: {candidate.score}</Badge>
                  <Badge
                    variant={
                      candidate.status === "approved"
                        ? "default"
                        : candidate.status === "rejected"
                        ? "destructive"
                        : "secondary"
                    }
                  >
                    {candidate.status}
                  </Badge>
                </div>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2">{candidate.body_text}</p>
              {candidate.status === "candidate" && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      updateStatusMutation.mutate({ id: candidate.id, status: "approved" })
                    }
                  >
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Aprobar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      updateStatusMutation.mutate({ id: candidate.id, status: "rejected" })
                    }
                  >
                    <XCircle className="h-3 w-3 mr-1" />
                    Rechazar
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
