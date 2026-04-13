import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { getCorsHeaders } from "../_shared/cors.ts";

import { callAI, callClaude } from "../_shared/ai.ts";
import { errorResponse } from "../_shared/response.ts";

function streamScriptAsSSE(text: string, cors: Record<string, string>): Response {
  const encoder = new TextEncoder();
  const chunks = text
    .split(/(\s+)/)
    .filter(Boolean)
    .map((part) => `data: ${JSON.stringify({ choices: [{ delta: { content: part } }] })}\n\n`);

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      ...cors,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}

serve(async (req) => {
  const cors = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    // Auth validation
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return errorResponse(cors, "UNAUTHORIZED", "No autorizado", 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: claimsError } = await supabase.auth.getUser();
    if (claimsError || !user) {
      return errorResponse(cors, "UNAUTHORIZED", "No autorizado", 401);
    }

    const { theme, title, format: epFormat } = await req.json();

    if (!theme && !title) {
      return errorResponse(cors, "VALIDATION_ERROR", "Se requiere un tema o título", 400);
    }
    const systemPrompt = `Eres el guionista del podcast A Mí Tampoco Me Explicaron (AMTME).
Host: Christian Villamar (@yosoyvillamar). Español neutro LATAM. Duración: 13-15 minutos.
FILOSOFÍA: "Aquí no juzgamos. Acompañamos."

ESTRUCTURA DE 8 BLOQUES (sigue este orden):
1. GANCHO [0:00-0:20]: Pregunta directa al oyente que nombra un dolor reconocible. Sin presentación larga. Primeras 15-20 segundos.
2. CONTEXTO PERSONAL [0:20-1:30]: Christian sitúa el tema desde su propia experiencia, no como experto. Establece vulnerabilidad y cercanía.
3. LA DISTINCIÓN [1:30-3:30]: El concepto central del episodio. La diferencia que pocos nombran. Simple y clara.
4. EL ESPEJO [3:30-5:00]: Preguntas que invitan al oyente a verse reflejado. Transición de "eso que escucho" a "eso que me pasa".
5. EL GIRO [5:00-7:00]: La reencuadración. La perspectiva nueva que cambia el ángulo de la situación.
6. LO CONCRETO [7:00-8:30]: Una acción, pregunta u observación que el oyente puede llevar a su semana.
7. CIERRE DESDE EL CAMINO [8:30-9:30]: Cierra desde quien también sigue aprendiendo. Sin conclusiones grandiosas. Refuerza que es un proceso compartido.
8. CTA [9:30-10:00]: Breve. "Si conectó contigo, compártelo. Escríbeme por DM. @yosoyvillamar @amtmepodcast"

TONO: Primera persona, íntimo, como hablar con un amigo que también está en eso.
NUNCA: frases de autoayuda ("sanar", "fluir", "crecer"), positividad forzada, hablar desde quien ya lo resolvió todo.

Responde SOLO con el guión en texto plano, sin explicaciones adicionales.`;

    const userPrompt = `Genera un guión de episodio AMTME para:
- Título: ${(title || "Sin título").substring(0, 200)}
- Tema: ${(theme || "Tema libre").substring(0, 500)}
- Formato: ${(epFormat || "Monólogo solo").substring(0, 50)}

El guión debe seguir los 8 bloques, ser conversacional, auténtico y listo para grabar.`;

      let scriptText = "";

      try {
        if (Deno.env.get("ANTHROPIC_API_KEY")) {
          scriptText = await callClaude(systemPrompt, userPrompt, 2200);
        } else {
          scriptText = await callAI([
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ], 0.7);
        }
      } catch (primaryError) {
        console.error("[generate-script] primary AI call failed:", primaryError);
        try {
          scriptText = await callAI([
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ], 0.7);
        } catch (fallbackError) {
          console.error("[generate-script] fallback AI call failed:", fallbackError);
          const message = fallbackError instanceof Error ? fallbackError.message : "Error del servicio de IA";
          const status = message.toLowerCase().includes("rate") ? 429 : 500;
          return errorResponse(cors, "AI_ERROR", message, status);
        }
      }

      if (!scriptText.trim()) {
        return errorResponse(cors, "AI_ERROR", "La IA no devolvió contenido para el guión.", 502);
      }

      return streamScriptAsSSE(scriptText, cors);
  } catch (e) {
    console.error("generate-script error:", e);
    return errorResponse(cors, "INTERNAL_ERROR", e instanceof Error ? e.message : "Unknown error", 500);
  }
});
