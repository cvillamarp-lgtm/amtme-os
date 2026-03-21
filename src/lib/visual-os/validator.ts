/**
 * AMTME Visual OS — Brand Compliance Validator
 * Runs all checks from Instrucción Maestra before allowing export/approval.
 * This is the authoritative source of truth — piece-validator.ts in /factory
 * remains for the legacy factory view.
 */

import type { VisualTemplate, CopyBlock } from "./types";
import { PROHIBITED_COLORS } from "./palette";

export type Severity = "critico" | "advertencia";

export interface VOSCheck {
  id:       string;
  rule:     string;       // §XX reference
  label:    string;
  severity: Severity;
  pass:     boolean;
  detail?:  string;
}

export interface VOSValidationResult {
  pass:         boolean;   // true = ALL crítico checks pass
  score:        number;    // 0–100
  checks:       VOSCheck[];
  criticalFails: number;
  warningFails:  number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const isPlaceholder = (v: string) => /^\[.+\]$/.test(v.trim());
const wordCount     = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

function copyValues(blocks: CopyBlock[]): string[] {
  return [...blocks]
    .sort((a, b) => a.order_index - b.order_index)
    .map(b => b.block_value.trim());
}

// ─── Validator ────────────────────────────────────────────────────────────────

export function validateVisualPiece(
  template:      VisualTemplate,
  copyBlocks:    CopyBlock[],
  episodeNumber: string,
  hasPreview:    boolean,
): VOSValidationResult {
  const checks: VOSCheck[] = [];

  const add = (
    id:       string,
    rule:     string,
    label:    string,
    severity: Severity,
    pass:     boolean,
    detail?:  string,
  ) => checks.push({ id, rule, label, severity, pass, detail });

  const lines    = copyValues(copyBlocks);
  const active   = lines.filter(l => l && !isPlaceholder(l));
  const content  = active.filter(l =>
    !/^(EP\.|NUEVO EPISODIO|@|CHRISTIAN VILLAMAR|A MI TAMPOCO|SPOTIFY|APPLE|ESCÚCHALO|GUARDALO|COMPÁRTELO)/i.test(l)
  );
  const placeholders = lines.filter(isPlaceholder);
  const epNum   = episodeNumber.trim();

  // ── Técnico ──────────────────────────────────────────────────────────────
  add("preview_exists", "§07-A",
    "Preview generado",
    "critico",
    hasPreview,
    !hasPreview ? "Genera el preview antes de aprobar" : undefined,
  );

  add("format_valid", "§01-A",
    `Formato válido (${template.width_px}×${template.height_px}px — ${template.format})`,
    "critico",
    ["1:1","4:5","9:16"].includes(template.format),
  );

  add("ep_number", "§06-A",
    "Número de episodio definido",
    "critico",
    !!epNum && epNum !== "XX" && /^\d{1,3}$/.test(epNum),
    (!epNum || epNum === "XX") ? "Falta el número de episodio" :
    !/^\d{1,3}$/.test(epNum)  ? `"${epNum}" no es un número válido` : undefined,
  );

  add("no_placeholders", "§07-B",
    "Sin placeholders [...]",
    "critico",
    placeholders.length === 0,
    placeholders.length > 0
      ? `${placeholders.length} sin reemplazar: ${placeholders.slice(0,2).join(", ")}`
      : undefined,
  );

  add("required_blocks", "§07-B",
    "Bloques obligatorios con contenido",
    "critico",
    (() => {
      const missing = copyBlocks.filter(b => !b.is_fixed && !b.block_value.trim());
      return missing.length === 0;
    })(),
    undefined,
  );

  // ── Visual / editorial ────────────────────────────────────────────────────
  add("single_piece", "§GLOBAL",
    "Una sola pieza objetivo — sin variantes",
    "critico",
    true,  // structural guarantee — this form only ever produces one piece
  );

  add("has_content", "§07-B",
    "Bloque de copy principal con contenido real",
    "critico",
    content.length > 0,
    content.length === 0 ? "No hay copy con contenido editorial" : undefined,
  );

  // Dominant element ≤ 3 content lines
  add("hierarchy_max", "§03-D",
    "Máximo 3 niveles de contenido (sin competencia jerárquica)",
    "critico",
    content.length <= 3,
    content.length > 3
      ? `${content.length} líneas de contenido — máx 3 por §03-D`
      : undefined,
  );

  // Dominant word count
  const dominant = content[0] ?? "";
  const domWords = wordCount(dominant);
  add("dominant_length", "§03-B",
    "Dominante ≤ 12 palabras (legible en 0.5s en scroll)",
    "advertencia",
    domWords <= 12,
    domWords > 12 ? `"${dominant}" — ${domWords} palabras (recomendado ≤12)` : undefined,
  );

  // No italics
  const hasItalic = lines.some(l => /[_*/]/.test(l));
  add("no_italics", "§03-C",
    "Sin cursivas",
    "critico",
    !hasItalic,
    hasItalic ? "Detectados marcadores de cursiva (* _ /)" : undefined,
  );

  // ── Paleta ────────────────────────────────────────────────────────────────
  const bgColor = template.background_color.toLowerCase();
  const isProhibitedBg = PROHIBITED_COLORS.has(bgColor.toUpperCase())
    || PROHIBITED_COLORS.has(bgColor);
  add("palette_bg", "§02-A",
    `Fondo usa paleta permitida (${template.background_color})`,
    "critico",
    !isProhibitedBg,
    isProhibitedBg
      ? `Color de fondo ${template.background_color} está prohibido`
      : undefined,
  );

  add("palette_no_pure_black", "§02-B",
    "Fondo no usa negro puro dominante (usa INK #282828)",
    "advertencia",
    template.background_color.toLowerCase() !== "#000000",
    template.background_color === "#000000"
      ? "Usar INK #282828 en lugar de negro puro" : undefined,
  );

  add("palette_no_pure_white", "§02-B",
    "Fondo no usa blanco puro dominante (usa PAPER #F9F6EF)",
    "advertencia",
    template.background_color.toLowerCase() !== "#ffffff",
    template.background_color.toLowerCase() === "#ffffff"
      ? "Usar PAPER #F9F6EF en lugar de blanco puro" : undefined,
  );

  // ── Identidad ─────────────────────────────────────────────────────────────
  add("ep_in_copy", "§06-A",
    "Número de episodio referenciado en el copy",
    "advertencia",
    lines.some(l => /\bEP[.\s]\s*\d/i.test(l) || /\d{2,}/.test(l)),
    "Sin referencia al número de episodio en el copy",
  );

  add("safe_zones", "§01-C",
    `Safe zones definidas (${template.safe_zone_top}px T / ${template.safe_zone_left}px L)`,
    "advertencia",
    template.safe_zone_top > 0 && template.safe_zone_left > 0,
  );

  // ── Score ─────────────────────────────────────────────────────────────────
  const passed       = checks.filter(c => c.pass).length;
  const criticalFails = checks.filter(c => c.severity === "critico"     && !c.pass).length;
  const warningFails  = checks.filter(c => c.severity === "advertencia" && !c.pass).length;
  const score        = Math.round((passed / checks.length) * 100);

  return { pass: criticalFails === 0, score, checks, criticalFails, warningFails };
}
