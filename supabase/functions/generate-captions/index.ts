import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { getCorsHeaders } from "../_shared/cors.ts";
import { callAI } from "../_shared/ai.ts";

serve(async (req) => {
  const cors = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    // Require Authorization header (JWT validation handled by --no-verify-jwt gateway flag)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const { pieces, episodeTitle, episodeNumber, thesis } = await req.json();

    if (!pieces || !Array.isArray(pieces) || pieces.length === 0) {
      return new Response(JSON.stringify({ error: "Se requiere al menos una pieza" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    const pieceNames = pieces.map((p: { id: number; name: string; copy: string }) =>
      `Pieza ${p.id} (${p.name}): Copy → "${p.copy}"`
    ).join("\n");

    const systemPrompt = `Eres el estratega de redes del podcast A Mí Tampoco Me Explicaron (AMTME).
Host: @yosoyvillamar | Audiencia: hombres hispanos 28-44 años, LATAM.
FILOSOFÍA: "Aquí no juzgamos. Acompañamos."

CAPTIONS PARA INSTAGRAM:
- Sobrio, editorial, psicológico. Sin exclamaciones ni emojis superficiales.
- Primera línea: pregunta o tensión que detiene el scroll (CTA visible antes del "ver más").
- 150-220 palabras por caption. Tono íntimo, no marketero. Primera persona o segunda persona.
- NUNCA: "aprende a amarte", "fluir", "sanar", "ser tu mejor versión", frases de autoayuda vacías.
- SIEMPRE: específico, emocional, tensión real, reconocimiento doloroso o verdad incómoda.

HASHTAGS (máximo 8 por pieza):
- Obligatorios: #AMíTampocoMeExplicaron #christianvillamar
- 2-3 del tema específico del episodio
- 2-3 generales: #amorpropio #autoconocimiento #podcastenespañol
- Nunca hashtags irrelevantes para inflar.

Devuelve ÚNICAMENTE un JSON válido sin markdown ni bloques de código.
El JSON debe ser un array con objetos { "pieceId": number, "caption": string, "hashtags": string }`;

    const userPrompt = `Episodio ${episodeNumber || "XX"}: "${episodeTitle || "Sin título"}"
Tesis: ${thesis || "No especificada"}

Genera captions y hashtags para estas piezas:
${pieceNames}`;

    const rawContent = await callAI([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ]);

    const cleaned = rawContent
      .replace(/^```json?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("JSON parse error. Raw:", rawContent);
      return new Response(JSON.stringify({ error: "La IA no devolvió un JSON válido. Intenta de nuevo." }), {
        status: 500, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ captions: parsed }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-captions error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
