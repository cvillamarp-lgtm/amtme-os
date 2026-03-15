export interface ChecklistItem {
  id: string;
  label: string;
  required: boolean;
  done: boolean;
}

export function buildPublicationChecklist(platform: string): ChecklistItem[] {
  const base: ChecklistItem[] = [
    { id: "has_audio", label: "Audio master listo", required: true, done: false },
    { id: "has_transcript", label: "Transcripción generada", required: false, done: false },
    { id: "has_quotes", label: "Quotes aprobados", required: false, done: false },
    { id: "has_assets", label: "Assets visuales renderizados", required: false, done: false },
  ];

  const platformSpecific: Record<string, ChecklistItem[]> = {
    youtube: [
      { id: "has_thumbnail", label: "Thumbnail generado (1280x720)", required: true, done: false },
      { id: "has_description", label: "Descripción de YouTube lista", required: true, done: false },
      { id: "has_srt", label: "Subtítulos SRT exportados", required: false, done: false },
    ],
    instagram: [
      { id: "has_reel_cover", label: "Cover del Reel listo", required: false, done: false },
      { id: "has_caption", label: "Caption con hashtags", required: true, done: false },
    ],
    spotify: [
      { id: "has_cover_art", label: "Cover art 3000x3000px", required: true, done: false },
      { id: "has_rss_metadata", label: "Metadata RSS completa", required: true, done: false },
    ],
    tiktok: [
      { id: "has_captions", label: "Subtítulos en video", required: false, done: false },
    ],
    linkedin: [
      { id: "has_article_copy", label: "Texto del artículo preparado", required: false, done: false },
    ],
  };

  return [...base, ...(platformSpecific[platform] || [])];
}

export function getChecklistCompletion(checklist: ChecklistItem[]): {
  total: number;
  done: number;
  required_total: number;
  required_done: number;
  percentage: number;
} {
  const total = checklist.length;
  const done = checklist.filter((i) => i.done).length;
  const required_total = checklist.filter((i) => i.required).length;
  const required_done = checklist.filter((i) => i.required && i.done).length;
  const percentage = total > 0 ? Math.round((done / total) * 100) : 0;
  return { total, done, required_total, required_done, percentage };
}
