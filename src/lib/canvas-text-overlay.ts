import type { VisualPiece } from "@/lib/visual-templates";

const C = {
  yellow:    "#F2C84B",
  cream:     "#F5F0E8",
  gray:      "#999999",
  signature: "#888888",
} as const;

/**
 * Fetches baseImageUrl, draws it on an off-screen canvas, overlays
 * AMTME-branded copy text, and returns the composited PNG as a data URL.
 *
 * Falls back to the original URL if anything fails (CORS, load error, etc.)
 */
export async function buildCompositeImage(
  baseImageUrl: string,
  copyLines: string[],
  piece: VisualPiece,
  episodeNumber: string,
): Promise<string> {
  try {
    // Fetch as blob to sidestep any CORS restriction on canvas.toDataURL
    const resp = await fetch(baseImageUrl);
    if (!resp.ok) throw new Error(`Fetch ${resp.status}`);
    const blob = await resp.blob();
    const objectUrl = URL.createObjectURL(blob);

    try {
      const canvas = document.createElement("canvas");
      canvas.width  = piece.width;
      canvas.height = piece.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("No 2D context");

      // Draw base image
      const img = new Image();
      await new Promise<void>((res, rej) => {
        img.onload  = () => res();
        img.onerror = () => rej(new Error("img load failed"));
        img.src = objectUrl;
      });
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Overlay text
      renderAMTMEText(ctx, copyLines, piece.width, piece.height, episodeNumber);

      return canvas.toDataURL("image/png");
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  } catch {
    // Graceful fallback — show original image without text overlay
    return baseImageUrl;
  }
}

// ─── Text rendering ──────────────────────────────────────────────────────────

function renderAMTMEText(
  ctx: CanvasRenderingContext2D,
  lines: string[],
  W: number,
  H: number,
  epNum: string,
): void {
  const margin = Math.round(W * 0.083); // 90 px on 1080-wide canvas
  const maxW   = Math.round(W * 0.44);  // left 44 % — host lives on the right

  const sz = {
    dominant:  Math.round(W * 0.083), // ~90 px
    secondary: Math.round(W * 0.05),  // ~54 px
    meta:      Math.round(W * 0.028), // ~30 px
    signature: Math.round(W * 0.024), // ~26 px
  };

  const ep = epNum.padStart(2, "0");
  const resolved = lines
    .map((l) => l.replace(/XX/gi, ep).trim())
    .filter(Boolean);

  const isMeta      = (l: string) => /^(ep[\s.]|a m[íi] tampoco|podcast|escúcha)/i.test(l);
  const isHandle    = (l: string) => l.startsWith("@");
  const isSignature = (l: string) => /christian villamar|spotify|apple/i.test(l);

  ctx.textAlign    = "left";
  ctx.textBaseline = "alphabetic";

  // Vertical start: 28 % from top so the dominant lands near the golden ratio
  let y = Math.round(H * 0.28);
  let dominantPlaced = false;

  for (const line of resolved) {
    const upper = line.toUpperCase();

    if (!dominantPlaced && !isMeta(line) && !isHandle(line) && !isSignature(line)) {
      // ① Dominant — large golden yellow
      ctx.font      = `900 ${sz.dominant}px Inter,"Helvetica Neue",Arial,sans-serif`;
      ctx.fillStyle = C.yellow;
      const rows = fillWrapped(ctx, upper, margin, y, maxW, sz.dominant * 1.08);
      y += rows * sz.dominant * 1.08 + sz.dominant * 0.35;
      dominantPlaced = true;

    } else if (isMeta(line)) {
      // ④⑤ Episode / show name — cream, small
      ctx.font      = `400 ${sz.meta}px Inter,"Helvetica Neue",Arial,sans-serif`;
      ctx.fillStyle = C.cream;
      ctx.fillText(upper, margin, y);
      y += sz.meta * 1.6;

    } else if (isHandle(line) || isSignature(line)) {
      // ⑥ Signature — gray
      ctx.font      = `300 ${sz.signature}px Inter,"Helvetica Neue",Arial,sans-serif`;
      ctx.fillStyle = C.signature;
      ctx.fillText(line, margin, y);
      y += sz.signature * 1.5;

    } else {
      // ②③ Secondary / tertiary — cream
      ctx.font      = `600 ${sz.secondary}px Inter,"Helvetica Neue",Arial,sans-serif`;
      ctx.fillStyle = C.cream;
      const rows = fillWrapped(ctx, upper, margin, y, maxW, sz.secondary * 1.1);
      y += rows * sz.secondary * 1.1 + sz.secondary * 0.25;
    }
  }
}

/** Word-wraps text inside maxWidth, returns the number of lines rendered. */
function fillWrapped(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
): number {
  const words = text.split(" ");
  let line  = "";
  let count = 0;

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && line) {
      ctx.fillText(line, x, y + count * lineHeight);
      line = word;
      count++;
    } else {
      line = candidate;
    }
  }
  if (line) {
    ctx.fillText(line, x, y + count * lineHeight);
    count++;
  }
  return count;
}
