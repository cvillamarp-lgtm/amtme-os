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

    const { pieces, episodeTitle, episodeNumber, thesis } = await req.json();

    if (!pieces || !Array.isArray(pieces) || pieces.length === 0) {
      return new Response(JSON.stringify({ error: "Se requiere al menos una pieza" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    const ai = resolveAI();

    const pieceNames = pieces.map((p: { id: number; name: string; copy: string }) =>
      `Pieza ${p.id} (${p.name}): Copy → "${p.copy}"`
    ).join("\n");

    const systemPrompt = `Eres un estratega de redes sociales del podcast "A Mi Tampoco Me Explicaron" (AMTME).
Tu tarea: generar captions editoriales y hashtags para piezas visuales de Instagram.

ESTILO DEL COPY:
- Sobrio, editorial, psicológico, sin exclamaciones ni emojis
- Frases cortas, directas, con peso emocional
- Tono íntimo, no marketero
- Cada caption debe tener 2-4 oraciones máximo
- Los hashtags deben ser relevantes al tema, mix de generales y específicos (8-12 hashtags)

Devuelve ÚNICAMENTE un JSON válido sin markdown ni bloques de código.
El JSON debe ser un array con objetos { "pieceId": number, "caption": string, "hashtags": string }`;

    const userPrompt = `Episodio ${episodeNumber || "XX"}: "${episodeTitle || "Sin título"}"
Tesis: ${thesis || "No especificada"}

Genera captions y hashtags para estas piezas:
${pieceNames}`;

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
