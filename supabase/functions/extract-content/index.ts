import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
  "https://amitampocomeexplicaron.com",
  "https://www.amitampocomeexplicaron.com",
  "https://amtmeos.vercel.app",
  "http://localhost:5173",
  "http://localhost:8080",
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("Origin") ?? "";
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function resolveAI(): { url: string; key: string; model: string } {
  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  if (openaiKey) {
    return {
      url: "https://api.openai.com/v1/chat/completions",
      key: openaiKey,
      model: "gpt-4o-mini",
    };
  }
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  if (lovableKey) {
    return {
      url: "https://ai.gateway.lovable.dev/v1/chat/completions",
      key: lovableKey,
      model: "openai/gpt-4o-mini",
    };
  }
  throw new Error(
    "No AI API key configured. Set OPENAI_API_KEY or LOVABLE_API_KEY in Supabase Edge Function secrets."
  );
}

serve(async (req) => {
  const cors = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    // Validate JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401, headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const { script, title, theme } = await req.json();

    const combinedInput = [
      title ? `Título: ${title}` : "",
      theme ? `Tema: ${theme}` : "",
      script ? `Guión: ${script}` : "",
    ].filter(Boolean).join("\n\n");

    if (combinedInput.length < 30) {
      return new Response(JSON.stringify({ error: "El contenido es demasiado corto para analizar" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    const ai = resolveAI();

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

    const response = await fetch(ai.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ai.key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: ai.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Límite de uso alcanzado, intenta de nuevo más tarde." }), {
          status: 429, headers: { ...cors, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos agotados." }), {
          status: 402, headers: { ...cors, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Error del servicio de IA" }), {
        status: 500, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const rawContent: string = data.choices?.[0]?.message?.content ?? "";

    const cleaned = rawContent
      .replace(/^```json?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("JSON parse error. Raw content:", rawContent);
      return new Response(JSON.stringify({ error: "La IA no devolvió un JSON válido. Intenta de nuevo." }), {
        status: 500, headers: { ...cors, "Content-Type": "application/json" },
      });
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
          parsed.pieceCopy[String(idx + 1)] = Object.values(pieceData).filter((v: any) => typeof v === "string");
        }
      });
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("extract-content error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
