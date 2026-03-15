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

    const { pieces, episodeTitle, episodeNumber, thesis } = await req.json();

    if (!pieces || !Array.isArray(pieces) || pieces.length === 0) {
      return new Response(JSON.stringify({ error: "Se requiere al menos una pieza" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

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
      console.error("JSON parse error. Raw:", rawContent);
      return new Response(JSON.stringify({ error: "La IA no devolvió un JSON válido. Intenta de nuevo." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ captions: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-captions error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
