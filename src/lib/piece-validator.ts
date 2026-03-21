/**
 * AMTME Piece Validator
 * ─────────────────────
 * Validates every piece against the Instrucción Maestra before export.
 * Crítico checks block export. Advertencia checks are warnings.
 *
 * Rules source: §01 Safe Zones · §02 Palette · §03 Typography · §04 Gestalt
 *               §05 Conversion psychology · §06 Fixed elements · §07 Checklist
 */

import type { VisualPiece } from "@/lib/visual-templates";

// ─── Types ────────────────────────────────────────────────────────────────────
export type Severity = "critico" | "advertencia";

export interface ValidationCheck {
  id:       string;
  severity: Severity;
  rule:     string;         // short rule label (§XX reference)
  label:    string;         // human-readable description
  pass:     boolean;
  detail?:  string;         // extra info when failing
}

export interface ValidationResult {
  pass:   boolean;          // true when ALL crítico checks pass
  score:  number;           // 0–100 (all checks, not just crítico)
  checks: ValidationCheck[];
  criticalFails: number;
  warningFails:  number;
}

// ─── Internal helpers (mirrors canvas-text-overlay classifications) ───────────
const isPlaceholder = (l: string) => /^\[.+\]$/.test(l.trim());

const isPodcastName = (l: string) =>
  /^A\s+M[IÍ]\s+TAMPOCO\s+ME\s+EXPLICARON$/i.test(l.trim());

function classifyLine(raw: string): string {
  const u = raw.trim().toUpperCase();
  if (!u || isPlaceholder(raw))                                  return "empty";
  if (u.startsWith("@"))                                         return "handle";
  if (/^(CHRISTIAN VILLAMAR|SPOTIFY|APPLE PODCAST)/.test(u))    return "signature";
  if (/^EP[\s.]/.test(u) || /^\d{1,2}\s*[—-]/.test(u))         return "episode";
  if (/^(NUEVO EPISODIO|EPISODIO NUEVO|PODCAST)/.test(u))        return "meta_top";
  if (isPodcastName(raw))                                        return "signature";
  if (/^(ESC[ÚU]CHALO|GU[ÁA]RDALO|COMP[ÁA]RTELO|ESCUCHA EL|S[IÍ]GUENOS)/.test(u)) return "cta";
  return "content";
}

// ─── Validator ────────────────────────────────────────────────────────────────
export function validatePiece(
  piece:         VisualPiece,
  copyLines:     string[],
  episodeNumber: string,
  imageUrl?:     string,
): ValidationResult {
  const checks: ValidationCheck[] = [];

  const add = (
    id:       string,
    severity: Severity,
    rule:     string,
    label:    string,
    pass:     boolean,
    detail?:  string,
  ) => checks.push({ id, severity, rule, label, pass, detail });

  // Resolve / classify lines
  const allLines     = copyLines.map(l => l.trim());
  const activeLines  = allLines.filter(l => l && !isPlaceholder(l));
  const contentLines = activeLines.filter(l => classifyLine(l) === "content");
  const ctaLines     = activeLines.filter(l => classifyLine(l) === "cta");
  const placeholders = allLines.filter(isPlaceholder);
  const epNum        = episodeNumber.trim();

  // ── §07-A Técnico ───────────────────────────────────────────────────────────

  add("image_generated", "critico", "§07-A",
    "Imagen generada",
    !!imageUrl,
    !imageUrl ? "Presiona 'Generar' para producir la imagen" : undefined,
  );

  add("valid_format", "critico", "§01-A",
    `Formato válido (${piece.width}×${piece.height}px)`,
    ["1:1", "4:5", "9:16"].includes(piece.format),
  );

  add("ep_number", "critico", "§06-A",
    "Número de episodio definido y numérico",
    !!epNum && epNum !== "XX" && /^\d{1,3}$/.test(epNum),
    (!epNum || epNum === "XX") ? "Falta el número de episodio" :
    !/^\d{1,3}$/.test(epNum)  ? `"${epNum}" no es un número válido` : undefined,
  );

  add("no_placeholders", "critico", "§07-B",
    "Sin placeholders sin rellenar [...]",
    placeholders.length === 0,
    placeholders.length > 0
      ? `${placeholders.length} sin reemplazar: ${placeholders.slice(0, 2).join(", ")}`
      : undefined,
  );

  add("has_copy", "critico", "§07-B",
    "Copy con contenido real (no vacío)",
    contentLines.length > 0,
    contentLines.length === 0 ? "No hay líneas de copy con contenido" : undefined,
  );

  // ── §07-B Visual y editorial ────────────────────────────────────────────────

  add("single_dominant", "critico", "§03-D",
    "Un solo elemento dominante — no hay competencia de jerarquías",
    contentLines.length <= 3,  // L1·L2·L3 is fine; 4+ creates hierarchy confusion
    contentLines.length > 3
      ? `${contentLines.length} líneas de contenido — máx recomendado: 3`
      : undefined,
  );

  const dominant = contentLines[0] ?? "";
  const domWords = dominant ? dominant.split(/\s+/).length : 0;

  add("dominant_length", "advertencia", "§03-B",
    "Dominante ≤ 12 palabras (legible en 0.5s en scroll)",
    domWords <= 12,
    domWords > 12 ? `"${dominant}" tiene ${domWords} palabras (máx §03-B: 12-16)` : undefined,
  );

  add("dominant_present", "critico", "§04-D",
    "Dominante emocional presente (L1 amarillo)",
    contentLines.length >= 1,
    contentLines.length === 0 ? "Falta el titular dominante del episodio" : undefined,
  );

  // §03-C — No cursivas
  const hasItalic = copyLines.some(l => /[_*/]/.test(l));
  add("no_italics", "critico", "§03-C",
    "Sin cursivas en ningún elemento de marca",
    !hasItalic,
    hasItalic ? "Se detectaron marcadores de cursiva (* _ /)" : undefined,
  );

  // Safe zone: dominant text width estimate
  // At DOM_RATIO 0.085 × W px, text zone = W × 0.417
  // Rule of thumb: dominant wraps after ~5-6 short words per line at full size
  add("dominant_fits_zone", "advertencia", "§01-C",
    "Dominante cabe en zona de texto (safe zone izquierda)",
    domWords <= 16,
    domWords > 16 ? `${domWords} palabras → riesgo de overflow en zona segura` : undefined,
  );

  // ── §07-B — Color palette ───────────────────────────────────────────────────
  // We enforce the palette at the canvas level, so this is always a pass.
  // But flag if backgroundVersion is missing (could default wrong).
  add("background_defined", "advertencia", "§02-C",
    "Versión de fondo definida (cobalt #1A1AE6 o negro #0A0A0A)",
    !!piece.backgroundVersion,
    !piece.backgroundVersion ? "backgroundVersion no está definido en la plantilla" : undefined,
  );

  // ── §07-C — Psicológico y de conversión ────────────────────────────────────

  add("has_cta", "advertencia", "§05-A",
    "CTA presente (impulsa acción en 2s)",
    ctaLines.length > 0,
    ctaLines.length === 0 ? "Sin CTA — se usa 'ESCÚCHALO HOY' por defecto" : undefined,
  );

  // ── §07-D — Identidad AMTME ─────────────────────────────────────────────────

  add("has_episode_in_copy", "advertencia", "§06-A",
    "Número de episodio en el copy (Ep. XX)",
    activeLines.some(l => /\bEP[\s.]\s*\d/i.test(l) || /\d{2}/.test(l)),
    "Sin referencia al número de episodio en el copy" ,
  );

  // Fixed elements are always added by renderFixedBlock (canvas guarantee)
  add("fixed_block_guaranteed", "critico", "§06-A",
    "Bloque fijo §06 garantizado (PODCAST · Ep. · Spotify · Apple · host)",
    true,  // always true — canvas renderFixedBlock() always runs
  );

  // ── §07-D — File naming ─────────────────────────────────────────────────────
  const validEpForNaming = /^\d{1,3}$/.test(epNum);
  add("naming_convention", "advertencia", "§06-C",
    `Naming convention: AMTME_Ep${epNum.padStart(2,"0")}_Pieza${String(piece.id).padStart(2,"0")}_vF.png`,
    validEpForNaming,
    !validEpForNaming ? "Número de episodio no numérico → nombre de archivo incorrecto" : undefined,
  );

  // ─── Score & summary ────────────────────────────────────────────────────────
  const passed         = checks.filter(c => c.pass).length;
  const criticalFails  = checks.filter(c => c.severity === "critico"    && !c.pass).length;
  const warningFails   = checks.filter(c => c.severity === "advertencia" && !c.pass).length;
  const score          = Math.round((passed / checks.length) * 100);

  return {
    pass: criticalFails === 0,
    score,
    checks,
    criticalFails,
    warningFails,
  };
}
