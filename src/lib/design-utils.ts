/**
 * AMTME Design System Utilities
 * Color tokens, contrast ratios, palette management
 * Based on Instrucción Maestra §05 − Sistema de Color
 */

// ─── Paleta Principal (P1) ──────────────────────────────────────────────────
export const COLOR_TOKENS = {
  // Brand colors
  bg: "#020B18", // Azul noche − 60% del canvas
  accent: "#E4F542", // Lima − 15% del canvas (keyword + CTA + subrayado)
  text: "#F0EEE6", // Blanco cálido − 20% del canvas
  surface: "#071428", // Azul marino − cards / surfaces
  surface2: "#0D2545", // Azul medio − hovers
  accentDeep: "#B8C82E", // Lima profundo − subrayado fondo claro
  
  // Contraste WCAG
  contrastLimaOnAzul: 16.8, // AAA ✓
  contrastTextoOnAzul: 15.2, // AAA ✓
  contrastAzulOnLima: 16.8, // AAA ✓
} as const;

// ─── Paletas del Sistema (§06) ──────────────────────────────────────────────
export interface Palette {
  id: number;
  name: string;
  bg: string;
  accent: string;
  text: string;
  surface: string;
  surface2: string;
  accentDeep: string;
}

export const PALETTE_SYSTEM: Record<number, Palette> = {
  1: {
    id: 1,
    name: "Principal − Azul noche + Lima",
    bg: "#020B18",
    accent: "#E4F542",
    text: "#F0EEE6",
    surface: "#071428",
    surface2: "#0D2545",
    accentDeep: "#B8C82E",
  },
  2: {
    id: 2,
    name: "Naranja − Emocional urgente",
    bg: "#0F0500",
    accent: "#FF6B35",
    text: "#FFF0E8",
    surface: "#1A0A00",
    surface2: "#2D1500",
    accentDeep: "#CC5520",
  },
  3: {
    id: 3,
    name: "Invertida − Quotes íntimas",
    bg: "#F0EEE6",
    accent: "#B8C82E",
    text: "#020B18",
    surface: "#E5E2D8",
    surface2: "#D8D4C8",
    accentDeep: "#8A9620",
  },
  4: {
    id: 4,
    name: "Negro absoluto − Minimalista",
    bg: "#000510",
    accent: "#E4F542",
    text: "#FFFFFF",
    surface: "#020B18",
    surface2: "#071428",
    accentDeep: "#B8C82E",
  },
};

// ─── WCAG Contrast Ratio Calculator ──────────────────────────────────────────
function getLuminance(hex: string): number {
  const rgb = parseInt(hex.slice(1), 16);
  const r = ((rgb >> 16) & 0xff) / 255;
  const g = ((rgb >> 8) & 0xff) / 255;
  const b = (rgb & 0xff) / 255;

  const [rs, gs, bs] = [r, g, b].map((c) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  );

  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

export function calculateContrastRatio(foreground: string, background: string): number {
  const l1 = getLuminance(foreground);
  const l2 = getLuminance(background);
  const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  return Math.round(ratio * 100) / 100;
}

export function meetsWCAG(ratio: number, level: "AA" | "AAA" = "AA"): boolean {
  return level === "AA" ? ratio >= 4.5 : ratio >= 7;
}

export interface ContrastValidation {
  accentBg: number;
  textBg: number;
  accentTooLow: boolean; // < 4.5:1 → naranja warning
  textIllible: boolean; // < 4.5:1 → rojo warning
}

export function validatePaletteContrast(
  bg: string,
  accent: string,
  textColor: string
): ContrastValidation {
  const accentBgRatio = calculateContrastRatio(accent, bg);
  const textBgRatio = calculateContrastRatio(textColor, bg);

  return {
    accentBg: accentBgRatio,
    textBg: textBgRatio,
    accentTooLow: accentBgRatio < 4.5,
    textIllible: textBgRatio < 4.5,
  };
}

// ─── Naming Convention (§14) ────────────────────────────────────────────────
export function generateAssetFilename(
  season: number,
  episode: number,
  pieceNumber: number,
  version = 1
): string {
  return `AMTME-S${season}-EP${episode}-P${String(pieceNumber).padStart(2, "0")}-V${version}.png`;
}

// ─── Paleta Free (P5) − Computar surface/surface2/accent-deep ────────────────
export function computeFreePalette(bg: string, accent: string, textColor: string): Palette {
  // Surface: 20% más luminoso que bg
  // Surface2: 40% más luminoso que bg
  // Accent-deep: versión oscura del accent

  const darkenColor = (hex: string, percent: number): string => {
    const rgb = parseInt(hex.slice(1), 16);
    const r = Math.max(0, Math.min(255, ((rgb >> 16) & 0xff) * (1 - percent / 100)));
    const g = Math.max(0, Math.min(255, ((rgb >> 8) & 0xff) * (1 - percent / 100)));
    const b = Math.max(0, Math.min(255, (rgb & 0xff) * (1 - percent / 100)));
    return `#${[r, g, b].map(x => Math.round(x).toString(16).padStart(2, "0")).join("").toUpperCase()}`;
  };

  const lightenColor = (hex: string, percent: number): string => {
    const rgb = parseInt(hex.slice(1), 16);
    const r = Math.max(0, Math.min(255, ((rgb >> 16) & 0xff) + (255 - ((rgb >> 16) & 0xff)) * (percent / 100)));
    const g = Math.max(0, Math.min(255, ((rgb >> 8) & 0xff) + (255 - ((rgb >> 8) & 0xff)) * (percent / 100)));
    const b = Math.max(0, Math.min(255, (rgb & 0xff) + (255 - (rgb & 0xff)) * (percent / 100)));
    return `#${[r, g, b].map(x => Math.round(x).toString(16).padStart(2, "0")).join("").toUpperCase()}`;
  };

  return {
    id: 5,
    name: "Libre − Paleta personalizada",
    bg,
    accent,
    text: textColor,
    surface: lightenColor(bg, 15),
    surface2: lightenColor(bg, 25),
    accentDeep: darkenColor(accent, 35),
  };
}

// ─── Sugerir imagen del host (§08) ──────────────────────────────────────────
export function suggestHostImageBasedOnTone(
  dominantTone: string,
  intensityLevel: string
): "REF_1" | "REF_2" {
  const intimateTones = [
    "melancólico",
    "reflexivo",
    "íntimo",
    "vulnerable",
    "nostálgico",
  ];
  const directTones = [
    "confrontacional",
    "directo",
    "urgente",
    "empoderado",
    "claro",
  ];

  const toneLower = (dominantTone || "").toLowerCase();
  if (intimateTones.some(t => toneLower.includes(t))) return "REF_1";
  if (directTones.some(t => toneLower.includes(t))) return "REF_2";
  if ((intensityLevel || "").toLowerCase() === "alto") return "REF_2";
  return "REF_1"; // Default: íntimo
}

// ─── Sugerir paleta según tono emocional (§03, §10) ───────────────────────────
export function suggestPaletteBasedOnTone(
  dominantTone: string,
  intensityLevel: string
): number {
  const toneLower = (dominantTone || "").toLowerCase();
  const intLower = (intensityLevel || "").toLowerCase();

  // P2 Naranja − alta intensidad emocional: duelo, ruptura, crisis
  if (["duelo", "ruptura", "crisis", "rabia", "urgente"].some(t => toneLower.includes(t))) {
    return 2;
  }

  // P3 Invertida − quotes emocionales profundas, introspectivo
  if (
    ["vulnerable", "nostálgico", "melancólico", "íntimo"].some(t => toneLower.includes(t)) &&
    intLower === "bajo"
  ) {
    return 3;
  }

  // P4 Negro − máximo impacto
  if (intLower === "alto" && ["confrontacional", "empoderado"].some(t => toneLower.includes(t))) {
    return 4;
  }

  // P1 Principal − default
  return 1;
}

// Backward compatibility exports used by legacy pages/components
export function calculateContrast(foreground: string, background: string): number {
  return calculateContrastRatio(foreground, background);
}

export function determineBackground(bgColor: string): "light" | "dark" {
  return calculateContrastRatio("#000000", bgColor) > 10 ? "light" : "dark";
}

export function generateFilename(
  season: number,
  episode: number,
  pieceNumber: number,
  version = 1
): string {
  return generateAssetFilename(season, episode, pieceNumber, version);
}
