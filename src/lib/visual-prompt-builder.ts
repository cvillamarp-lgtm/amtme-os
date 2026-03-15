export interface VisualPromptParams {
  quote_text: string;
  platform: string;
  asset_type: string;
  episode_title?: string;
  podcast_name?: string;
  tone?: string;
  style?: string;
  color_palette?: string;
}

const DIMENSION_MAP: Record<string, string> = {
  instagram: "1080x1080px (cuadrado)",
  tiktok: "1080x1920px (vertical 9:16)",
  youtube: "1280x720px (horizontal 16:9)",
  twitter: "1200x675px (horizontal)",
  linkedin: "1200x627px (horizontal)",
};

export function buildVisualPrompt(params: VisualPromptParams): string {
  const {
    quote_text,
    platform,
    asset_type,
    episode_title,
    podcast_name = "AMTME",
    tone = "profesional y moderno",
    style = "minimalista",
    color_palette = "fondo oscuro, acentos en blanco y naranja",
  } = params;

  const dimensions = DIMENSION_MAP[platform] || "1080x1080px";
  const truncated = quote_text.length > 200 ? quote_text.slice(0, 200) + "…" : quote_text;

  const parts = [
    `Diseña un asset visual tipo ${asset_type} para ${platform}.`,
    `Dimensiones: ${dimensions}.`,
    `Estilo: ${style}, tono ${tone}.`,
    `Paleta: ${color_palette}.`,
    truncated ? `Texto principal: "${truncated}"` : null,
    episode_title ? `Episodio: "${episode_title}"` : null,
    `Podcast: ${podcast_name}.`,
    `Sin ruido visual, texto legible, composición clara y moderna.`,
  ].filter(Boolean);

  return parts.join(" ");
}
