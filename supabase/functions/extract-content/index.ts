import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Validate JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
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
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

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

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
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
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos agotados." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Error del servicio de IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
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
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
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
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("extract-content error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
