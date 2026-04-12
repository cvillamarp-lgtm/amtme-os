import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { getCorsHeaders } from "../_shared/cors.ts";
import { callAIWithResilience, type AIErrorCategory, type AIOrchestratorResult } from "../_shared/ai.ts";
import { errorResponse } from "../_shared/response.ts";

const AMTME_SYSTEM_PROMPT = `Eres el sistema de producción del podcast A Mí Tampoco Me Explicaron (AMTME).
Host: Christian Villamar (@yosoyvillamar). Base: Playa del Carmen, México.
Audiencia: hombres hispanos 28–44 años, LATAM. 90% hombres, 60-70% entre 28-34 años.

POSICIONAMIENTO: "El único podcast en español que habla directamente a hombres hispanos sobre amor, apego e identidad — sin juicio, sin poses, sin el discurso de quien ya lo resolvió todo."

TONO: Directo, íntimo, primera persona. Como un amigo honesto que ha vivido lo que habla. Humor ácido estratégico, máximo 4-5 momentos por episodio, nunca al abrir ni al cerrar.
FILOSOFÍA: "Aquí no juzgamos. Acompañamos."
IDIOMA: Español neutro LATAM. Nunca rioplatense.
DURACIÓN OBJETIVO: 13-15 minutos hablados.
FORMATO DE NOMBRE: Ep. XX — [Título]

SÍ DECIMOS: "Hablamos de..." / "¿Alguna vez sentiste...?" / "Esto no tiene una respuesta fácil." / "Yo también estoy en eso."
NUNCA DECIMOS: "En este episodio te enseño..." / "La solución es simple..." / "Ya lo superé y te cuento cómo." / "aprender a amarte" / "sanar" / "ser tu mejor versión" / "dejar ir" / "fluir" / "crecer" / "herramientas para X"

VALORES: Acompañamiento (no instruimos, estamos al lado, no por encima) · Honestidad radical (hablamos desde donde estamos, no donde quisiéramos) · Presencia antes que certeza · Humildad del camino (nadie tiene todas las respuestas) · La carga compartida (nombrarlo ya alivia algo).

TEMAS RECURRENTES: relaciones, patrones de apego, heridas emocionales, autosabotaje, validación, identidad, miedo al abandono, amor propio real (no de cliché), verdades incómodas sobre vínculos.
Tarot: herramienta de autoconocimiento, nunca predicción.`;

const FIELD_INSTRUCTIONS: Record<string, string> = {
  working_title: 'título de trabajo interno, formato Ep. XX — [Título]. Máximo 7 palabras en el título. Usa arquetipo: verdad que nadie dice / pregunta que incomoda / costo invisible / inversión de expectativa.',
  theme: 'el tema en una línea. Sin adornos.',
  core_thesis: 'la idea central que sostiene el episodio. Una sola oración. Que el oyente pueda repetirla después de escuchar.',
  summary: 'resumen del episodio. Máximo 60 palabras. Español neutro. Sin spoilers del cierre.',
  hook: 'frase de apertura. Máximo 10 palabras. Pregunta o afirmación que nombre una experiencia que el oyente ya vivió pero no tenía palabras para describir. Sin presentación, directo al conflicto.',
  cta: 'llamada a la acción. Una línea con razón emocional real. Menciona @yosoyvillamar y @amtmepodcast. Cierra con: Nos escuchamos. — A Mí Tampoco Me Explicaron',
  quote: 'frase más poderosa del episodio. Máximo 12 palabras. Funciona sola sin contexto. Afirmación, no consejo.',
  descripcion_spotify: 'máximo 150 palabras. Estructura: 1) Hook emocional (1-2 oraciones que nombran algo que el oyente siente pero no pudo decir) → 2) Desarrollo del tema sin spoilear (2-3 oraciones) → 3) Lista de 3-4 puntos con "—" → 4) Cierre: una oración que describe al oyente ideal de este episodio → Termina con: "Aquí no juzgamos. Acompañamos." y "@yosoyvillamar". Incluir hashtags: #AMíTampocoMeExplicaron #christianvillamar + 2-3 del tema + 2-3 generales (#amorpropio #autoconocimiento #podcastenespañol). NUNCA frases de autoayuda.',
  conflicto_central: 'el conflicto central del episodio en una oración. Qué tensión o contradicción emocional lo sostiene. No es el tema — es la grieta que lo hace interesante.',
  intencion_del_episodio: 'la intención del episodio en una oración. Qué quiere que el oyente sienta, piense o se permita al terminar de escuchar.',
};

const inFlightByKey = new Map<string, Promise<AIOrchestratorResult>>();

function buildUIEnvelope(
  payload: Partial<{
    status: "success" | "recovered" | "degraded" | "failed";
    error_code: AIErrorCategory;
    retryable: boolean;
    provider_used: string | null;
    fallback_used: boolean;
    message: string;
    request_id: string;
  }>,
) {
  return {
    status: payload.status ?? "failed",
    error_code: payload.error_code,
    retryable: payload.retryable ?? false,
    provider_used: payload.provider_used ?? null,
    fallback_used: payload.fallback_used ?? false,
    message: payload.message ?? "No se pudo completar la operación IA",
    request_id: payload.request_id,
  };
}

function mapAuthErrorCode(errorMessage: string): AIErrorCategory {
  const normalized = errorMessage.toLowerCase();
  return normalized.includes("expired") || normalized.includes("expir")
    ? "USER_AUTH_EXPIRED"
    : "USER_AUTH_INVALID";
}

function withIdempotency(key: string, factory: () => Promise<AIOrchestratorResult>) {
  const current = inFlightByKey.get(key);
  if (current) return current;
  const created = factory().finally(() => inFlightByKey.delete(key));
  inFlightByKey.set(key, created);
  return created;
}

serve(async (req) => {
  const cors = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: cors });
  }

  try {
    // Validate JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return errorResponse(cors, "UNAUTHORIZED", "Missing authorization", 401);
    }
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      const authMessage = authError?.message ?? "Invalid token";
      const authCode = mapAuthErrorCode(authMessage);
      return errorResponse(
        cors,
        authCode,
        authMessage,
        401,
        buildUIEnvelope({
          status: "failed",
          error_code: authCode,
          retryable: true,
          provider_used: null,
          fallback_used: false,
          message: "Sesión inválida o expirada. Intenta iniciar sesión nuevamente.",
          request_id: req.headers.get("x-request-id") ?? crypto.randomUUID(),
        }),
      );
    }

    const body = await req.json();
    const { mode } = body;

    // ─── Mode: Regenerate single field ───────────────────────────
    if (mode === "regenerate_field") {
      const { field_name, idea_principal, current_fields, episode_number } = body;
      if (!field_name || !FIELD_INSTRUCTIONS[field_name]) {
        return errorResponse(cors, "VALIDATION_ERROR", `Invalid field_name: ${field_name}`, 400);
      }

      const contextLines = Object.entries(current_fields || {})
        .filter(([k, v]) => v && k !== field_name)
        .map(([k, v]) => `- ${k}: "${v}"`)
        .join("\n");

      const userPrompt = `Regenera SOLO el campo "${field_name}" para un episodio de AMTME.

Idea principal: "${idea_principal || ''}"
${episode_number ? `Número de episodio: ${episode_number}` : ''}

Contexto actual del episodio:
${contextLines}

Instrucción para "${field_name}": ${FIELD_INSTRUCTIONS[field_name]}

Responde ÚNICAMENTE con el texto del campo, sin JSON, sin comillas, sin explicaciones.`;

      const idempotencyKey = `${user.id}:regenerate_field:${episode_number ?? "na"}:${field_name}`;
      const orchestrated = await withIdempotency(idempotencyKey, () => callAIWithResilience(
        [
          { role: "system", content: AMTME_SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        0.7,
        {
          request_id: req.headers.get("x-request-id") ?? crypto.randomUUID(),
          user_id: user.id,
          action: "regenerate_field",
        },
      ));

      if (!orchestrated.text) {
        return new Response(JSON.stringify(buildUIEnvelope({
          status: orchestrated.status,
          error_code: orchestrated.error_code,
          retryable: orchestrated.retryable,
          provider_used: orchestrated.provider_used,
          fallback_used: orchestrated.fallback_used,
          message: orchestrated.message,
          request_id: orchestrated.request_id,
        })), {
          status: 200,
          headers: { ...cors, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({
        value: orchestrated.text,
        ...buildUIEnvelope({
          status: orchestrated.status,
          error_code: orchestrated.error_code,
          retryable: orchestrated.retryable,
          provider_used: orchestrated.provider_used,
          fallback_used: orchestrated.fallback_used,
          message: orchestrated.message,
          request_id: orchestrated.request_id,
        }),
        metadata: {
          source_type: "ai_regenerated",
          source_module: field_name,
          generated_at: new Date().toISOString(),
        },
      }), {
        status: 200,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // ─── Mode: Generate 3–5 options for a single field ───────────
    if (mode === "generate_options") {
      const { field_name, idea_principal, current_fields, episode_number, count = 3 } = body;
      if (!field_name || !FIELD_INSTRUCTIONS[field_name]) {
        return errorResponse(cors, "VALIDATION_ERROR", `Invalid field_name: ${field_name}`, 400);
      }

      const contextLines = Object.entries(current_fields || {})
        .filter(([k, v]) => v && k !== field_name)
        .map(([k, v]) => `- ${k}: "${v}"`)
        .join("\n");

      const numOptions = Math.min(Math.max(Number(count) || 3, 2), 5);
      const userPrompt = `Genera ${numOptions} opciones DISTINTAS para el campo "${field_name}" de un episodio de AMTME.

Idea principal: "${idea_principal || ''}"
${episode_number ? `Número de episodio: ${episode_number}` : ""}

Contexto del episodio:
${contextLines || "(sin contexto adicional)"}

Instrucción para "${field_name}": ${FIELD_INSTRUCTIONS[field_name]}

IMPORTANTE: Las opciones deben tener enfoques, ángulos y tonos REALMENTE diferentes entre sí — no variaciones menores de la misma idea, sino alternativas editoriales genuinas.

Responde ÚNICAMENTE con un array JSON válido, sin markdown, sin backticks, sin texto adicional:
[
  {"value": "texto de la opción", "rationale": "por qué este enfoque funciona"},
  ...
]`;

      const idempotencyKey = `${user.id}:generate_options:${episode_number ?? "na"}:${field_name}:${numOptions}`;
      const orchestrated = await withIdempotency(idempotencyKey, () => callAIWithResilience(
        [
          { role: "system", content: AMTME_SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        0.9,
        {
          request_id: req.headers.get("x-request-id") ?? crypto.randomUUID(),
          user_id: user.id,
          action: "generate_options",
        },
      ));

      if (!orchestrated.text) {
        return new Response(JSON.stringify(buildUIEnvelope({
          status: orchestrated.status,
          error_code: orchestrated.error_code,
          retryable: orchestrated.retryable,
          provider_used: orchestrated.provider_used,
          fallback_used: orchestrated.fallback_used,
          message: orchestrated.message,
          request_id: orchestrated.request_id,
        })), {
          status: 200,
          headers: { ...cors, "Content-Type": "application/json" },
        });
      }

      let options: { value: string; rationale: string }[];
      try {
        const jsonMatch = orchestrated.text.match(/\[[\s\S]*\]/);
        if (!jsonMatch) throw new Error("No JSON array found");
        const parsed = JSON.parse(jsonMatch[0]);
        if (!Array.isArray(parsed)) throw new Error("Response is not an array");
        options = parsed.filter((o: unknown) => o && typeof (o as Record<string, unknown>).value === "string").slice(0, 5);
      } catch {
        console.error("Failed to parse options response:", orchestrated.text);
        throw new Error("Failed to parse options from AI response");
      }

      return new Response(JSON.stringify({
        options,
        ...buildUIEnvelope({
          status: orchestrated.status,
          error_code: orchestrated.error_code,
          retryable: orchestrated.retryable,
          provider_used: orchestrated.provider_used,
          fallback_used: orchestrated.fallback_used,
          message: orchestrated.message,
          request_id: orchestrated.request_id,
        }),
        metadata: { source_type: "ai_options", field_name, generated_at: new Date().toISOString() },
      }), {
        status: 200,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // ─── Mode: Generate all 8 fields (original) ─────────────────
    const { idea_principal, conflicto_central, intencion_del_episodio, tono, restricciones, episode_number } = body;

    if (!idea_principal) {
      return errorResponse(cors, "VALIDATION_ERROR", "idea_principal is required", 400);
    }

    const fieldInstructions = Object.entries(FIELD_INSTRUCTIONS)
      .map(([k, v]) => `  "${k}": "${v}"`)
      .join(",\n");

    const userPrompt = `Genera los campos base para un nuevo episodio de AMTME a partir de esta idea principal:

"${idea_principal}"

${conflicto_central ? `Conflicto central: "${conflicto_central}"` : ""}
${intencion_del_episodio ? `Intención del episodio: "${intencion_del_episodio}"` : ""}
${tono ? `Tono solicitado: ${tono}` : "Tono: íntimo-directo LATAM"}
${restricciones ? `Restricciones: "${restricciones}"` : ""}
${episode_number ? `Número de episodio: ${episode_number}` : "Número de episodio: XX (placeholder)"}

Estructura: monólogo de 13–15 minutos, esqueleto AMTME de 7 bloques narrativos.

Responde ÚNICAMENTE con un JSON válido con esta estructura exacta, sin markdown, sin backticks, sin explicaciones:

{
${fieldInstructions}
}`;

    const idempotencyKey = `${user.id}:generate_all:${episode_number ?? "na"}`;
    const orchestrated = await withIdempotency(idempotencyKey, () => callAIWithResilience(
      [
        { role: "system", content: AMTME_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      0.7,
      {
        request_id: req.headers.get("x-request-id") ?? crypto.randomUUID(),
        user_id: user.id,
        action: "generate_all_fields",
      },
    ));

    if (!orchestrated.text) {
      return new Response(JSON.stringify(buildUIEnvelope({
        status: orchestrated.status,
        error_code: orchestrated.error_code,
        retryable: orchestrated.retryable,
        provider_used: orchestrated.provider_used,
        fallback_used: orchestrated.fallback_used,
        message: orchestrated.message,
        request_id: orchestrated.request_id,
      })), {
        status: 200,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    let parsed;
    try {
      const jsonMatch = orchestrated.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON found in response");
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      console.error("Failed to parse AI response:", orchestrated.text);
      throw new Error("Failed to parse AI response as JSON");
    }

    const requiredFields = ["working_title", "theme", "core_thesis", "summary", "hook", "cta", "quote", "descripcion_spotify"];
    for (const field of requiredFields) {
      if (!parsed[field]) {
        console.warn(`Missing field in AI response: ${field}`);
        parsed[field] = "";
      }
    }

    return new Response(JSON.stringify({
      fields: parsed,
      ...buildUIEnvelope({
        status: orchestrated.status,
        error_code: orchestrated.error_code,
        retryable: orchestrated.retryable,
        provider_used: orchestrated.provider_used,
        fallback_used: orchestrated.fallback_used,
        message: orchestrated.message,
        request_id: orchestrated.request_id,
      }),
      metadata: {
        source_type: "ai_generated",
        source_module: "episode_creation",
        generated_at: new Date().toISOString(),
      },
    }), {
      status: 200,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("generate-episode-fields error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    const code = message.includes("Créditos") ? "QUOTA_EXCEEDED" : "INTERNAL_ERROR";
    const status = message.includes("Créditos") ? 402 : 500;
    return errorResponse(cors, code, message, status);
  }
});
