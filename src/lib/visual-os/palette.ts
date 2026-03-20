/**
 * AMTME Visual OS — Brand palette & validation helpers
 * Instrucción Maestra §02 — Paleta única permitida
 */

export const VOSPalette = {
  ink:              "#282828",   // Negro editorial (NOT pure black)
  paper:            "#F9F6EF",   // Fondo crema (NOT pure white)
  cobalt:           "#193497",   // Azul primario
  highlighterGreen: "#EAFF00",   // Microacento (1 elemento máx por pieza)
} as const;

export const PROHIBITED_COLORS = new Set([
  "#1400FF",   // Cobalt antiguo
  "#000000",   // Negro puro (usar INK)
  "#FFFFFF",   // Blanco puro (usar PAPER)
  "#1a1ae6",   // Versión anterior cobalt
  "#1212a0",   // Versión anterior cobalt oscuro
]);

/** All allowed hex values (case-insensitive). */
export const ALLOWED_PALETTE = new Set(
  Object.values(VOSPalette).map(h => h.toLowerCase()),
);

/** Check whether a hex color is inside the brand palette. */
export function isAllowedColor(hex: string): boolean {
  return ALLOWED_PALETTE.has(hex.toLowerCase());
}

/** Check whether a hex color is explicitly prohibited. */
export function isProhibitedColor(hex: string): boolean {
  return PROHIBITED_COLORS.has(hex.toUpperCase())
    || PROHIBITED_COLORS.has(hex.toLowerCase());
}

/** Filename convention: AMTME_EpXX_PiezaXX_vF.png */
export function buildFileName(
  episodeNumber: string,
  pieceCode:     string,
  ext:           "png" | "jpg" | "json" = "png",
): string {
  const ep  = episodeNumber.padStart(2, "0");
  const num = pieceCode.replace("P", "").padStart(2, "0");
  return `AMTME_Ep${ep}_Pieza${num}_vF.${ext}`;
}

/** AMTME brand effects whitelist */
export const ALLOWED_EFFECTS = [
  "grain_editorial",
  "solid_blocks",
  "thin_rules",
  "underlines",
  "clean_boxes",
] as const;

export const PROHIBITED_EFFECTS = [
  "glow",
  "dramatic_shadows",
  "3d",
  "bevels",
  "stickers",
  "loud_gradients",
  "cheap_motivational",
] as const;

/** Typography constraints */
export const TYPOGRAPHY_RULES = {
  allowedFamilies: ["Inter", "Neue Haas Grotesk", "Aktiv Grotesk", "Helvetica Neue"],
  allowedWeights:  [900, 700, 400] as const,
  maxStyles:       2,
  maxHierarchies:  3,
  prohibitItalic:  true,
  prohibitSerif:   true,
  prohibitDecorative: true,
} as const;

/** Piece status color map for UI */
export const STATUS_COLORS = {
  borrador:    "bg-zinc-500/20 text-zinc-400",
  en_revision: "bg-amber-500/20 text-amber-400",
  corregir:    "bg-red-500/20 text-red-400",
  aprobado:    "bg-emerald-500/20 text-emerald-400",
  exportado:   "bg-blue-500/20 text-blue-400",
  publicado:   "bg-violet-500/20 text-violet-400",
} as const;

export const VISUAL_STATUS_COLORS = {
  sin_iniciar:  "text-zinc-500",
  en_produccion:"text-amber-500",
  en_revision:  "text-blue-500",
  completado:   "text-emerald-500",
} as const;
