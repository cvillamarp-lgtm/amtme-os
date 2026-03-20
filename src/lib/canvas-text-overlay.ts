/**
 * AMTME Canvas Text Overlay
 * ─────────────────────────
 * Composites AMTME copy + fixed brand elements onto a base image.
 *
 * Every image ALWAYS receives the same fixed identity block at the bottom:
 *   • Episode number      "EP. 29"
 *   • Podcast name        "A MÍ TAMPOCO ME EXPLICARON"
 *   • Platforms           Spotify icon + Apple Podcasts icon (drawn)
 *   • Host signature      "CHRISTIAN VILLAMAR"
 *
 * Variable content (dominant, secondary, CTA) comes from copyLines.
 */

import type { VisualPiece } from "@/lib/visual-templates";

// ─── Official AMTME Palette ───────────────────────────────────────────────────
const P = {
  yellow:    "#F2C84B",
  cream:     "#F5F0E8",
  grayLight: "#CCCCCC",
  signature: "#888888",
  white:     "#FFFFFF",
  spotify:   "#1DB954",  // Spotify green
  apple:     "#FC3C44",  // Apple Podcasts red
} as const;

// ─── 6-Level Typographic Hierarchy (Instrucción Maestra §03-A) ────────────────
const DOMINANT_RATIO = 0.074; // 80px dominant on 1080px canvas

interface Level {
  scaleFactor: number;
  fontWeight:  number;
  color:       string;
  opacity:     number;
  trackingPx:  number;
  leadingMult: number;
}

const LEVELS: Level[] = [
  { scaleFactor: 1.00, fontWeight: 900, color: P.yellow,    opacity: 1.00, trackingPx: -0.5, leadingMult: 0.92 },
  { scaleFactor: 0.72, fontWeight: 700, color: P.cream,     opacity: 1.00, trackingPx:  1.0, leadingMult: 1.05 },
  { scaleFactor: 0.60, fontWeight: 500, color: P.cream,     opacity: 1.00, trackingPx:  1.2, leadingMult: 1.05 },
  { scaleFactor: 0.52, fontWeight: 400, color: P.grayLight, opacity: 0.90, trackingPx:  1.5, leadingMult: 1.05 },
  { scaleFactor: 0.45, fontWeight: 500, color: P.cream,     opacity: 0.90, trackingPx:  2.5, leadingMult: 1.05 },
  { scaleFactor: 0.38, fontWeight: 300, color: P.signature, opacity: 0.85, trackingPx:  3.5, leadingMult: 1.10 },
];

// ─── Y-Anchors per canvas height (§04-D) ─────────────────────────────────────
interface YAnchors {
  header: number; content: number; subtitle: number; footer: number;
}

function getAnchors(H: number): YAnchors {
  const a1080 = { header: 140, content: 420, subtitle: 720,  footer: 940  };
  const a1350 = { header: 170, content: 470, subtitle: 800,  footer: 1100 };
  const a1920 = { header: 280, content: 680, subtitle: 1150, footer: 1600 };
  const src   = H <= 1080 ? a1080 : H <= 1350 ? a1350 : a1920;
  const ratio = H / (H <= 1080 ? 1080 : H <= 1350 ? 1350 : 1920);
  return {
    header:   Math.round(src.header   * ratio),
    content:  Math.round(src.content  * ratio),
    subtitle: Math.round(src.subtitle * ratio),
    footer:   Math.round(src.footer   * ratio),
  };
}

// ─── Safe Zones (§01-C) ───────────────────────────────────────────────────────
interface SafeZone {
  xMin: number; xMax: number; yMin: number; yMax: number; textXMax: number;
}

function getSafeZone(W: number, H: number): SafeZone {
  const xMin = Math.round(W * 0.083);
  const yMin = H <= 1080 ? Math.round(H * 0.083) : H <= 1350 ? Math.round(H * 0.089) : Math.round(H * 0.130);
  return {
    xMin, xMax: W - xMin,
    yMin, yMax: H - yMin,
    textXMax: Math.round(W * 0.50),
  };
}

// ─── Gestalt Spacing ──────────────────────────────────────────────────────────
const GAP_GROUPS   = 40;
const GAP_WITHIN   = 12;
const BREATHING    = 24;

// ─── Line Classification ──────────────────────────────────────────────────────
type LineRole = "meta_top" | "content" | "cta" | "episode" | "handle" | "signature" | "empty";

function classifyLine(raw: string): LineRole {
  const u = raw.trim().toUpperCase();
  if (!u) return "empty";
  if (u.startsWith("@")) return "handle";
  if (/^(CHRISTIAN VILLAMAR|SPOTIFY|APPLE PODCAST)/.test(u)) return "signature";
  if (/^EP[\s.]/.test(u) || /^\d{1,2}\s*[—-]/.test(u) || /^\d{2}$/.test(u)) return "episode";
  if (/^(NUEVO EPISODIO|EPISODIO NUEVO|A M[IÍ] TAMPOCO|A MI TAMPOCO|PODCAST)/.test(u)) return "meta_top";
  if (/^(ESC[ÚU]CHALO|GU[ÁA]RDALO|COMP[ÁA]RTELO|ESCUCHA EL EP|S[IÍ]GUENOS|NUEVO EP)/.test(u)) return "cta";
  return "content";
}

type GroupRole = "header" | "content" | "cta_block" | "footer";
interface LineGroup { role: GroupRole; lines: string[] }

function parseGroups(lines: string[]): LineGroup[] {
  const blocks: string[][] = [];
  let cur: string[] = [];
  for (const l of lines) {
    if (!l.trim()) { if (cur.length) { blocks.push(cur); cur = []; } }
    else cur.push(l);
  }
  if (cur.length) blocks.push(cur);

  return blocks.map((block): LineGroup => {
    const roles = block.map(classifyLine);
    const first = roles[0];
    if (first === "meta_top") return { role: "header", lines: block };
    if (roles.every(r => ["episode","handle","signature","empty"].includes(r))) return { role: "footer", lines: block };
    if (roles.some(r => r === "cta") && !roles.some(r => r === "content")) return { role: "cta_block", lines: block };
    return { role: "content", lines: block };
  });
}

// ─── Canvas Helpers ───────────────────────────────────────────────────────────
function applyLevel(ctx: CanvasRenderingContext2D, lv: Level, basePx: number): void {
  const sizePx = Math.round(basePx * lv.scaleFactor);
  ctx.font        = `${lv.fontWeight} ${sizePx}px Inter,"Helvetica Neue",Arial,sans-serif`;
  ctx.globalAlpha = lv.opacity;
  ctx.fillStyle   = lv.color;
  (ctx as unknown as { letterSpacing: string }).letterSpacing = `${lv.trackingPx}px`;
}

function fillWrapped(
  ctx: CanvasRenderingContext2D,
  text: string, x: number, y: number, maxWidth: number, lineH: number,
): number {
  const words = text.split(" ");
  let line = ""; let rows = 0;
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && line) {
      ctx.fillText(line, x, y + rows * lineH); line = word; rows++;
    } else { line = candidate; }
  }
  if (line) { ctx.fillText(line, x, y + rows * lineH); rows++; }
  return rows;
}

// ─── Platform Logos (drawn with canvas paths) ─────────────────────────────────
/** Draws a simplified Spotify logo: green circle + 3 white wave arcs. */
function drawSpotifyLogo(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number): void {
  ctx.save();
  ctx.globalAlpha = 1;

  // Green circle
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = P.spotify;
  ctx.fill();

  // 3 white wave arcs
  ctx.strokeStyle = P.white;
  ctx.lineCap = "round";
  const waves = [
    { yOff: -0.20, spread: 0.60 },
    { yOff:  0.00, spread: 0.45 },
    { yOff:  0.18, spread: 0.30 },
  ];
  for (const { yOff, spread } of waves) {
    ctx.lineWidth = r * 0.16;
    const wCx = cx;
    const wCy = cy + r * yOff + r * spread * 0.4;
    const wR  = r * spread;
    ctx.beginPath();
    ctx.arc(wCx, wCy, wR, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
  }
  ctx.restore();
}

/** Draws a simplified Apple Podcasts logo: rounded square + mic wave lines. */
function drawApplePodcastsLogo(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number): void {
  ctx.save();
  ctx.globalAlpha = 1;

  const side  = r * 2;
  const left  = cx - r;
  const top   = cy - r;
  const curve = r * 0.40;

  // Purple rounded square
  ctx.beginPath();
  ctx.moveTo(left + curve, top);
  ctx.lineTo(left + side - curve, top);
  ctx.quadraticCurveTo(left + side, top, left + side, top + curve);
  ctx.lineTo(left + side, top + side - curve);
  ctx.quadraticCurveTo(left + side, top + side, left + side - curve, top + side);
  ctx.lineTo(left + curve, top + side);
  ctx.quadraticCurveTo(left, top + side, left, top + side - curve);
  ctx.lineTo(left, top + curve);
  ctx.quadraticCurveTo(left, top, left + curve, top);
  ctx.closePath();
  ctx.fillStyle = P.apple;
  ctx.fill();

  // White mic circle + stand
  ctx.fillStyle = P.white;
  ctx.beginPath();
  ctx.arc(cx, cy - r * 0.12, r * 0.28, 0, Math.PI * 2);
  ctx.fill();

  // Stand line
  ctx.strokeStyle = P.white;
  ctx.lineWidth   = r * 0.14;
  ctx.lineCap     = "round";
  ctx.beginPath();
  ctx.moveTo(cx, cy + r * 0.18);
  ctx.lineTo(cx, cy + r * 0.50);
  ctx.stroke();

  // Wave arcs
  ctx.lineWidth = r * 0.12;
  for (const spread of [0.55, 0.40]) {
    ctx.beginPath();
    ctx.arc(cx, cy - r * 0.12, r * spread, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();
  }

  ctx.restore();
}

// ─── Fixed Brand Identity Block — §06 Instrucción Maestra ────────────────────
/**
 * Renders the PERMANENT brand identity block identically in ALL pieces.
 * Source: Instrucción Maestra §06-A "Elementos que aparecen en TODA pieza"
 *
 * Layout (anchored to G4, bottom of safe zone):
 *
 *   Row 1 — PODCAST tag             "PODCAST"  tracking +40 · L6 · pequeño
 *   Row 2 — Episode + show name     "Ep. 29 —  A MÍ TAMPOCO ME EXPLICARON"
 *   Row 3 — Platform logos          [● SPOTIFY]   [■ APPLE PODCASTS]
 *   Row 4 — Host signature          "CHRISTIAN VILLAMAR"  opacidad 85%
 */
function renderFixedBrandBlock(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  epNum: string,
): void {
  const safe    = getSafeZone(W, H);
  const anchors = getAnchors(H);
  const baseDOM = Math.round(W * DOMINANT_RATIO);
  const lv6     = LEVELS[5];                          // L6: 38% · w300 · #888888 · op 85%
  const sz6     = Math.round(baseDOM * lv6.scaleFactor);
  const lineH6  = Math.round(sz6 * lv6.leadingMult);
  const logoR   = Math.round(sz6 * 0.50);             // logo radius proportional to L6

  // 4 rows + 3 gaps between them
  const blockH = lineH6 * 4 + GAP_WITHIN * 3;
  let y = Math.max(anchors.footer, safe.yMax - blockH);

  ctx.textAlign    = "left";
  ctx.textBaseline = "alphabetic";

  // ── Row 1: "PODCAST" tag (tracking +40, §06-A) ───────────────────────────
  ctx.font        = `${lv6.fontWeight} ${sz6}px Inter,"Helvetica Neue",Arial,sans-serif`;
  ctx.globalAlpha = lv6.opacity;
  ctx.fillStyle   = lv6.color;
  (ctx as unknown as { letterSpacing: string }).letterSpacing = "3.5px"; // tracking +40
  ctx.fillText("PODCAST", safe.xMin, y);
  y += lineH6 + GAP_WITHIN;

  // ── Row 2: "Ep. 29 —  A MÍ TAMPOCO ME EXPLICARON" (§06-A format) ─────────
  ctx.font        = `${lv6.fontWeight} ${sz6}px Inter,"Helvetica Neue",Arial,sans-serif`;
  ctx.globalAlpha = lv6.opacity;
  ctx.fillStyle   = lv6.color;
  (ctx as unknown as { letterSpacing: string }).letterSpacing = "3.5px";
  ctx.fillText(`Ep. ${epNum} —  A MÍ TAMPOCO ME EXPLICARON`, safe.xMin, y);
  y += lineH6 + GAP_WITHIN;

  // ── Row 3: Platform logos + labels (§06-A "Spotify + Apple Podcasts · alineados") ─
  const labelY   = y;
  const gap      = Math.round(sz6 * 0.40);

  // Spotify logo + label
  drawSpotifyLogo(ctx, safe.xMin + logoR, labelY - logoR * 0.75, logoR);
  ctx.font        = `${lv6.fontWeight} ${sz6}px Inter,"Helvetica Neue",Arial,sans-serif`;
  ctx.globalAlpha = lv6.opacity;
  ctx.fillStyle   = lv6.color;
  (ctx as unknown as { letterSpacing: string }).letterSpacing = "3.5px";
  ctx.fillText("SPOTIFY", safe.xMin + logoR * 2 + gap, labelY);

  // Apple Podcasts logo + label — 24px separation per §06-A
  const spotifyW   = ctx.measureText("SPOTIFY").width;
  const separation = Math.round(sz6 * 1.5);  // ~24px optical sep at scale
  const appleX     = safe.xMin + logoR * 2 + gap + spotifyW + separation;
  drawApplePodcastsLogo(ctx, appleX + logoR, labelY - logoR * 0.75, logoR);
  ctx.globalAlpha = lv6.opacity;
  ctx.fillStyle   = lv6.color;
  ctx.fillText("APPLE PODCASTS", appleX + logoR * 2 + gap, labelY);
  y += lineH6 + GAP_WITHIN;

  // ── Row 4: "CHRISTIAN VILLAMAR" · opacidad 85% · tracking +30 (§06-A) ────
  ctx.font        = `${lv6.fontWeight} ${sz6}px Inter,"Helvetica Neue",Arial,sans-serif`;
  ctx.globalAlpha = 0.85;   // §06-A: "opacidad 85%"
  ctx.fillStyle   = lv6.color;
  (ctx as unknown as { letterSpacing: string }).letterSpacing = "3px";  // tracking +30
  ctx.fillText("CHRISTIAN VILLAMAR", safe.xMin, y);

  ctx.globalAlpha = 1;
}

// ─── Variable Content Renderer ────────────────────────────────────────────────
function renderVariableContent(
  ctx: CanvasRenderingContext2D,
  copyLines: string[],
  W: number,
  H: number,
  epNum: string,
): void {
  const safe    = getSafeZone(W, H);
  const anchors = getAnchors(H);
  const baseDOM = Math.round(W * DOMINANT_RATIO);

  const resolved = copyLines.map(l => l.replace(/XX/gi, epNum));
  const groups   = parseGroups(resolved);

  ctx.textAlign    = "left";
  ctx.textBaseline = "alphabetic";

  // G1 — Header (meta top, e.g. "NUEVO EPISODIO") ───────────────────────────
  const headerGroup = groups.find(g => g.role === "header");
  if (headerGroup) {
    applyLevel(ctx, LEVELS[5], baseDOM);
    let y = anchors.header;
    for (const line of headerGroup.lines) {
      ctx.fillText(line.toUpperCase(), safe.xMin, y);
      y += Math.round(baseDOM * LEVELS[5].scaleFactor * LEVELS[5].leadingMult) + GAP_WITHIN;
    }
  }

  // G2 — Main content (dominant → secondary → tertiary) ─────────────────────
  const contentGroup = groups.find(g => g.role === "content");
  if (contentGroup) {
    const contentLines = contentGroup.lines.filter(l => l.trim());
    let y = anchors.content;

    contentLines.forEach((line, idx) => {
      const levelIdx = Math.min(idx, 2);
      const lv       = LEVELS[levelIdx];
      const sizePx   = Math.round(baseDOM * lv.scaleFactor);
      const lineH    = Math.round(sizePx * lv.leadingMult);

      applyLevel(ctx, lv, baseDOM);
      if (idx === 0) y += BREATHING;

      const rows = fillWrapped(ctx, line.toUpperCase(), safe.xMin, y, safe.textXMax - safe.xMin, lineH);
      y += rows * lineH + (idx === 0 ? GAP_GROUPS : GAP_WITHIN);
    });
  }

  // G3 — CTA block ──────────────────────────────────────────────────────────
  const ctaGroup = groups.find(g => g.role === "cta_block");
  if (ctaGroup) {
    let y = anchors.subtitle;
    for (const [idx, line] of ctaGroup.lines.filter(l => l.trim()).entries()) {
      const role   = classifyLine(line);
      const lv     = role === "cta" ? LEVELS[4] : LEVELS[3];
      const sizePx = Math.round(baseDOM * lv.scaleFactor);
      applyLevel(ctx, lv, baseDOM);
      ctx.fillText(line.toUpperCase(), safe.xMin, y);
      y += Math.round(sizePx * lv.leadingMult) + (idx === 0 ? GAP_WITHIN : GAP_WITHIN / 2);
    }
  } else {
    // Default CTA if none in copyLines
    const lv     = LEVELS[4];
    const sizePx = Math.round(baseDOM * lv.scaleFactor);
    applyLevel(ctx, lv, baseDOM);
    ctx.fillText("ESCÚCHALO HOY", safe.xMin, anchors.subtitle);
    void sizePx;
  }

  ctx.globalAlpha = 1;
}

// ─── Public API ───────────────────────────────────────────────────────────────
export async function buildCompositeImage(
  baseImageUrl: string,
  copyLines: string[],
  piece: VisualPiece,
  episodeNumber: string,
): Promise<string> {
  try {
    const resp = await fetch(baseImageUrl);
    if (!resp.ok) throw new Error(`Fetch ${resp.status}`);
    const blob      = await resp.blob();
    const objectUrl = URL.createObjectURL(blob);

    try {
      const canvas  = document.createElement("canvas");
      canvas.width  = piece.width;
      canvas.height = piece.height;
      const ctx     = canvas.getContext("2d");
      if (!ctx) throw new Error("No 2D context");

      // 1. Draw AI-generated base image (background + host)
      const img = new Image();
      await new Promise<void>((res, rej) => {
        img.onload  = () => res();
        img.onerror = () => rej(new Error("img load failed"));
        img.src     = objectUrl;
      });
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // 2. Variable content (dominant, secondary, CTA) from copyLines
      renderVariableContent(ctx, copyLines, piece.width, piece.height, episodeNumber);

      // 3. Fixed brand identity block — ALWAYS the same in every image
      renderFixedBrandBlock(ctx, piece.width, piece.height, episodeNumber);

      return canvas.toDataURL("image/png");
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  } catch {
    return baseImageUrl;
  }
}
