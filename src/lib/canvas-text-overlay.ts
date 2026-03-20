/**
 * AMTME Canvas Text Overlay — Instrucción Maestra v1
 * ────────────────────────────────────────────────────
 * Renders every piece image entirely in-browser:
 *   1. Solid background  (#1A1AE6 cobalt | #0A0A0A negro)
 *   2. Host photo        (from Supabase Storage, right half)
 *   3. Gradient blend    (background fades into host edge)
 *   4. Variable content  (dominant L1 · secondary L2 · tertiary L3 · CTA L5)
 *   5. Fixed brand block (§06 — PODCAST · Ep. · Spotify · Apple · host name)
 *
 * Text is NEVER rendered by AI — canvas guarantees 100% accuracy.
 */

import type { VisualPiece } from "@/lib/visual-templates";

// ─── AMTME Official Palette §02 ──────────────────────────────────────────────
const P = {
  cobalt:    "#1A1AE6",   // Color dominante / fondo feed
  negro:     "#0A0A0A",   // Fondo introspectivo / Cover
  yellow:    "#F2C84B",   // L1 Dominante emocional
  cream:     "#F5F0E8",   // L2 Secundario · L3 Terciario · L5 CTA
  grayLight: "#CCCCCC",   // L4 Subtítulo
  grayMid:   "#888888",   // L6 Firma · metadatos
  white:     "#FFFFFF",
  spotify:   "#1DB954",
  apple:     "#FC3C44",
} as const;

// ─── 6-Level Typographic Hierarchy §03-A ─────────────────────────────────────
// Base (dominant) = 8.5% of canvas width → ~92px on 1080px
const DOM_RATIO = 0.085;

interface Level {
  scale:      number;   // relative to dominant base (1.0 = 100%)
  weight:     number;   // CSS font-weight
  color:      string;
  opacity:    number;
  tracking:   number;   // letter-spacing in px (at full resolution)
  leading:    number;   // line-height multiplier
}

const LEVELS: Level[] = [
  // L1 — Dominante  100% · 900 · #F2C84B · tracking –0.5 · leading 0.90
  { scale: 1.00, weight: 900, color: P.yellow,    opacity: 1.00, tracking: -0.5, leading: 0.90 },
  // L2 — Secundario  72% · 700 · #F5F0E8 · tracking +1.0 · leading 1.05
  { scale: 0.72, weight: 700, color: P.cream,     opacity: 1.00, tracking:  1.0, leading: 1.05 },
  // L3 — Terciario   60% · 500 · #F5F0E8 · tracking +1.2 · leading 1.05
  { scale: 0.60, weight: 500, color: P.cream,     opacity: 1.00, tracking:  1.2, leading: 1.05 },
  // L4 — Subtítulo   52% · 400 · #CCCCCC · tracking +1.5 · op 0.90
  { scale: 0.52, weight: 400, color: P.grayLight, opacity: 0.90, tracking:  1.5, leading: 1.05 },
  // L5 — CTA         45% · 500 · #F5F0E8 · tracking +2.5 · op 0.90
  { scale: 0.45, weight: 500, color: P.cream,     opacity: 0.90, tracking:  2.5, leading: 1.05 },
  // L6 — Firma       38% · 400 · #888888 · tracking +3.5 · op 0.85
  { scale: 0.38, weight: 400, color: P.grayMid,   opacity: 0.85, tracking:  3.5, leading: 1.10 },
];

// ─── Y-Anchors §04-D ─────────────────────────────────────────────────────────
// Absolute pixel values from the spec (1080×1350 reference).
// Scaled proportionally for other canvas heights.
function getAnchors(H: number) {
  // Reference: 1080×1350 spec (all values in px)
  const ref = { H: 1350, header: 170, secondary: 340, dominant: 480, cta: 820, footer: 1100 };
  const r   = H / ref.H;
  return {
    header:    Math.round(ref.header    * r),  // G1 metadatos
    secondary: Math.round(ref.secondary * r),  // L2 above dominant (§04-D)
    dominant:  Math.round(ref.dominant  * r),  // L1 titular
    cta:       Math.round(ref.cta       * r),  // G3 CTA
    footer:    Math.round(ref.footer    * r),  // G4 logos + firma
  };
}

// ─── Safe Zones §01-C ────────────────────────────────────────────────────────
function getSafeZone(W: number, H: number) {
  const xMargin = Math.round(W * 0.083);             // 90px on 1080px
  const yMargin = H <= 1080 ? Math.round(H * 0.083)
                : H <= 1350 ? Math.round(H * 0.089)
                :             Math.round(H * 0.130);
  return {
    x:        xMargin,
    y:        yMargin,
    maxX:     W - xMargin,
    maxY:     H - yMargin,
    textMaxX: Math.round(W * 0.50),               // text zone = left 50%
  };
}

// ─── Gestalt spacing §04-B ────────────────────────────────────────────────────
const G = {
  groupGap:    44,   // min px between groups (Gestalt Proximity)
  intraGap:    10,   // px within a group
  airBefore:   20,   // breathing before dominant
  airAfterDom: 36,   // extra gap after dominant (dominant isolation)
} as const;

// ─── Line utilities ───────────────────────────────────────────────────────────
/** Returns true if a line is a template placeholder like "[TERCIARIO — CREAM]". */
const isPlaceholder = (l: string) => /^\[.+\]$/.test(l.trim());

/** Returns true if a line is the fixed podcast name (used in footer, not header). */
const isPodcastName = (l: string) =>
  /^A\s+M[IÍ]\s+TAMPOCO\s+ME\s+EXPLICARON$/i.test(l.trim());

type LineRole = "meta_top" | "content" | "cta" | "episode" | "handle" | "signature" | "empty";

function classifyLine(raw: string): LineRole {
  const u = raw.trim().toUpperCase();
  if (!u || isPlaceholder(raw)) return "empty";
  if (u.startsWith("@"))                                return "handle";
  if (/^(CHRISTIAN VILLAMAR|SPOTIFY|APPLE PODCAST)/.test(u)) return "signature";
  if (/^EP[\s.]/.test(u) || /^\d{1,2}\s*[—-]/.test(u) || /^\d{2}$/.test(u)) return "episode";
  if (/^(NUEVO EPISODIO|EPISODIO NUEVO|PODCAST)/.test(u))    return "meta_top";
  if (/^(ESC[ÚU]CHALO|GU[ÁA]RDALO|COMP[ÁA]RTELO|ESCUCHA EL|S[IÍ]GUENOS|NUEVO EP)/.test(u)) return "cta";
  // "A MÍ TAMPOCO ME EXPLICARON" is a signature/footer line, NOT a header trigger
  if (isPodcastName(raw))                                    return "signature";
  return "content";
}

type GroupRole = "header" | "content" | "cta_block" | "footer";
interface Group { role: GroupRole; lines: string[] }

function parseGroups(lines: string[]): Group[] {
  // Split into non-empty blocks separated by blank/placeholder lines
  const blocks: string[][] = [];
  let cur: string[] = [];
  for (const l of lines) {
    if (!l.trim() || isPlaceholder(l)) {
      if (cur.length) { blocks.push(cur); cur = []; }
    } else {
      cur.push(l);
    }
  }
  if (cur.length) blocks.push(cur);

  const FOOTER_ROLES: LineRole[] = ["episode", "handle", "signature", "empty", "meta_top"];
  const CTA_ROLES:    LineRole[] = ["cta", "episode", "handle", "signature"];

  return blocks.map((block): Group => {
    const roles = block.map(classifyLine);

    // Header: first line is explicitly a meta_top trigger (NUEVO EPISODIO / PODCAST)
    if (roles[0] === "meta_top") return { role: "header", lines: block };

    // Footer: all lines are non-content (episode, handle, signature, podcast name)
    if (roles.every(r => FOOTER_ROLES.includes(r))) return { role: "footer", lines: block };

    // CTA block: has a CTA line but no raw content lines
    if (roles.some(r => r === "cta") && !roles.some(r => r === "content"))
      return { role: "cta_block", lines: block };

    // Mixed CTA+footer (e.g. "ESCÚCHALO HOY · EP. 29 · @handle")
    if (roles.every(r => CTA_ROLES.includes(r))) return { role: "cta_block", lines: block };

    // Default: content block (dominant + secondary + tertiary)
    return { role: "content", lines: block };
  });
}

// ─── Canvas helpers ───────────────────────────────────────────────────────────
function setLevel(ctx: CanvasRenderingContext2D, lv: Level, basePx: number) {
  const sz = Math.round(basePx * lv.scale);
  ctx.font        = `${lv.weight} ${sz}px Inter,"Helvetica Neue",Arial,sans-serif`;
  ctx.fillStyle   = lv.color;
  ctx.globalAlpha = lv.opacity;
  (ctx as unknown as { letterSpacing: string }).letterSpacing = `${lv.tracking}px`;
}

/** Word-wraps text, returns line count rendered. */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string, x: number, y: number, maxW: number, lineH: number,
): number {
  const words = text.split(" ");
  let line = ""; let rows = 0;
  for (const w of words) {
    const candidate = line ? `${line} ${w}` : w;
    if (ctx.measureText(candidate).width > maxW && line) {
      ctx.fillText(line, x, y + rows * lineH); line = w; rows++;
    } else { line = candidate; }
  }
  if (line) { ctx.fillText(line, x, y + rows * lineH); rows++; }
  return rows;
}

// ─── Font preloading ──────────────────────────────────────────────────────────
async function preloadFonts(basePx: number) {
  if (typeof document === "undefined") return;
  try {
    const sizes = [
      Math.round(basePx * 1.00),  // L1
      Math.round(basePx * 0.72),  // L2
      Math.round(basePx * 0.45),  // L5
      Math.round(basePx * 0.38),  // L6
    ];
    await Promise.allSettled([
      ...sizes.map(s => document.fonts.load(`900 ${s}px Inter`)),
      ...sizes.map(s => document.fonts.load(`700 ${s}px Inter`)),
      ...sizes.map(s => document.fonts.load(`400 ${s}px Inter`)),
    ]);
  } catch { /* non-critical */ }
}

// ─── Platform logo drawers ────────────────────────────────────────────────────
function drawSpotify(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.save(); ctx.globalAlpha = 1;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = P.spotify; ctx.fill();
  ctx.strokeStyle = P.white; ctx.lineCap = "round";
  for (const [yOff, spread] of [[-0.20, 0.60], [0.00, 0.45], [0.18, 0.30]] as [number, number][]) {
    ctx.lineWidth = r * 0.17;
    ctx.beginPath();
    ctx.arc(cx, cy + r * yOff + r * spread * 0.4, r * spread, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
  }
  ctx.restore();
}

function drawApple(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.save(); ctx.globalAlpha = 1;
  const [s, lft, top, cur] = [r * 2, cx - r, cy - r, r * 0.40];
  ctx.beginPath();
  ctx.moveTo(lft + cur, top);
  ctx.lineTo(lft + s - cur, top); ctx.quadraticCurveTo(lft + s, top, lft + s, top + cur);
  ctx.lineTo(lft + s, top + s - cur); ctx.quadraticCurveTo(lft + s, top + s, lft + s - cur, top + s);
  ctx.lineTo(lft + cur, top + s); ctx.quadraticCurveTo(lft, top + s, lft, top + s - cur);
  ctx.lineTo(lft, top + cur); ctx.quadraticCurveTo(lft, top, lft + cur, top);
  ctx.closePath(); ctx.fillStyle = P.apple; ctx.fill();
  ctx.fillStyle = P.white;
  ctx.beginPath(); ctx.arc(cx, cy - r * 0.12, r * 0.28, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = P.white; ctx.lineWidth = r * 0.14; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(cx, cy + r * 0.18); ctx.lineTo(cx, cy + r * 0.50); ctx.stroke();
  ctx.lineWidth = r * 0.12;
  for (const sp of [0.55, 0.40]) {
    ctx.beginPath(); ctx.arc(cx, cy - r * 0.12, r * sp, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
  }
  ctx.restore();
}

// ─── Fixed brand block §06 ────────────────────────────────────────────────────
function renderFixedBlock(
  ctx: CanvasRenderingContext2D, W: number, H: number, epNum: string, basePx: number,
) {
  const safe   = getSafeZone(W, H);
  const anchors = getAnchors(H);
  const lv6    = LEVELS[5];
  const sz6    = Math.round(basePx * lv6.scale);
  const lh6    = Math.round(sz6 * lv6.leading);
  const logoR  = Math.round(sz6 * 0.52);
  const gap    = Math.round(sz6 * 0.42);

  const blockH = lh6 * 4 + G.intraGap * 3;
  let y = Math.max(anchors.footer, safe.maxY - blockH);

  ctx.textAlign    = "left";
  ctx.textBaseline = "alphabetic";

  // Row 1 — PODCAST tag
  ctx.font        = `${lv6.weight} ${sz6}px Inter,"Helvetica Neue",Arial,sans-serif`;
  ctx.globalAlpha = lv6.opacity;
  ctx.fillStyle   = lv6.color;
  (ctx as unknown as { letterSpacing: string }).letterSpacing = "3.5px";
  ctx.fillText("PODCAST", safe.x, y);
  y += lh6 + G.intraGap;

  // Row 2 — Ep. XX — A MÍ TAMPOCO ME EXPLICARON
  ctx.font        = `${lv6.weight} ${sz6}px Inter,"Helvetica Neue",Arial,sans-serif`;
  ctx.globalAlpha = lv6.opacity; ctx.fillStyle = lv6.color;
  (ctx as unknown as { letterSpacing: string }).letterSpacing = "3.5px";
  ctx.fillText(`Ep. ${epNum}  —  A MÍ TAMPOCO ME EXPLICARON`, safe.x, y);
  y += lh6 + G.intraGap;

  // Row 3 — Platform logos
  const labelY = y;
  drawSpotify(ctx, safe.x + logoR, labelY - logoR * 0.75, logoR);
  ctx.font = `${lv6.weight} ${sz6}px Inter,"Helvetica Neue",Arial,sans-serif`;
  ctx.globalAlpha = lv6.opacity; ctx.fillStyle = lv6.color;
  (ctx as unknown as { letterSpacing: string }).letterSpacing = "3.5px";
  ctx.fillText("SPOTIFY", safe.x + logoR * 2 + gap, labelY);
  const spotW = ctx.measureText("SPOTIFY").width;
  const appleX = safe.x + logoR * 2 + gap + spotW + Math.round(sz6 * 1.4);
  drawApple(ctx, appleX + logoR, labelY - logoR * 0.75, logoR);
  ctx.globalAlpha = lv6.opacity; ctx.fillStyle = lv6.color;
  ctx.fillText("APPLE PODCASTS", appleX + logoR * 2 + gap, labelY);
  y += lh6 + G.intraGap;

  // Row 4 — CHRISTIAN VILLAMAR
  ctx.font = `${lv6.weight} ${sz6}px Inter,"Helvetica Neue",Arial,sans-serif`;
  ctx.globalAlpha = 0.85;
  ctx.fillStyle   = lv6.color;
  (ctx as unknown as { letterSpacing: string }).letterSpacing = "3px";
  ctx.fillText("CHRISTIAN VILLAMAR", safe.x, y);
  ctx.globalAlpha = 1;
}

// ─── Variable content renderer ────────────────────────────────────────────────
function renderContent(
  ctx: CanvasRenderingContext2D, copyLines: string[], W: number, H: number,
  epNum: string, basePx: number,
) {
  const safe    = getSafeZone(W, H);
  const anchors = getAnchors(H);
  const textW   = safe.textMaxX - safe.x;

  const resolved = copyLines.map(l =>
    l.replace(/\bXX\b/gi, epNum).replace(/\bEP\.\s*XX\b/gi, `Ep. ${epNum}`)
  );
  const groups = parseGroups(resolved);

  ctx.textAlign    = "left";
  ctx.textBaseline = "alphabetic";

  // ── G1: Header (NUEVO EPISODIO / PODCAST tag from copy) ──────────────────
  const header = groups.find(g => g.role === "header");
  if (header) {
    setLevel(ctx, LEVELS[5], basePx);
    const sz = Math.round(basePx * LEVELS[5].scale);
    let y    = anchors.header;
    for (const line of header.lines) {
      ctx.fillText(line.toUpperCase(), safe.x, y);
      y += Math.round(sz * LEVELS[5].leading) + G.intraGap;
    }
  }

  // ── G2: Content (L1 dominant → L2 secondary → L3 tertiary) ──────────────
  const content = groups.find(g => g.role === "content");
  if (content) {
    const lines = content.lines.filter(l => l.trim() && !isPlaceholder(l));
    let yDom = anchors.dominant;

    lines.forEach((line, idx) => {
      const lvIdx = Math.min(idx, 2);        // cap at L3
      const lv    = LEVELS[lvIdx];
      const sz    = Math.round(basePx * lv.scale);
      const lh    = Math.round(sz * lv.leading);

      setLevel(ctx, lv, basePx);

      if (idx === 0) {
        // Dominant: breathing space before
        yDom += G.airBefore;
        const rows = wrapText(ctx, line.toUpperCase(), safe.x, yDom, textW, lh);
        yDom += rows * lh + G.airAfterDom;
      } else {
        const rows = wrapText(ctx, line.toUpperCase(), safe.x, yDom, textW, lh);
        yDom += rows * lh + G.intraGap;
      }
    });
  }

  // ── G3: CTA block ─────────────────────────────────────────────────────────
  const cta = groups.find(g => g.role === "cta_block");
  if (cta) {
    let y = anchors.cta;
    for (const [i, line] of cta.lines.filter(l => l.trim()).entries()) {
      const role = classifyLine(line);
      const lv   = role === "cta" ? LEVELS[4] : LEVELS[5];
      const sz   = Math.round(basePx * lv.scale);
      setLevel(ctx, lv, basePx);
      ctx.fillText(line.toUpperCase(), safe.x, y);
      y += Math.round(sz * lv.leading) + (i === 0 ? G.intraGap : G.intraGap / 2);
    }
  } else {
    // Default CTA if none in copy
    setLevel(ctx, LEVELS[4], basePx);
    ctx.fillText("ESCÚCHALO HOY", safe.x, anchors.cta);
  }

  ctx.globalAlpha = 1;
}

// ─── Host photo cache (avoid re-fetching on each render) ─────────────────────
const _hostCache: Record<string, Promise<Blob>> = {};

function fetchHostBlob(url: string): Promise<Blob> {
  if (!_hostCache[url]) {
    _hostCache[url] = fetch(url).then(r => {
      if (!r.ok) throw new Error(`Host fetch ${r.status}`);
      return r.blob();
    });
  }
  return _hostCache[url];
}

// ─── Color helpers ────────────────────────────────────────────────────────────
function hexToRgba(hex: string, a: number) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
}

function drawCoverRight(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number, y: number, w: number, h: number,
) {
  const ir = img.naturalWidth / img.naturalHeight;
  const ar = w / h;
  let dw: number, dh: number, dx: number, dy: number;
  if (ir > ar) { dh = h; dw = h * ir; dx = x; dy = y; }
  else         { dw = w; dh = w / ir; dx = x; dy = Math.max(0, (h - dh) * 0.05); }
  ctx.drawImage(img, dx, dy, dw, dh);
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Builds the complete piece image entirely in-browser.
 * No AI required — solid background + host photo + AMTME text layers.
 */
export async function buildLocalComposite(
  piece: VisualPiece,
  copyLines: string[],
  episodeNumber: string,
  supabaseUrl: string,
): Promise<string> {
  const W      = piece.width;
  const H      = piece.height;
  const bgHex  = piece.backgroundVersion === "negro" ? P.negro : P.cobalt;
  const basePx = Math.round(W * DOM_RATIO);

  // Preload fonts before touching canvas
  await preloadFonts(basePx);

  const canvas  = document.createElement("canvas");
  canvas.width  = W; canvas.height = H;
  const ctx     = canvas.getContext("2d");
  if (!ctx) throw new Error("No 2D context");

  // 1. Solid background
  ctx.fillStyle = bgHex;
  ctx.fillRect(0, 0, W, H);

  // 2. Host photo (right 60%)
  try {
    const hostUrl = `${supabaseUrl}/storage/v1/object/public/generated-images/host-${piece.hostReference}.png`;
    const blob    = await fetchHostBlob(hostUrl);
    const objUrl  = URL.createObjectURL(blob);
    try {
      const img   = new Image();
      await new Promise<void>((res, rej) => {
        img.onload  = () => res();
        img.onerror = () => rej(new Error("host img"));
        img.src     = objUrl;
      });
      const hx = Math.round(W * 0.38);
      drawCoverRight(ctx, img, hx, 0, W - hx, H);

      // 3. Gradient blend (background → transparent over ~20% of canvas)
      const fadeStart = hx - Math.round(W * 0.04);
      const fadeEnd   = hx + Math.round(W * 0.20);
      const grad      = ctx.createLinearGradient(fadeStart, 0, fadeEnd, 0);
      grad.addColorStop(0, bgHex);
      grad.addColorStop(1, hexToRgba(bgHex, 0));
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, fadeEnd, H);
    } finally {
      URL.revokeObjectURL(objUrl);
    }
  } catch { /* host photo unavailable — solid background + text still renders */ }

  // 4. Variable content
  renderContent(ctx, copyLines, W, H, episodeNumber, basePx);

  // 5. Fixed brand block (always identical across all 15 pieces)
  renderFixedBlock(ctx, W, H, episodeNumber, basePx);

  return canvas.toDataURL("image/png");
}

/**
 * Legacy: composites text on top of an existing remote base image.
 * Used only for old AI-generated images still in DB.
 */
export async function buildCompositeImage(
  baseImageUrl: string,
  copyLines: string[],
  piece: VisualPiece,
  episodeNumber: string,
): Promise<string> {
  // For remote URLs (old AI images), rebuild from scratch using local composite
  // so the brand system is always correctly applied regardless of what's in storage.
  if (!baseImageUrl.startsWith("data:")) {
    try {
      // We don't have supabaseUrl here — extract it from the URL if it's a Supabase URL
      const match = baseImageUrl.match(/^(https:\/\/[^/]+\.supabase\.co)/);
      if (match) {
        return await buildLocalComposite(piece, copyLines, episodeNumber, match[1]);
      }
    } catch { /* fall through to overlay approach */ }
  }

  // data URL or non-Supabase URL → overlay text on top
  try {
    const resp      = await fetch(baseImageUrl);
    if (!resp.ok) throw new Error(`Fetch ${resp.status}`);
    const blob      = await resp.blob();
    const objectUrl = URL.createObjectURL(blob);
    try {
      const canvas  = document.createElement("canvas");
      canvas.width  = piece.width; canvas.height = piece.height;
      const ctx     = canvas.getContext("2d");
      if (!ctx) throw new Error("No 2D context");
      const img     = new Image();
      await new Promise<void>((res, rej) => {
        img.onload = () => res(); img.onerror = () => rej(new Error("img"));
        img.src    = objectUrl;
      });
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const basePx = Math.round(piece.width * DOM_RATIO);
      await preloadFonts(basePx);
      renderContent(ctx, copyLines, piece.width, piece.height, episodeNumber, basePx);
      renderFixedBlock(ctx, piece.width, piece.height, episodeNumber, basePx);
      return canvas.toDataURL("image/png");
    } finally { URL.revokeObjectURL(objectUrl); }
  } catch { return baseImageUrl; }
}
