import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { getCorsHeaders } from "../_shared/cors.ts";

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

const AMTME_SYSTEM_PROMPT = `Eres el director editorial del podcast A Mí Tampoco Me Explicaron (AMTME).
Host: Christian Villamar (@yosoyvillamar). Base: Playa del Carmen, México.
Audiencia: hombres hispanos 28–44 años, LATAM. 90% hombres. Personas que cargan con patrones emocionales que no saben nombrar.

POSICIONAMIENTO: "El único podcast en español que habla directamente a hombres hispanos sobre amor, apego e identidad — sin juicio, sin poses, sin el discurso de quien ya lo resolvió todo."

TONO: Directo, íntimo, primera persona. Como un amigo honesto que ha vivido lo que habla. Sin condescendencia. Sin autoayuda superficial.
FILOSOFÍA: "Aquí no juzgamos. Acompañamos."
IDIOMA: Español neutro LATAM. Nunca rioplatense.
ESTILO: Íntimo, emocional, simbólico, reflexivo, honesto, vulnerable pero claro.

SÍ DECIMOS: "Hablamos de..." / "¿Alguna vez sentiste...?" / "Esto no tiene una respuesta fácil." / "Yo también estoy en eso."
NUNCA DECIMOS: "En este episodio te enseño..." / "La solución es simple..." / "Ya lo superé" / "aprender a amarte" / "sanar" / "ser tu mejor versión" / "dejar ir" / "fluir" / "crecer" / "herramientas para X"

VALORES: Acompañamiento (al lado, no por encima) · Honestidad radical (desde donde estamos, no donde quisiéramos) · La carga compartida (nombrarlo ya alivia).
TEMAS: relaciones, patrones de apego, autosabotaje, validación, identidad, miedo al abandono, verdades incómodas sobre vínculos.

Tu trabajo es generar opciones de CONFLICTO CENTRAL e INTENCIÓN que sean:
- Editorialmente potentes y memorables
- Con alta identificación emocional y tensión psicológica real
- Con potencial viral por verdad incómoda, especificidad emocional o reconocimiento doloroso
- Que eviten completamente los clichés de autoayuda superficial
- Que suenen como algo que el oyente ha vivido pero nunca supo cómo nombrar`;

serve(async (req) => {
  const cors = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: cors });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const ai = resolveAI();

    const { idea_principal, tono } = await req.json();

    if (!idea_principal?.trim()) {
      return new Response(JSON.stringify({ error: "idea_principal is required" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const userPrompt = `Para un episodio de AMTME con esta idea principal:

"${idea_principal}"
${tono ? `Tono del episodio: ${tono}` : ""}

Genera exactamente 3 opciones de CONFLICTO CENTRAL y 3 opciones de INTENCIÓN DEL EPISODIO.

═══ CONFLICTO CENTRAL — 3 ángulos narrativos distintos ═══

Opción 1 — Tipo: emocional_interno
Lo que el oyente siente internamente: qué evita, qué repite, qué no sabe nombrar, qué carga sin entender por qué.
La frase debe nombrar una experiencia interna que el oyente reconoce pero nunca tuvo palabras para describir.

Opción 2 — Tipo: relacional_vincular
Cómo ese conflicto se manifiesta en vínculos reales: pareja, apego, validación, miedo al abandono, distancia emocional, necesidad de ser elegido, dinámica de poder en relaciones.
La frase debe hacer que el oyente piense "esto es exactamente lo que me pasa con esa persona".

Opción 3 — Tipo: identitario_existencial
Qué parte de la identidad, el autoconcepto o la autoestima está en juego. El miedo más profundo: no ser suficiente, no merecer, perder quién es al conectar con alguien.
La frase debe tocar el núcleo de la identidad, no solo el comportamiento.

═══ INTENCIÓN DEL EPISODIO — 3 transformaciones posibles ═══

Opción 1 — Tipo: insight
Que el oyente entienda algo específico que no estaba logrando ver. Una verdad concreta, no obvia, que lo haga decir "nunca lo había pensado así".
La frase comienza con "Que el oyente..." y describe qué va a entender.

Opción 2 — Tipo: validacion
Que el oyente se sienta comprendido, acompañado y menos roto. Que escuche el episodio y piense "alguien más lo vive igual que yo".
La frase comienza con "Que el oyente..." y describe qué va a sentir o reconocer.

Opción 3 — Tipo: transformacion
Que el oyente salga con una decisión, un cambio de criterio interno, o una acción pequeña pero concreta. Movimiento real, no intención genérica.
La frase comienza con "Que el oyente..." y describe qué va a hacer o cambiar.

═══ REGLAS DE CALIDAD ═══
✓ Cada "texto" debe tener entre 15 y 35 palabras — frase principal, memorable, con tensión emocional real
✓ Cada "label" debe ser un nombre corto del ángulo — 3 a 5 palabras en mayúsculas, sin verbos infinitivos
✓ Cada "ayuda" debe ser una línea que oriente para qué sirve elegir esa opción — máximo 15 palabras
✓ NUNCA usar: "aprender a amarte", "sanar", "ser tu mejor versión", "dejar ir", "fluir", "crecer", "herramientas para X"
✓ SIEMPRE: específico, tenso, con verdad incómoda o reconocimiento doloroso
✓ El texto de cada opción debe sonar como algo que el oyente ya vivió, no como consejo

Responde ÚNICAMENTE con este JSON válido, sin markdown, sin backticks, sin texto adicional:

{
  "conflicto_central": [
    { "tipo": "emocional_interno", "label": "...", "texto": "...", "ayuda": "..." },
    { "tipo": "relacional_vincular", "label": "...", "texto": "...", "ayuda": "..." },
    { "tipo": "identitario_existencial", "label": "...", "texto": "...", "ayuda": "..." }
  ],
  "intencion": [
    { "tipo": "insight", "label": "...", "texto": "...", "ayuda": "..." },
    { "tipo": "validacion", "label": "...", "texto": "...", "ayuda": "..." },
    { "tipo": "transformacion", "label": "...", "texto": "...", "ayuda": "..." }
  ]
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
        temperature: 0.85,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Límite de solicitudes excedido. Intenta en unos segundos." }), {
          status: 429, headers: { ...cors, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA insuficientes." }), {
          status: 402, headers: { ...cors, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content?.trim();
    if (!content) throw new Error("No content in AI response");

    let parsed;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON found");
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      console.error("Parse error:", content);
      throw new Error("Failed to parse AI response as JSON");
    }

    // Validate structure
    if (!Array.isArray(parsed.conflicto_central) || parsed.conflicto_central.length !== 3) {
      throw new Error("Invalid conflicto_central in response");
    }
    if (!Array.isArray(parsed.intencion) || parsed.intencion.length !== 3) {
      throw new Error("Invalid intencion in response");
    }

    return new Response(JSON.stringify({ options: parsed }), {
      status: 200,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("generate-conflict-options error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
    );
  }
});
