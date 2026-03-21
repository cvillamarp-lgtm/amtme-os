import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/extract-helpers.ts";
import { callAI } from "../_shared/ai.ts";
import { errorResponse } from "../_shared/response.ts";

const AMTME_CONTEXT = `Podcast: "A Mi Tampoco Me Explicaron" (AMTME). Host: Christian Villamar.
Audiencia: hombres hispanos 28-44 años, LATAM.
Tono: directo, íntimo, psicológico, como un amigo honesto.
Estilo: sobrio, editorial, sin exclamaciones ni emojis.`;

serve(async (req) => {
  const cors = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    // Auth validation
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return errorResponse(cors, "UNAUTHORIZED", "Missing authorization", 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return errorResponse(cors, "UNAUTHORIZED", "Invalid token", 401);
    }
    const body = await req.json();
    const { script, mode, episode_title, episode_number } = body;

    if (!script || script.trim().length < 50) {
      return errorResponse(cors, "VALIDATION_ERROR", "El guión es demasiado corto", 400);
    }

    if (!["quotes", "insights", "both"].includes(mode)) {
      return errorResponse(cors, "VALIDATION_ERROR", "mode debe ser: quotes, insights, o both", 400);
    }

    const episodeContext = [
      episode_number ? `Episodio #${episode_number}` : "",
      episode_title ? `Título: "${episode_title}"` : "",
    ].filter(Boolean).join(" — ");

    // ─── MODE: quotes ──────────────────────────────────────────────────────────
    const quotesPrompt = `Eres un editor de contenido del podcast AMTME. ${AMTME_CONTEXT}

Analiza este guión y extrae las 6-10 frases más poderosas como candidatas a citas.

CRITERIOS DE SELECCIÓN:
- Afirmaciones con alto peso emocional o psicológico
- Frases que funcionan solas sin contexto
- Insights que el oyente querrá compartir
- Máximo 30 palabras por cita
- Sin frases de transición ni de presentación

TIPOS DE CITA:
- hook: frase de apertura impactante
- revelation: insight profundo o verdad incómoda
- punchline: remate con humor o ironía
- closing: frase de cierre memorable
- social: ideal para publicar en redes
- question: pregunta que incomoda o desafía
- bridge: transición entre ideas importantes
- opening: apertura de sección narrativa

Responde ÚNICAMENTE con un JSON válido (sin markdown, sin backticks):
{
  "quotes": [
    {
      "text": "texto exacto de la frase",
      "quote_type": "hook|revelation|punchline|closing|social|question|bridge|opening",
      "timestamp_hint": "descripción breve de dónde aparece en el guión (ej: 'intro', 'mitad', 'cierre')",
      "rationale": "por qué esta frase es poderosa (1 línea)"
    }
  ]
}`;

    // ─── MODE: insights ────────────────────────────────────────────────────────
    const insightsPrompt = `Eres un estratega de aprendizaje del podcast AMTME. ${AMTME_CONTEXT}

Analiza este guión y extrae 4-8 hipótesis o experimentos de aprendizaje que el host podría implementar o validar.

CRITERIOS:
- Hipótesis sobre comportamiento del oyente, distribución de contenido, o formato narrativo
- Experimentos que se pueden medir o validar en 1-4 semanas
- Ideas de mejora para próximos episodios
- Patrones o tendencias identificados en el guión

CATEGORÍAS:
- content: sobre el contenido del episodio
- format: sobre el formato narrativo o duración
- distribution: sobre canales y plataformas
- audience: sobre la respuesta esperada de la audiencia
- production: sobre la calidad o proceso de producción

Responde ÚNICAMENTE con un JSON válido (sin markdown, sin backticks):
{
  "insights": [
    {
      "hypothesis": "Si [condición], entonces [resultado esperado]",
      "category": "content|format|distribution|audience|production",
      "potential_action": "acción concreta para validar esta hipótesis (1-2 líneas)",
      "rationale": "por qué este insight es relevante para AMTME"
    }
  ]
}`;

    const scriptTruncated = script.substring(0, 8000); // limit to ~2000 tokens

    const results: Record<string, unknown> = {};

    // Fetch quotes if needed
    if (mode === "quotes" || mode === "both") {
      const content = await callAI([
        { role: "system", content: quotesPrompt },
        { role: "user", content: `${episodeContext ? episodeContext + "\n\n" : ""}GUIÓN:\n${scriptTruncated}` },
      ], 0.6);
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON in quotes response");
      const parsed = JSON.parse(jsonMatch[0]);
      results.quotes = parsed.quotes || [];
    }

    if (mode === "insights" || mode === "both") {
      const content = await callAI([
        { role: "system", content: insightsPrompt },
        { role: "user", content: `${episodeContext ? episodeContext + "\n\n" : ""}GUIÓN:\n${scriptTruncated}` },
      ], 0.7);
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON in insights response");
      const parsed = JSON.parse(jsonMatch[0]);
      results.insights = parsed.insights || [];
    }

    return new Response(JSON.stringify(results), {
      status: 200,
      headers: { ...cors, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("extract-from-script error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return errorResponse(cors, "INTERNAL_ERROR", message, 500);
  }
});
