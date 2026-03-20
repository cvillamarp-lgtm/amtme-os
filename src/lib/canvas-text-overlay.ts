/**
 * AMTME Canvas Text Overlay
 * ─────────────────────────
 * Composites the AMTME copy text onto a base image using the official
 * brand system: safe zones, 6-level typographic hierarchy, Gestalt
 * proximity rules, and exact color palette from the Instrucción Maestra.
 */

import type { VisualPiece } from "@/lib/visual-templates";

// ─── Official AMTME Palette ───────────────────────────────────────────────────
const P = {
  yellow:    "#F2C84B",  // L1 Dominante emocional
  cream:     "#F5F0E8",  // L2 Secundario / L3 Terciario / L5 CTA
  grayLight: "#CCCCCC",  // L4 Subtítulo
  grayMeta:  "#999999",  // Metadatos pequeños
  signature: "#888888",  // L6 Firma / handle / logos
} as const;

// ─── Typographic Scale — 6 levels (Instrucción Maestra §03) ──────────────────
// All sizes are relative to dominantBase (= piece.width * DOMINANT_RATIO).
const DOMINANT_RATIO = 0.074; // 80px on 1080px canvas

interface Level {
  scaleFactor:  number;  // relative to dominantBase
  fontWeight:   number;  // 300 / 400 / 500 / 600 / 700 / 900
  color:        string;
  opacity:      number;  // 0–1
  trackingPx:   number;  // letter-spacing in px (at full canvas resolution)
  leadingMult:  number;  // line-height multiplier
}

// prettier-ignore
const LEVELS: Level[] = [
  // L1 — Dominante:  100 % · ExtraBold · #F2C84B · tracking −0.5 · leading 0.92
  { scaleFactor: 1.00, fontWeight: 900, color: P.yellow,    opacity: 1.00, trackingPx: -0.5, leadingMult: 0.92 },
  // L2 — Secundario:  72 % · Bold      · #F5F0E8 · tracking +1.0 · leading 1.05
  { scaleFactor: 0.72, fontWeight: 700, color: P.cream,     opacity: 1.00, trackingPx:  1.0, leadingMult: 1.05 },
  // L3 — Terciario:   60 % · Medium    · #F5F0E8 · tracking +1.2 · leading 1.05
  { scaleFactor: 0.60, fontWeight: 500, color: P.cream,     opacity: 1.00, trackingPx:  1.2, leadingMult: 1.05 },
  // L4 — Subtítulo:   52 % · Regular   · #CCCCCC · tracking +1.5 · leading 1.05 · opacity 0.90
  { scaleFactor: 0.52, fontWeight: 400, color: P.grayLight, opacity: 0.90, trackingPx:  1.5, leadingMult: 1.05 },
  // L5 — CTA:         45 % · Medium    · #F5F0E8 · tracking +2.5 · leading 1.05 · opacity 0.90
  { scaleFactor: 0.45, fontWeight: 500, color: P.cream,     opacity: 0.90, trackingPx:  2.5, leadingMult: 1.05 },
  // L6 — Firma/meta:  38 % · Light     · #888888 · tracking +3.5 · leading 1.10 · opacity 0.85
  { scaleFactor: 0.38, fontWeight: 300, color: P.signature, opacity: 0.85, trackingPx:  3.5, leadingMult: 1.10 },
];

// ─── Group Y-anchors — from Instrucción Maestra §04-D ────────────────────────
// Defined as a fraction of canvas height so they scale with any format.
// Based on imagen01 (1080×1080) and imagen02 (1080×1350) spec coords.
interface YAnchors {
  header:    number; // G1 Encabezado / metadatos
  content:   number; // G2 Titular principal (dominant Y-start)
  subtitle:  number; // G3 Subtítulo + CTA
  footer:    number; // G4 Logos + firma
}

function getAnchors(H: number): YAnchors {
  // imagen01: header 140, content 420, subtitle 720, footer 940  (all /1080)
  // imagen02: header 170, content 470, subtitle 800, footer 1100 (all /1350)
  // For 9:16 (1080×1920): scale similarly
  const base = H <= 1080 ? 1080 : H <= 1350 ? 1350 : 1920;
  const anchors1080 = { header: 140, content: 420, subtitle: 720, footer: 940 };
  const anchors1350 = { header: 170, content: 470, subtitle: 800, footer: 1100 };
  const anchors1920 = { header: 280, content: 680, subtitle: 1150, footer: 1600 };
  const src = base === 1080 ? anchors1080 : base === 1350 ? anchors1350 : anchors1920;
  const ratio = H / base;
  return {
    header:   Math.round(src.header   * ratio),
    content:  Math.round(src.content  * ratio),
    subtitle: Math.round(src.subtitle * ratio),
    footer:   Math.round(src.footer   * ratio),
  };
}

// ─── Safe Zones (Instrucción Maestra §01-C) ───────────────────────────────────
interface SafeZone {
  xMin: number; xMax: number;
  yMin: number; yMax: number;
  textXMax: number; // left half (text never enters host zone)
}

function getSafeZone(W: number, H: number): SafeZone {
  const xMin = Math.round(W * 0.083);        // 90px on 1080px
  const xMax = W - xMin;
  const yMin = H <= 1080 ? Math.round(H * 0.083)     // 90px
             : H <= 1350 ? Math.round(H * 0.089)     // 120px
             : Math.round(H * 0.130);                 // 250px (9:16)
  const yMax = H - yMin;
  const textXMax = Math.round(W * 0.50);     // left 50 % — host lives on the right
  return { xMin, xMax, yMin, yMax, textXMax };
}

// ─── Gestalt Spacing Constants ────────────────────────────────────────────────
const GAP_BETWEEN_GROUPS  = 40; // px — Gestalt Proximity: min separation between groups
const GAP_WITHIN_GROUP    = 12; // px — Gestalt Proximity: max separation within a group
const BREATHING_BEFORE_DOMINANT = 24; // px of extra air before the dominant line

// ─── Line Classification ─────────────────────────────────────────────────────
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

// ─── Group Parsing ────────────────────────────────────────────────────────────
type GroupRole = "header" | "content" | "cta_block" | "footer";
interface LineGroup { role: GroupRole; lines: string[] }

function parseGroups(resolvedLines: string[]): LineGroup[] {
  // Split into blocks separated by empty lines
  const blocks: string[][] = [];
  let cur: string[] = [];
  for (const l of resolvedLines) {
    if (!l.trim()) { if (cur.length) { blocks.push(cur); cur = []; } }
    else cur.push(l);
  }
  if (cur.length) blocks.push(cur);

  return blocks.map((block): LineGroup => {
    const firstRole = classifyLine(block[0]);
    if (firstRole === "meta_top") return { role: "header", lines: block };

    const roles = block.map(classifyLine);
    const hasCTA       = roles.some(r => r === "cta");
    const hasContent   = roles.some(r => r === "content");
    const hasFooterOnly = roles.every(r => ["episode","handle","signature","empty"].includes(r));

    if (hasFooterOnly) return { role: "footer", lines: block };
    if (hasCTA && !hasContent) return { role: "cta_block", lines: block };
    return { role: "content", lines: block };
  });
}

// ─── Canvas Text Helpers ──────────────────────────────────────────────────────
function applyLevel(ctx: CanvasRenderingContext2D, lv: Level, basePx: number): void {
  const sizePx = Math.round(basePx * lv.scaleFactor);
  ctx.font         = `${lv.fontWeight} ${sizePx}px Inter,"Helvetica Neue",Arial,sans-serif`;
  ctx.globalAlpha  = lv.opacity;
  ctx.fillStyle    = lv.color;
  // letterSpacing: Chrome 99+, Firefox 101+, Safari 17+
  (ctx as unknown as { letterSpacing: string }).letterSpacing = `${lv.trackingPx}px`;
}

/** Word-wraps text within maxWidth, draws it, returns number of lines rendered. */
function fillWrapped(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
): number {
  const words = text.split(" ");
  let line = "";
  let rows = 0;
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && line) {
      ctx.fillText(line, x, y + rows * lineHeight);
      line = word;
      rows++;
    } else {
      line = candidate;
    }
  }
  if (line) { ctx.fillText(line, x, y + rows * lineHeight); rows++; }
  return rows;
}

// ─── Main Text Renderer ───────────────────────────────────────────────────────
function renderAMTMEText(
  ctx: CanvasRenderingContext2D,
  copyLines: string[],
  W: number,
  H: number,
  epNum: string,
): void {
  const safe    = getSafeZone(W, H);
  const anchors = getAnchors(H);
  const baseDOM = Math.round(W * DOMINANT_RATIO); // dominant font size in px

  // Resolve episode number placeholder
  const resolved = copyLines.map(l => l.replace(/XX/gi, epNum.padStart(2, "0")));
  const groups   = parseGroups(resolved);

  ctx.textAlign    = "left";
  ctx.textBaseline = "alphabetic";

  // ── G1: Header (metadatos top) ─────────────────────────────────────────────
  const headerGroup = groups.find(g => g.role === "header");
  if (headerGroup) {
    applyLevel(ctx, LEVELS[5], baseDOM); // L6 firma
    let y = anchors.header;
    for (const line of headerGroup.lines) {
      ctx.fillText(line.toUpperCase(), safe.xMin, y);
      y += Math.round(baseDOM * LEVELS[5].scaleFactor * LEVELS[5].leadingMult) + GAP_WITHIN_GROUP;
    }
  }

  // ── G2: Main content (dominant + secondary + tertiary) ────────────────────
  const contentGroup = groups.find(g => g.role === "content");
  if (contentGroup) {
    const contentLines = contentGroup.lines.filter(l => l.trim());
    let y = anchors.content;

    contentLines.forEach((line, idx) => {
      const levelIdx = Math.min(idx, 2); // L1, L2, or L3 (max 3 content levels)
      const lv       = LEVELS[levelIdx];
      const sizePx   = Math.round(baseDOM * lv.scaleFactor);
      const lineH    = Math.round(sizePx * lv.leadingMult);

      applyLevel(ctx, lv, baseDOM);

      if (idx === 0) {
        // Dominant — breathing space before it
        y += BREATHING_BEFORE_DOMINANT;
      }

      const rows = fillWrapped(
        ctx,
        line.toUpperCase(),
        safe.xMin,
        y,
        safe.textXMax - safe.xMin,
        lineH,
      );

      y += rows * lineH + (idx === 0
        ? GAP_BETWEEN_GROUPS          // larger gap after dominant (Gestalt: dominant is isolated)
        : GAP_WITHIN_GROUP);          // tight gap between secondary/tertiary
    });
  }

  // ── G3: CTA / Subtitle block ───────────────────────────────────────────────
  const ctaGroup = groups.find(g => g.role === "cta_block");
  if (ctaGroup) {
    let y = anchors.subtitle;
    const ctaLines = ctaGroup.lines.filter(l => l.trim());
    ctaLines.forEach((line, idx) => {
      const role = classifyLine(line);
      const lv   = role === "cta" ? LEVELS[4]  // L5
                 : role === "episode" ? LEVELS[5]  // L6
                 : LEVELS[3];                       // L4 subtitle
      const sizePx = Math.round(baseDOM * lv.scaleFactor);
      applyLevel(ctx, lv, baseDOM);
      ctx.fillText(line.toUpperCase(), safe.xMin, y);
      y += Math.round(sizePx * lv.leadingMult) + (idx === 0 ? GAP_WITHIN_GROUP : GAP_WITHIN_GROUP / 2);
    });
  }

  // ── G4: Footer (episode + handle + signature) ─────────────────────────────
  const footerGroup = groups.find(g => g.role === "footer");
  if (footerGroup) {
    applyLevel(ctx, LEVELS[5], baseDOM); // L6 for all footer elements
    const footerLines = footerGroup.lines.filter(l => l.trim());
    const l6sizePx    = Math.round(baseDOM * LEVELS[5].scaleFactor);
    const totalH      = footerLines.length * Math.round(l6sizePx * LEVELS[5].leadingMult);
    // Pin footer so last line sits at safe.yMax
    let y = anchors.footer;
    // If the anchor would push content past yMax, clamp it
    if (y + totalH > safe.yMax) y = safe.yMax - totalH;

    for (const line of footerLines) {
      const text = line.startsWith("@") ? line : line.toUpperCase();
      ctx.fillText(text, safe.xMin, y);
      y += Math.round(l6sizePx * LEVELS[5].leadingMult) + GAP_WITHIN_GROUP / 2;
    }
  }

  // Reset opacity
  ctx.globalAlpha = 1;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Fetches `baseImageUrl`, draws it on an off-screen canvas, overlays
 * AMTME-branded copy text (safe zones + 6-level hierarchy + Gestalt),
 * and returns the composited PNG as a data URL.
 *
 * On any error (CORS, network, canvas) returns the original `baseImageUrl`
 * unchanged so the UI always has something to display.
 */
export async function buildCompositeImage(
  baseImageUrl: string,
  copyLines: string[],
  piece: VisualPiece,
  episodeNumber: string,
): Promise<string> {
  try {
    // Fetch as blob to avoid CORS tainting of canvas.toDataURL
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

      // Draw base image (AI-generated background + host photo)
      const img = new Image();
      await new Promise<void>((res, rej) => {
        img.onload  = () => res();
        img.onerror = () => rej(new Error("img load failed"));
        img.src     = objectUrl;
      });
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Overlay AMTME text
      renderAMTMEText(ctx, copyLines, piece.width, piece.height, episodeNumber);

      return canvas.toDataURL("image/png");
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  } catch {
    // Graceful fallback — show original image without overlay
    return baseImageUrl;
  }
}
