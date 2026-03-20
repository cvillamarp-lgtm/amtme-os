/**
 * AMTME Canvas Rendering Engine
 * Visual OS − Renderizado de piezas visuales
 * Instrucción Maestra §07–§09: Color, figura humana, sombra, subrayado, safe zones
 */

import { Palette } from "@/lib/design-utils";

export interface CanvasRenderConfig {
  width: number;
  height: number;
  palette: Palette;
  hostImage?: "REF_1" | "REF_2" | "none";
  keyword: string;
  headline: string;
  subheadline?: string;
  bodyText?: string;
  cta?: string;
  episodeBadge?: string;
}

export const TYPOGRAPHY = {
  display: { font: "Montserrat", weight: 900, baseSize: 96 },
  headline: { font: "Montserrat", weight: 700, baseSize: 80 },
  quote: { font: "Playfair Display", weight: 700, baseSize: 56 },
  ui: { font: "Inter", weight: 400, baseSize: 11, weights: { regular: 400, medium: 500, semibold: 600 } },
} as const;

export interface SafeZone {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function calculateSafeZone(width: number, height: number): SafeZone {
  const padding = 80;
  return { x: padding, y: padding, width: width - padding * 2, height: height - padding * 2 };
}

export function removeBlackBackground(imageData: ImageData, paletteIsDarkBg: boolean): ImageData {
  if (paletteIsDarkBg) return imageData;
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const luminance = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    if (luminance < 20) data[i + 3] = 0;
  }
  return imageData;
}

export function drawLongShadow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  bgColor: string
) {
  const rgb = parseInt(bgColor.slice(1), 16);
  const r = ((rgb >> 16) & 0xff) * 0.65;
  const g = ((rgb >> 8) & 0xff) * 0.65;
  const b = (rgb & 0xff) * 0.65;
  const shadowColor = `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, 0.5)`;

  ctx.save();
  ctx.fillStyle = shadowColor;
  ctx.shadowBlur = 10;
  ctx.shadowColor = `rgba(0, 0, 0, 0.3)`;
  ctx.beginPath();
  ctx.ellipse(x + width / 2, y + height + 20, width * 0.7, 15, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export interface UnderlineConfig {
  x: number;
  y: number;
  width: number;
  color: string;
  thickness: number;
  borderRadius: number;
  gap: number;
}

export function drawUnderline(ctx: CanvasRenderingContext2D, config: UnderlineConfig) {
  ctx.save();
  ctx.fillStyle = config.color;
  ctx.fillRect(config.x, config.y + config.gap, config.width, config.thickness);
  ctx.restore();
}

export async function drawHostImage(
  ctx: CanvasRenderingContext2D,
  hostImage: "REF_1" | "REF_2" | "none" | undefined,
  x: number,
  y: number,
  width: number,
  height: number,
  paletteIsDarkBg: boolean
) {
  if (!hostImage || hostImage === "none") return;

  try {
    const img = new Image();
    img.crossOrigin = "anonymous";

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error(`Failed to load host image`));
      img.src = `/host/${hostImage}.png`;
    });

    ctx.save();
    if (!paletteIsDarkBg) {
      ctx.drawImage(img, x, y, width, height);
      const imageData = ctx.getImageData(x, y, width, height);
      const cleaned = removeBlackBackground(imageData, false);
      ctx.putImageData(cleaned, x, y);
    } else {
      ctx.globalCompositeOperation = "screen";
      ctx.drawImage(img, x, y, width, height);
    }
    drawLongShadow(ctx, x, y, width, height, "");
    ctx.restore();
  } catch (error) {
    console.error("Error drawing host image:", error);
  }
}

export function drawText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  config: { font: string; size: number; weight: number; color: string; align?: CanvasTextAlign }
) {
  ctx.save();
  ctx.font = `${config.weight} ${config.size}px "${config.font}"`;
  ctx.fillStyle = config.color;
  ctx.textAlign = config.align || "left";
  ctx.textBaseline = "top";
  ctx.fillText(text, x, y, maxWidth);
  ctx.restore();
}

export async function renderCanvas(
  canvas: HTMLCanvasElement,
  config: CanvasRenderConfig
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get canvas context");

  canvas.width = config.width;
  canvas.height = config.height;

  const palette = config.palette;
  const safeZone = calculateSafeZone(config.width, config.height);
  const isDarkBg = palette.bg.toLowerCase() !== "#f0eee6";

  ctx.fillStyle = palette.bg;
  ctx.fillRect(0, 0, config.width, config.height);

  if (config.hostImage && config.hostImage !== "none") {
    const hostWidth = Math.round(config.width * 0.45);
    const hostX = config.width - hostWidth;
    await drawHostImage(ctx, config.hostImage, hostX, 0, hostWidth, config.height, isDarkBg);
  }

  const contentX = safeZone.x;
  let contentY = safeZone.y + 150;

  if (config.headline) {
    drawText(ctx, config.headline, contentX, contentY, safeZone.width, {
      font: TYPOGRAPHY.headline.font,
      size: TYPOGRAPHY.headline.baseSize,
      weight: TYPOGRAPHY.headline.weight,
      color: palette.text,
    });
    contentY += TYPOGRAPHY.headline.baseSize + 30;
  }

  if (config.keyword) {
    drawText(ctx, config.keyword, contentX, contentY, safeZone.width, {
      font: TYPOGRAPHY.display.font,
      size: TYPOGRAPHY.display.baseSize,
      weight: TYPOGRAPHY.display.weight,
      color: palette.accent,
    });

    drawUnderline(ctx, {
      x: contentX,
      y: contentY + TYPOGRAPHY.display.baseSize,
      width: Math.min(ctx.measureText(config.keyword).width, safeZone.width),
      color: palette.accent,
      thickness: 4,
      borderRadius: 2,
      gap: 4,
    });

    contentY += TYPOGRAPHY.display.baseSize + 50;
  }

  if (config.subheadline) {
    ctx.fillStyle = palette.text;
    ctx.globalAlpha = 0.8;
    drawText(ctx, config.subheadline, contentX, contentY, safeZone.width, {
      font: TYPOGRAPHY.ui.font,
      size: 18,
      weight: TYPOGRAPHY.ui.weights.regular,
      color: palette.text,
    });
    ctx.globalAlpha = 1.0;
    contentY += 50;
  }

  if (config.cta) {
    const ctaWidth = 220;
    const ctaHeight = 44;
    ctx.fillStyle = palette.accent;
    ctx.fillRect(contentX, contentY, ctaWidth, ctaHeight);
    ctx.fillStyle = palette.bg;
    ctx.font = `${TYPOGRAPHY.ui.weights.semibold} 16px "${TYPOGRAPHY.ui.font}"`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(config.cta, contentX + ctaWidth / 2, contentY + ctaHeight / 2);
  }

  if (config.episodeBadge) {
    const badgeX = config.width - safeZone.x - 60;
    const badgeY = safeZone.y;
    ctx.strokeStyle = palette.accent;
    ctx.lineWidth = 1;
    ctx.strokeRect(badgeX, badgeY, 60, 20);
    ctx.fillStyle = palette.text;
    ctx.globalAlpha = 0.4;
    ctx.font = `${TYPOGRAPHY.ui.weights.semibold} 10px "${TYPOGRAPHY.ui.font}"`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(config.episodeBadge, badgeX + 30, badgeY + 10);
    ctx.globalAlpha = 1.0;
  }
}

export function drawSafeZoneOverlay(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  color = "#E4F542",
  opacity = 0.2
) {
  const safeZone = calculateSafeZone(width, height);
  ctx.save();
  ctx.strokeStyle = color;
  ctx.globalAlpha = opacity;
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 5]);
  ctx.strokeRect(safeZone.x, safeZone.y, safeZone.width, safeZone.height);
  ctx.restore();
}

export function drawGridOverlay(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  columns = 12,
  color = "#E4F542",
  opacity = 0.06
) {
  const columnWidth = width / columns;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.globalAlpha = opacity;
  ctx.lineWidth = 1;
  for (let i = 1; i < columns; i++) {
    const x = i * columnWidth;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Backward Compatibility: Legacy Canvas Building Functions
 * Used by existing PieceCard, PiecePreviewCanvas components
 */
export interface CanvasPiece {
  id: string;
  width_px: number;
  height_px: number;
  bg_color: string;
  accent_color: string;
  text_color: string;
  host_image?: "REF_1" | "REF_2" | "none";
}

export async function buildLocalComposite(
  piece: CanvasPiece,
  lines: string[],
  episodeNumber: string,
  _supabaseUrl?: string
): Promise<string> {
  const canvas = document.createElement("canvas");
  canvas.width = piece.width_px || 1080;
  canvas.height = piece.height_px || 1920;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get canvas context");

  ctx.fillStyle = piece.bg_color;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (piece.host_image && piece.host_image !== "none") {
    const hostWidth = Math.round(canvas.width * 0.45);
    const hostX = canvas.width - hostWidth;
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      await new Promise<void>((resolve) => {
        img.onload = () => {
          ctx.globalCompositeOperation = "darken";
          ctx.drawImage(img, hostX, 0, hostWidth, canvas.height);
          ctx.globalCompositeOperation = "source-over";
          resolve();
        };
        img.onerror = () => resolve();
        img.src = `/host/${piece.host_image}.png`;
      });
    } catch {
      // Ignore host image loading failures in preview path
    }
  }

  const lineHeight = 80;
  const startY = 200;
  const maxWidth = Math.round(canvas.width * 0.6);

  ctx.fillStyle = piece.text_color;
  ctx.font = "bold 72px Montserrat";
  ctx.textBaseline = "top";

  lines.forEach((line, index) => {
    const y = startY + index * lineHeight;
    if (y < canvas.height - 100) {
      ctx.fillText(line, 80, y, maxWidth);
    }
  });

  if (lines.length > 0 && lines[0]) {
    const metrics = ctx.measureText(lines[0]);
    ctx.fillStyle = piece.accent_color;
    ctx.fillRect(80, startY + 72 + 8, Math.min(metrics.width, maxWidth), 4);
  }

  ctx.strokeStyle = piece.accent_color;
  ctx.lineWidth = 2;
  ctx.strokeRect(canvas.width - 120, 40, 80, 40);
  ctx.fillStyle = piece.text_color;
  ctx.globalAlpha = 0.6;
  ctx.font = "bold 14px Inter";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(`EP ${episodeNumber}`, canvas.width - 80, 60);
  ctx.globalAlpha = 1;

  return canvas.toDataURL("image/png");
}

export async function buildCompositeImage(
  piece: CanvasPiece,
  lines: string[],
  episodeNumber: string,
  supabaseUrl?: string
): Promise<Blob> {
  const dataUrl = await buildLocalComposite(piece, lines, episodeNumber, supabaseUrl);
  const response = await fetch(dataUrl);
  return response.blob();
}
