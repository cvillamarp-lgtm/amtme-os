import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

import { getCorsHeaders } from "../_shared/cors.ts";
import { callAI } from "../_shared/ai.ts";
import { errorResponse } from "../_shared/response.ts";

// ── Copy variable types (must mirror visual-templates.ts) ──────────────────
type CopyGoal      = "AWARENESS" | "SAVE" | "SHARE" | "LISTEN" | "COMMENT" | "CONVERT";
type CopyEmotion   = "alivio" | "vergüenza" | "rabia" | "duelo" | "esperanza" | "claridad" | "ternura" | "orgullo";
type CopyIntensity = "suave" | "medio" | "fuerte";
type CopyAngle     = "apego" | "límites" | "identidad" | "autosabotaje" | "duelo" | "autoestima" | "comunicación";
type CopyFormat    = "post_frase" | "quote_dual" | "mini_manifiesto" | "pregunta" | "no_es_es";

interface CopyParams {
  goal?: CopyGoal;
  emotion?: CopyEmotion;
  intensity?: CopyIntensity;
  angle?: CopyAngle;
  audience?: string;
  format?: CopyFormat;
}

// ── Defaults per goal ──────────────────────────────────────────────────────
const COPY_DEFAULTS: Record<CopyGoal, Required<CopyParams>> = {
  AWARENESS: { goal: "AWARENESS", emotion: "claridad",  intensity: "fuerte", angle: "apego",        audience: "general", format: "no_es_es"        },
  SAVE:      { goal: "SAVE",      emotion: "rabia",     intensity: "fuerte", angle: "límites",      audience: "general", format: "mini_manifiesto" },
  SHARE:     { goal: "SHARE",     emotion: "alivio",    intensity: "medio",  angle: "autoestima",   audience: "general", format: "no_es_es"        },
  LISTEN:    { goal: "LISTEN",    emotion: "claridad",  intensity: "fuerte", angle: "apego",        audience: "general", format: "pregunta"        },
  COMMENT:   { goal: "COMMENT",   emotion: "vergüenza", intensity: "medio",  angle: "comunicación", audience: "general", format: "pregunta"        },
  CONVERT:   { goal: "CONVERT",   emotion: "esperanza", intensity: "suave",  angle: "identidad",    audience: "general", format: "post_frase"      },
};

// ── Format templates ───────────────────────────────────────────────────────
const FORMAT_INSTRUCTIONS: Record<CopyFormat, string> = {
  post_frase:       "1 golpe emocional. Verdad incómoda o validación directa. H1: 2-4 líneas de 3-5 palabras c/u. H2: 1 línea que amplía.",
  quote_dual:       "Contraste entre dos estados. H1: 2 bloques opuestos. H2: 1 distinción que resuelve.",
  mini_manifiesto:  "Construcción progresiva hacia un reframe. H1: 3-5 líneas (Trigger → Espejo → Reframe). H2: anclaje emocional final.",
  pregunta:         "1 pregunta que espeja una experiencia específica. H1: la pregunta en 2-3 líneas. H2: observación que valida sin juzgar.",
  no_es_es:         "Reframe cognitivo. H1: 'NO ES [creencia errónea] / ES [verdad real]'. H2: por qué importa la distinción.",
};

// ── CTA per goal ───────────────────────────────────────────────────────────
const GOAL_CTA: Record<CopyGoal, string> = {
  AWARENESS: "Comenta: ¿te pasó?",
  SAVE:      "Guárdalo para cuando vuelvas a caer",
  SHARE:     "Envíalo a quien lo necesita",
  LISTEN:    "Escúchalo en Spotify →",
  COMMENT:   "Comenta: ¿te pasó?",
  CONVERT:   "Escúchalo en Spotify →",
};

serve(async (req) => {
  const cors = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const body = await req.json();
    const { episodio, tesis } = body as { episodio?: string; tesis?: string };

    if (!episodio || !tesis) {
      return errorResponse(cors, "VALIDATION_ERROR", "Se requiere episodio y tesis", 400);
    }

    // Resolve copy variables with defaults
    const rawGoal = (body.goal as CopyGoal | undefined) ?? "AWARENESS";
    const defaults = COPY_DEFAULTS[rawGoal] ?? COPY_DEFAULTS.AWARENESS;

    const params: Required<CopyParams> = {
      goal:      rawGoal,
      emotion:   (body.emotion   as CopyEmotion   | undefined) ?? defaults.emotion,
      intensity: (body.intensity as CopyIntensity | undefined) ?? defaults.intensity,
      angle:     (body.angle     as CopyAngle     | undefined) ?? defaults.angle,
      audience:  (body.audience  as string        | undefined) ?? defaults.audience,
      format:    (body.format    as CopyFormat    | undefined) ?? defaults.format,
    };

    const ctaText = GOAL_CTA[params.goal];
    const formatInstructions = FORMAT_INSTRUCTIONS[params.format];

    const systemPrompt = `Eres el director creativo del podcast A Mí Tampoco Me Explicaron (AMTME).
Host: @yosoyvillamar · Christian Villamar. Audiencia: hombres hispanos 28-44 años, LATAM.
FILOSOFÍA: "Aquí no juzgamos. Acompañamos."

Tu tarea: generar el COPY TIPOGRÁFICO para piezas visuales de Instagram del sistema SB-01.

━━━ SISTEMA DE COLOR SB-01 ━━━
- Navy #083A4F → fondo principal (CW-01). Texto encima: Sand.
- Sand #E5E1DD → fondo cálido (CW-02). Texto encima: Navy.
- Teal #407E8C → fondo de giro/pregunta (CW-04). Texto encima: Navy.
- Gold #A58D66 → etiquetas, handles, líneas separadoras.
- HL #E8FF40 → BARRA DE RESALTADO. Exactamente 1 PALABRA por pieza. Texto en esa barra: Navy #083A4F.
  REGLA HL: Elige la palabra que más duele reconocer. NUNCA más de 1 activa por pieza.

COLORWAY POR PIEZA:
- T1 Post Frase: CW-01 (Navy). Banda Gold lateral.
- T2 Carrusel Slide 1 Cover: CW-02 (Sand). Barra HL en verbo de dolor.
- T3 Carrusel Slides 2-4: CW-01 (Navy). Barra HL en la palabra que más duele reconocer.
- T4 Carrusel Slide 5 Reflexiva: CW-04 (Teal). Pregunta que invita a guardarlo.
- T5 Carrusel Slide 6 CTA: CW-04 (Teal). Botón HL → Spotify.
- T6 Story Lanzamiento: CW-01 (Navy). Zonas seguras 200px sup / 380px inf.
- T7 Evergreen/Reel: CW-02 (Sand). Para republicar semanas después.

━━━ JERARQUÍA TIPOGRÁFICA ━━━
H1 (Hook): Inter Black 900 · 64-80px (4:5) / 72-88px (9:16) · tracking -1 a -1.5 · line-height 1.0-1.1 · máx 3 líneas · máx 5 palabras/línea
H2 (Insight): Inter Bold 700 · 32-40px · tracking 0 · line-height 1.3 · máx 2 líneas
MICRO (CTA/etiqueta): Inter Medium 500 · 18-22px · tracking +0.1em · máx 1 línea

━━━ PRINCIPIOS GESTALT ━━━
- Figura/Fondo: contraste mínimo 7:1 (WCAG AAA). Sin ruido visual sobre el texto.
- Proximidad: 40px entre grupos de intención. 8-12px dentro del mismo grupo.
- Semejanza: todas las etiquetas igual estilo. Todos los CTA igual estilo.
- Continuidad: alineación única por pieza (izquierda editorial preferente).
- Cierre: filetes 1px Gold para cerrar módulos.
- Pregnancia: máximo 3 elementos visuales activos. 1 dominante claro.

━━━ GRID ━━━
Swiss 8 columnas · baseline 8px · gutter 24px · margen 108px
Zonas seguras: 4:5 → 108px lat, 135px arr/abj · 9:16 → 108px lat, 230px arr/abj · 1:1 → 108px todos

━━━ REGLAS ABSOLUTAS DE COPY ━━━
- TODO EN MAYÚSCULAS
- Máximo 6-8 palabras por línea
- Usa saltos de línea (\\n) para separar bloques visuales
- Frases cortas, contundentes, psicológicas — tensión, identificación o urgencia emocional
- Tono editorial, íntimo, sobrio — NUNCA motivacional ni marketero
- Sin signos de exclamación ni emojis
- NUNCA: "SANA", "FLUYE", "CRECE", "TU MEJOR VERSIÓN", "APRENDE A AMARTE"
- Siempre incluir "EP. [número]" y "@yosoyvillamar" donde corresponda

Devuelve ÚNICAMENTE un JSON válido sin markdown. Formato exacto:
{
  "copy_portada": "...",
  "copy_lanzamiento": "...",
  "copy_reel": "...",
  "copy_story_lanzamiento": "...",
  "copy_story_quote": "...",
  "copy_quote_feed": "...",
  "copy_slide1": "...",
  "copy_slide2": "...",
  "copy_slide3": "...",
  "copy_slide4": "...",
  "copy_slide5": "...",
  "copy_slide6": "...",
  "copy_slide7": "...",
  "copy_slide8": "...",
  "copy_highlight": "..."
}`;

    const userPrompt = `Episodio: ${episodio}
Tesis central: "${tesis}"

PARÁMETROS DE ESTA PRODUCCIÓN:
- Objetivo (goal): ${params.goal}
- Emoción dominante: ${params.emotion}
- Intensidad: ${params.intensity}
- Ángulo psicológico: ${params.angle}
- Audiencia específica: ${params.audience}
- Formato tipográfico preferente: ${params.format}
- CTA principal: "${ctaText}"

INSTRUCCIÓN DE FORMATO "${params.format}": ${formatInstructions}

Aplica este ángulo psicológico (${params.angle}) y esta emoción (${params.emotion}) en todas las piezas.
La intensidad es "${params.intensity}" — ${params.intensity === "fuerte" ? "copy directo, sin suavizantes. Confronta." : params.intensity === "medio" ? "equilibrio entre confrontar y acompañar." : "más acompañamiento que confrontación. Suave pero honesto."}.

Genera el copy tipográfico para las 15 piezas. Instrucciones por pieza:

copy_portada (Feed 1:1 / CW-01 Navy):
Frase principal del episodio en formato ${params.format}. 2-3 bloques tipográficos.
Incluir número de episodio y nombre del podcast al final. Barra HL en 1 palabra clave.

copy_lanzamiento (Feed 4:5 / CW-02 Sand):
Titular dominante + señal de nuevo episodio + handle. Incluir "NUEVO EPISODIO", número y @yosoyvillamar.
H1 impactante, H2 de contexto, MICRO con handle.

copy_reel (9:16 vertical / CW-02 Sand):
Título corto impactante para miniatura de reel. Máximo 2 bloques.
Debe detenerse en scroll en 0.5s.

copy_story_lanzamiento (9:16 / CW-01 Navy):
"NUEVO EPISODIO" como etiqueta MICRO arriba + H1 con título + CTA corto + número + handle.
Respetar zona segura: contenido entre px 230 y px 1690.

copy_story_quote (9:16 / CW-01 Navy):
Una sola frase emocional del episodio, expandida con saltos de línea para llenado vertical.
Emoción dominante: ${params.emotion}. Número al final como MICRO.

copy_quote_feed (Feed 4:5 / CW-01 Navy):
Frase guardable. Máximo 4 líneas. Meta: que alguien lo guarde para releerlo.
CTA: "${ctaText}". Número al final.

copy_slide1 (Carrusel portada / CW-02 Sand):
Frase de anclaje en formato ${params.format} que genere curiosidad + "01" + número de episodio.
Esta frase debe obligar a pasar al siguiente slide.

copy_slide2 (CW-01 Navy):
Una idea contundente del episodio desde el ángulo ${params.angle} + "02".

copy_slide3 (CW-01 Navy):
Tensión entre dos ideas opuestas (estructura "CUANDO X / Y CUANDO X / Z" o similar) + "03".

copy_slide4 (CW-01 Navy):
La frase de mayor impacto del episodio. Emoción: ${params.emotion} en intensidad ${params.intensity} + "04".

copy_slide5 (CW-04 Teal — Reflexiva):
Afirmación sobria que invita a guardarlo. Pregunta retórica opcional + "05".

copy_slide6 (CW-04 Teal — CTA):
Bloque tipográfico con CTA directo: "${ctaText}". Handle y número + "06".

copy_slide7 (CW-01 Navy — Clímax):
La frase más poderosa del episodio. Máximo espacio negativo. 1-2 líneas solamente + "07".

copy_slide8 (CW-04 Teal — CTA final):
CTA directo + invitación a escuchar + @yosoyvillamar + número de episodio + "08".

copy_highlight (1:1 circular):
Solo el número del episodio en formato corto: "14" o "EP.14". Máximo 2 caracteres/palabras.`;

    const rawContent = await callAI([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ]);

    const cleaned = rawContent
      .replace(/^```json?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    let parsed: Record<string, string>;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("JSON parse error. Raw:", rawContent);
      return errorResponse(cors, "AI_ERROR", "La IA no devolvió un JSON válido. Intenta de nuevo.", 500);
    }

    return new Response(JSON.stringify({ copy: parsed }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-visual-copy error:", e);
    return errorResponse(cors, "INTERNAL_ERROR", e instanceof Error ? e.message : "Error desconocido", 500);
  }
});
