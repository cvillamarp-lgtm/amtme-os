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
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  if (lovableKey) {
    return {
      url: "https://ai.gateway.lovable.dev/v1/chat/completions",
      key: lovableKey,
      model: "openai/gpt-4o-mini",
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
  throw new Error(
    "No AI API key configured. Set LOVABLE_API_KEY or OPENAI_API_KEY in Supabase Edge Function secrets."
  );
}

const AMTME_SYSTEM_PROMPT = `Eres el sistema de producción del podcast A Mí Tampoco Me Explicaron (AMTME).
Host: Christian Villamar (@yosoyvillamar). Base: Playa del Carmen.
Audiencia: hombres hispanos 28–44 años, LATAM.
Tono: directo, íntimo, como un amigo honesto. Humor ácido estratégico, máximo 4–5 momentos por episodio, nunca al abrir ni cerrar.
Filosofía: "Aquí no juzgamos. Acompañamos."
Idioma: español neutro LATAM. Nunca rioplatense.
Duración objetivo: 13–15 minutos hablados.
Formato de nombre: Ep. XX — [Título]
Paleta: Cobalt #1A1AE6 / Crema #F5F0E8 / Oscuro #0D0D1A
Tarot: herramienta de autoconocimiento, nunca predicción.`;

const FIELD_INSTRUCTIONS: Record<string, string> = {
  working_title: 'título de trabajo interno, formato Ep. XX — [Título]. Máximo 7 palabras en el título. Usa arquetipo: verdad que nadie dice / pregunta que incomoda / costo invisible / inversión de expectativa.',
  theme: 'el tema en una línea. Sin adornos.',
  core_thesis: 'la idea central que sostiene el episodio. Una sola oración. Que el oyente pueda repetirla después de escuchar.',
  summary: 'resumen del episodio. Máximo 60 palabras. Español neutro. Sin spoilers del cierre.',
  hook: 'frase de apertura. Máximo 10 palabras. Pregunta o afirmación que nombre una experiencia que el oyente ya vivió pero no tenía palabras para describir. Sin presentación, directo al conflicto.',
  cta: 'llamada a la acción. Una línea con razón emocional real. Menciona @yosoyvillamar y @amtmepodcast. Cierra con: Nos escuchamos. — A Mí Tampoco Me Explicaron',
  quote: 'frase más poderosa del episodio. Máximo 12 palabras. Funciona sola sin contexto. Afirmación, no consejo.',
  descripcion_spotify: 'máximo 120 palabras. Estructura: Hook → problema central (2 líneas) → qué va a entender el oyente → herramienta práctica que se lleva → cierra con Aquí no juzgamos. Acompañamos.',
};

serve(async (req) => {
  const cors = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: cors });
  }

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

    const ai = resolveAI();

    const body = await req.json();
    const { mode } = body;

    // ─── Mode: Regenerate single field ───────────────────────────
    if (mode === "regenerate_field") {
      const { field_name, idea_principal, current_fields, episode_number } = body;
      if (!field_name || !FIELD_INSTRUCTIONS[field_name]) {
        return new Response(JSON.stringify({ error: `Invalid field_name: ${field_name}` }), {
          status: 400,
          headers: { ...cors, "Content-Type": "application/json" },
        });
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

      const response = await fetch(ai.url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${ai.key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: ai.model,
          messages: [
            { role: "system", content: AMTME_SYSTEM_PROMPT },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        if (response.status === 429) return new Response(JSON.stringify({ error: "Límite de solicitudes excedido." }), { status: 429, headers: { ...cors, "Content-Type": "application/json" } });
        if (response.status === 402) return new Response(JSON.stringify({ error: "Créditos de IA insuficientes." }), { status: 402, headers: { ...cors, "Content-Type": "application/json" } });
        throw new Error(`AI gateway error: ${response.status}`);
      }

      const aiData = await response.json();
      const value = aiData.choices?.[0]?.message?.content?.trim();
      if (!value) throw new Error("No content in AI response");

      return new Response(JSON.stringify({
        value,
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

    // ─── Mode: Generate all 8 fields (original) ─────────────────
    const { idea_principal, conflicto_central, intencion_del_episodio, tono, restricciones, episode_number } = body;

    if (!idea_principal) {
      return new Response(JSON.stringify({ error: "idea_principal is required" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
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

    const response = await fetch(ai.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ai.key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: ai.model,
        messages: [
          { role: "system", content: AMTME_SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) return new Response(JSON.stringify({ error: "Límite de solicitudes excedido. Intenta en unos minutos." }), { status: 429, headers: { ...cors, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "Créditos de IA insuficientes." }), { status: 402, headers: { ...cors, "Content-Type": "application/json" } });
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content;
    if (!content) throw new Error("No content in AI response");

    let parsed;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON found in response");
      parsed = JSON.parse(jsonMatch[0]);
    } catch (parseErr) {
      console.error("Failed to parse AI response:", content);
      throw new Error("Failed to parse AI response as JSON");
    }

    const requiredFields = ["working_title", "theme", "core_thesis", "summary", "hook", "cta", "quote", "descripcion_spotify"];
    for (const field of requiredFields) {
      if (!parsed[field]) {
        console.warn(`Missing field in AI response: ${field}`);
        parsed[field] = "";
      }
    }

    const now = new Date().toISOString();
    const metadata = {
      source_type: "ai_generated",
      source_module: "episode_creation",
      generated_at: now,
    };

    return new Response(JSON.stringify({ fields: parsed, metadata }), {
      status: 200,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("generate-episode-fields error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
