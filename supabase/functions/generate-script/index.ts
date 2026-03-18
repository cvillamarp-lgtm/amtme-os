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

/** Resolves AI endpoint + key. Priority: Groq → OpenAI → Lovable gateway. */
function resolveAI(): { url: string; key: string; model: string } {
  const groqKey = Deno.env.get("GROQ_API_KEY");
  if (groqKey) {
    return {
      url: "https://api.groq.com/openai/v1/chat/completions",
      key: groqKey,
      model: "llama-3.1-8b-instant",
    };
  }
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
    "No AI API key configured. Set GROQ_API_KEY, OPENAI_API_KEY or LOVABLE_API_KEY in Supabase Edge Function secrets."
  );
}

serve(async (req) => {
  const cors = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    // Auth validation
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: claimsError } = await supabase.auth.getUser();
    if (claimsError || !user) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const { theme, title, format: epFormat } = await req.json();

    if (!theme && !title) {
      return new Response(JSON.stringify({ error: "Se requiere un tema o título" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    const ai = resolveAI();

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
        stream: true,
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

    return new Response(response.body, {
      headers: { ...cors, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("generate-script error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
