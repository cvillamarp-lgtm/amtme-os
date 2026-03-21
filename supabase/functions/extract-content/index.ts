import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders } from "../_shared/extract-helpers.ts";
import { callAI } from "../_shared/ai.ts";
import { errorResponse } from "../_shared/response.ts";

serve(async (req) => {
  const cors = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    // Require Authorization header (JWT validation handled by --no-verify-jwt gateway flag)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return errorResponse(cors, "UNAUTHORIZED", "Missing authorization", 401);
    }

    const { script, title, theme } = await req.json();

    const combinedInput = [
      title ? `Título: ${title}` : "",
      theme ? `Tema: ${theme}` : "",
      script ? `Guión: ${script}` : "",
    ].filter(Boolean).join("\n\n");

    if (combinedInput.length < 30) {
      return errorResponse(cors, "VALIDATION_ERROR", "El contenido es demasiado corto para analizar", 400);
    }
    const systemPrompt = `Eres un estratega de contenido del podcast "A Mi Tampoco Me Explicaron" (AMTME).
Tu tarea: analizar un guión/tema de podcast y extraer los datos necesarios para producir 15 piezas visuales.
Devuelve ÚNICAMENTE un objeto JSON válido. Sin explicaciones, sin markdown, sin bloques de código.

REGLAS DEL COPY GENERADO:
- MAYÚSCULAS para titulares principales
- Máximo 4-5 palabras por línea
- Frases cortas, directas, con peso emocional
- Estilo: sobrio, editorial, psicológico, sin exclamaciones ni emojis

El JSON debe tener EXACTAMENTE esta estructura:
{
  "thesis": "la idea núcleo del episodio en 1-2 oraciones directas",
  "keyPhrases": ["frase corta 1", "frase corta 2", "frase corta 3", "frase corta 4", "frase corta 5"],
  "pieceCopy": {
    "1": ["FRASE PRINCIPAL", "LÍNEA 2", "", "EP. XX", "A MI TAMPOCO ME EXPLICARON"],
    "2": ["TITULAR 1", "TITULAR 2", "TITULAR 3", "", "NUEVO EPISODIO", "EP. XX", "@yosoyvillamar"],
    "3": ["TITULAR REEL", "LÍNEA 2", "", "EP. XX", "A MI TAMPOCO ME EXPLICARON"],
    "4": ["NUEVO EPISODIO", "", "TITULAR", "LÍNEA 2", "LÍNEA 3", "", "ESCÚCHALO YA", "EP. XX", "@yosoyvillamar"],
    "5": ["FRASE PARTE 1", "", "FRASE PARTE 2", "", "EP. XX", "A MI TAMPOCO ME EXPLICARON"],
    "6": ["FRASE QUOTE", "LÍNEA 2", "LÍNEA 3", "", "EP. XX", "A MI TAMPOCO ME EXPLICARON"],
    "7": ["TITULAR SLIDE 1", "CONTINUACIÓN", "", "01", "EP. XX"],
    "8": ["IDEA ÚNICA", "LÍNEA 2", "", "02"],
    "9": ["TENSIÓN PARTE A", "", "TENSIÓN PARTE B", "", "03"],
    "10": ["FRASE IMPACTO", "CONCEPTO", "", "04"],
    "11": ["FRASE CLAVE", "LÍNEA 2", "LÍNEA 3", "", "05"],
    "12": ["FRASE CONTUNDENTE", "CONTINUACIÓN", "", "06"],
    "13": ["CLÍMAX EMOCIONAL", "LÍNEA 2", "LÍNEA 3", "", "07"],
    "14": ["GUÁRDALO", "COMPÁRTELO", "", "ESCUCHA", "EL EPISODIO XX", "", "@yosoyvillamar", "08"],
    "15": ["XX"]
  }
}

Cada key en pieceCopy es el número de pieza (1-15). Los valores son arrays de strings con el copy para esa pieza.
Genera copy real basado en el contenido, no uses placeholders.`;

    const userPrompt = `Analiza este contenido de podcast y genera el copy para las 15 piezas visuales:\n\n${combinedInput.substring(0, 8000)}`;

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
      console.error("JSON parse error. Raw content:", rawContent);
      return errorResponse(cors, "AI_ERROR", "La IA no devolvió un JSON válido. Intenta de nuevo.", 500);
    }

    // Ensure the response has the expected structure
    if (!parsed.thesis && parsed.seccionA) {
      // Convert old format to new format
      parsed.thesis = parsed.seccionA.tesisCentral || "";
      parsed.keyPhrases = parsed.seccionA.frasesClaves || [];
    }

    if (!parsed.pieceCopy && parsed.seccionB) {
      const secBKeys = [
        "portada", "lanzamiento", "reel", "story_lanzamiento", "story_quote",
        "quote_feed", "slide1", "slide2", "slide3", "slide4",
        "slide5", "slide6", "slide7", "slide8", "highlight",
      ];
      parsed.pieceCopy = {};
      secBKeys.forEach((key, idx) => {
        const pieceData = parsed.seccionB[key];
        if (pieceData && typeof pieceData === "object") {
          parsed.pieceCopy[String(idx + 1)] = Object.values(pieceData).filter((v: unknown) => typeof v === "string");
        }
      });
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("extract-content error:", e);
    return errorResponse(cors, "INTERNAL_ERROR", e instanceof Error ? e.message : "Unknown error", 500);
  }
});
