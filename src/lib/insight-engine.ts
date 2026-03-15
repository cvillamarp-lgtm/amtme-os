export interface MetricData {
  platform: string;
  metric_type: string;
  value: number;
  snapshot_date: string;
}

export interface InsightResult {
  insight_type: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  source: string;
}

export function generateInsightsFromMetrics(metrics: MetricData[]): InsightResult[] {
  if (metrics.length === 0) return [];

  const insights: InsightResult[] = [];

  // Group plays by platform
  const byPlatform: Record<string, MetricData[]> = {};
  for (const m of metrics) {
    if (!byPlatform[m.platform]) byPlatform[m.platform] = [];
    byPlatform[m.platform].push(m);
  }

  for (const [platform, data] of Object.entries(byPlatform)) {
    const plays = data.filter((d) => d.metric_type === "plays");
    if (plays.length > 0) {
      const total = plays.reduce((sum, d) => sum + d.value, 0);
      const avg = total / plays.length;
      insights.push({
        insight_type: "engagement_pattern",
        title: `Promedio de reproducciones en ${platform}: ${Math.round(avg)}`,
        body: `Basado en ${plays.length} snapshot(s). Total acumulado: ${total} reproducciones.`,
        data: { platform, avg_plays: avg, total_plays: total, snapshots: plays.length },
        source: "auto",
      });
    }
  }

  // Top snapshot
  const topPlay = [...metrics]
    .filter((m) => m.metric_type === "plays")
    .sort((a, b) => b.value - a.value)[0];

  if (topPlay) {
    insights.push({
      insight_type: "format_trend",
      title: `Mejor snapshot: ${topPlay.value.toLocaleString()} reproducciones en ${topPlay.platform}`,
      body: `El snapshot más alto fue registrado el ${topPlay.snapshot_date} en ${topPlay.platform}.`,
      data: { ...topPlay },
      source: "auto",
    });
  }

  return insights;
}
