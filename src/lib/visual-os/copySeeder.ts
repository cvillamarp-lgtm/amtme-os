/**
 * Copy Seeder — AMTME Visual OS
 * ─────────────────────────────
 * Maps episode data (tesis_central + frases_clave + episode_number)
 * to every copy block of every piece template.
 *
 * Rules:
 * - Fixed values (EP. XX, @yosoyvillamar, A MÍ TAMPOCO ME EXPLICARON) are always injected
 * - tesis_central is split into 2 lines (around a natural break point)
 * - frases_clave[N] fills secondary / slide content in order
 * - Carousel slides (P07–P14) each get one dedicated key phrase
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EpisodeContext {
  episode_number:  string;           // "29"
  thesis_central:  string;           // "No es que no sepas organizarte; es que nadie te enseñó a hacerlo."
  key_phrases:     string[];         // ["frase 1", "frase 2", ...]  (3–6 items)
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function epLabel(num: string): string {
  return `EP. ${num.padStart(2, "0")}`;
}

/**
 * Split a long sentence into two roughly equal lines.
 * Prefers splitting at: · ; · , · — · " — " · " y " · " pero " · " que "
 */
function splitTwoLines(text: string): [string, string] {
  if (!text?.trim()) return ["", ""];

  const SEPARATORS = [" — ", "; ", ", ", " pero ", " aunque ", " y "];
  for (const sep of SEPARATORS) {
    const idx = text.indexOf(sep);
    if (idx > 0 && idx < text.length - sep.length) {
      const part1 = text.slice(0, idx + (sep === "; " ? 1 : 0)).trim();
      const part2 = text.slice(idx + sep.length).trim();
      if (part1 && part2) return [part1, part2];
    }
  }

  // Fallback: split at midpoint on word boundary
  const words = text.split(" ");
  const half  = Math.ceil(words.length / 2);
  return [
    words.slice(0, half).join(" "),
    words.slice(half).join(" "),
  ];
}

/**
 * Split tesis into 3 segments (for pieces that need 3 lines).
 * Splits at natural language boundaries.
 */
function splitThreeLines(text: string): [string, string, string] {
  const [l1, rest] = splitTwoLines(text);
  if (!rest) return [l1, "", ""];
  const [l2, l3] = splitTwoLines(rest);
  return [l1, l2, l3];
}

/** Capitalize first letter only. */
function cap(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : "";
}

/** Get key phrase at index, falling back gracefully. */
function kp(phrases: string[], i: number): string {
  return phrases[i] ?? phrases[phrases.length - 1] ?? "";
}

// ─── Main seeder ──────────────────────────────────────────────────────────────

/**
 * Returns the pre-filled value for a given copy block,
 * given the episode context and the template piece code.
 *
 * @param blockName   e.g. "frase_principal_linea_1"
 * @param pieceCode   e.g. "P01"
 * @param ctx         episode data
 * @returns           pre-filled string, never undefined
 */
export function seedCopyBlock(
  blockName:  string,
  pieceCode:  string,
  ctx:        EpisodeContext,
): string {
  const { episode_number, thesis_central, key_phrases } = ctx;
  const ep    = episode_number.padStart(2, "0");
  const [t1, t2, t3] = splitThreeLines(thesis_central);
  const kps = key_phrases;

  // ── FIXED values ──────────────────────────────────────────────────────────

  switch (blockName) {
    // Episode identifier
    case "ep_label":
      return epLabel(ep);

    // Podcast name — always fixed
    case "nombre_podcast":
      return "A MÍ TAMPOCO ME EXPLICARON";

    // Instagram handle — always fixed
    case "instagram_user":
      return "@yosoyvillamar";

    // Launch label — always fixed
    case "label_lanzamiento":
      return "NUEVO EPISODIO";

    // CTA fixed texts
    case "cta":
      return "ESCÚCHALO YA";

    case "cta_1":
      return "GUÁRDALO";

    case "cta_2":
      return "COMPÁRTELO";

    case "escucha_1":
      return "ESCUCHA";

    case "escucha_2":
      return `EL EPISODIO ${ep}`;

    // Highlight cover — only the number
    case "episode_number_only":
      return ep;

    // Slide numbers (01–08)
    case "slide_number": {
      const n = parseInt(pieceCode.replace("P", ""), 10) - 6; // P07=01, P08=02 …
      return String(Math.max(1, n)).padStart(2, "0");
    }
  }

  // ── PIECE-SPECIFIC variable mapping ───────────────────────────────────────

  switch (pieceCode) {
    // ── P01 Portada 1:1 ─────────────────────────────────────────────────────
    case "P01":
      // Seeds use "frase_principal_l1" (short form) — support both
      if (blockName === "frase_principal_l1" || blockName === "frase_principal_linea_1") return cap(t1);
      if (blockName === "frase_principal_l2" || blockName === "frase_principal_linea_2") return cap(t2);
      break;

    // ── P02 Lanzamiento 4:5 ─────────────────────────────────────────────────
    case "P02":
      if (blockName === "titular_1") return cap(t1);
      if (blockName === "titular_2") return cap(t2);
      if (blockName === "titular_3") return cap(t3) || cap(kp(kps, 0));
      break;

    // ── P03 Reel Cover 9:16 ─────────────────────────────────────────────────
    case "P03":
      if (blockName === "titular_corto_1") return cap(t1);
      if (blockName === "titular_corto_2") return cap(t2);
      break;

    // ── P04 Story de Lanzamiento 9:16 ───────────────────────────────────────
    case "P04":
      if (blockName === "titular_1") return cap(t1);
      if (blockName === "titular_2") return cap(t2);
      if (blockName === "titular_3") return cap(t3) || cap(kp(kps, 0));
      break;

    // ── P05 Story Quote 9:16 ────────────────────────────────────────────────
    case "P05": {
      const q = kp(kps, 0);
      const [q1, q2] = splitTwoLines(q);
      if (blockName === "frase_larga_1") return cap(q1);
      if (blockName === "frase_larga_2") return cap(q2);
      if (blockName === "frase_larga_3") return cap(kp(kps, 1));
      break;
    }

    // ── P06 Quote Feed 4:5 ──────────────────────────────────────────────────
    case "P06": {
      const q2 = kp(kps, 0);
      const [f1, f2] = splitTwoLines(q2);
      if (blockName === "frase_1") return cap(f1);
      if (blockName === "frase_2") return cap(f2);
      if (blockName === "frase_3") return cap(kp(kps, 1));
      break;
    }

    // ── P07 Carrusel Slide 1 — Portada ──────────────────────────────────────
    case "P07":
      if (blockName === "titular_1") return cap(t1);
      if (blockName === "titular_2") return cap(t2);
      break;

    // ── P08 Carrusel Slide 2 ────────────────────────────────────────────────
    case "P08": {
      const phrase = kp(kps, 0);
      const [i1, i2] = splitTwoLines(phrase);
      if (blockName === "idea_1") return cap(i1);
      if (blockName === "idea_2") return cap(i2);
      break;
    }

    // ── P09 Carrusel Slide 3 ────────────────────────────────────────────────
    case "P09": {
      const phrase = kp(kps, 1);
      const [a, b] = splitTwoLines(phrase);
      if (blockName === "tension_a") return cap(a);
      if (blockName === "tension_b") return cap(b);
      break;
    }

    // ── P10 Carrusel Slide 4 ────────────────────────────────────────────────
    case "P10": {
      const phrase = kp(kps, 2);
      const [fi, cm] = splitTwoLines(phrase);
      if (blockName === "frase_impacto")    return cap(fi);
      if (blockName === "concepto_memorable") return cap(cm);
      break;
    }

    // ── P11 Carrusel Slide 5 ────────────────────────────────────────────────
    case "P11": {
      const phrase = kp(kps, 3);
      const [p1, p2] = splitTwoLines(phrase);
      if (blockName === "frase_1") return cap(p1);
      if (blockName === "frase_2") return cap(p2);
      if (blockName === "frase_3") return cap(kp(kps, 4));
      break;
    }

    // ── P12 Carrusel Slide 6 ────────────────────────────────────────────────
    case "P12": {
      const phrase = kp(kps, 4);
      const [p1, p2] = splitTwoLines(phrase);
      if (blockName === "frase_1") return cap(p1);
      if (blockName === "frase_2") return cap(p2);
      break;
    }

    // ── P13 Carrusel Slide 7 — Clímax ───────────────────────────────────────
    case "P13": {
      // Last key phrase = most powerful / climax
      const climaxPhrase = kp(kps, kps.length - 1);
      const [c1, c2, c3] = splitThreeLines(climaxPhrase);
      if (blockName === "climax_1") return cap(c1);
      if (blockName === "climax_2") return cap(c2);
      if (blockName === "climax_3") return cap(c3);
      break;
    }

    // ── P14 Carrusel Slide 8 — CTA ──────────────────────────────────────────
    // Fixed values already handled above (cta_1, cta_2, escucha_1, escucha_2)
    case "P14":
      break;

    // ── P15 Highlight Cover ─────────────────────────────────────────────────
    // episode_number_only already handled above
    case "P15":
      break;
  }

  // ── Generic fallback mapping by block name pattern ─────────────────────────

  // Any unnamed "frase_1" style → first key phrase
  if (blockName.endsWith("_1") && blockName.startsWith("frase")) return cap(kp(kps, 0));
  if (blockName.endsWith("_2") && blockName.startsWith("frase")) return cap(kp(kps, 1));
  if (blockName.endsWith("_3") && blockName.startsWith("frase")) return cap(kp(kps, 2));

  // Default titular → thesis line 1
  if (blockName.startsWith("titular"))  return cap(t1);
  if (blockName.startsWith("climax"))   return cap(kp(kps, kps.length - 1));
  if (blockName.includes("cta"))        return "ESCÚCHALO YA";

  return "";
}
