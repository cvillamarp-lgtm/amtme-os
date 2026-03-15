export interface AssetRecommendation {
  asset_type: string;
  platform: string;
  title: string;
  body_text: string;
  score: number;
  score_breakdown: {
    emotional: number;
    clarity: number;
    reuse: number;
    length: number;
  };
}

export function recommendAssetsForQuote(quote: {
  text: string;
  emotional_score?: number | null;
  clarity_score?: number | null;
  reuse_score?: number | null;
  start_seconds?: number | null;
  end_seconds?: number | null;
}): AssetRecommendation[] {
  const emotional = quote.emotional_score ?? 5;
  const clarity = quote.clarity_score ?? 5;
  const reuse = quote.reuse_score ?? 5;
  const duration =
    quote.end_seconds != null && quote.start_seconds != null
      ? quote.end_seconds - quote.start_seconds
      : null;

  const lengthScore = duration == null ? 5 : duration <= 60 ? 10 : duration <= 120 ? 7 : 4;
  const baseScore = emotional * 0.3 + clarity * 0.3 + reuse * 0.25 + lengthScore * 0.15;

  const round = (n: number) => Math.round(n * 10) / 10;
  const breakdown = { emotional, clarity, reuse, length: lengthScore };

  const candidates: AssetRecommendation[] = [
    {
      asset_type: "quote_card",
      platform: "instagram",
      title: "Quote Card Instagram",
      body_text: quote.text,
      score: round(baseScore),
      score_breakdown: breakdown,
    },
  ];

  if (duration == null || duration <= 90) {
    candidates.push({
      asset_type: "audiogram",
      platform: "instagram",
      title: "Audiograma Instagram Reels",
      body_text: quote.text,
      score: round(baseScore + (lengthScore > 7 ? 1 : 0)),
      score_breakdown: breakdown,
    });
  }

  if (clarity >= 7) {
    candidates.push({
      asset_type: "quote_card",
      platform: "twitter",
      title: "Quote para Twitter/X",
      body_text: quote.text.slice(0, 280),
      score: round(baseScore - 0.5),
      score_breakdown: breakdown,
    });
  }

  if (reuse >= 7 && clarity >= 7) {
    candidates.push({
      asset_type: "quote_card",
      platform: "linkedin",
      title: "Quote para LinkedIn",
      body_text: quote.text,
      score: round(baseScore + 0.5),
      score_breakdown: breakdown,
    });
  }

  return candidates.sort((a, b) => b.score - a.score);
}
