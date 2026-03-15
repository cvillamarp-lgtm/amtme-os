import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY no configurado");

    const { episodio, tesis } = await req.json();
    if (!episodio || !tesis) {
      return new Response(JSON.stringify({ error: "Se requiere episodio y tesis" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `Eres el director creativo del podcast "A Mi Tampoco Me Explicaron" (AMTME).
Tu tarea: generar el COPY TIPOGRÁFICO que aparece DENTRO de cada pieza visual de Instagram.

REGLAS ABSOLUTAS:
- TODO EN MAYÚSCULAS
- Máximo 6-8 palabras por línea
- Usa saltos de línea (\\n) para separar bloques visuales
- Frases cortas, contundentes, psicológicas
- Tono editorial, íntimo, sobrio — NUNCA motivacional ni marketero
- Sin signos de exclamación ni emojis
- El copy debe generar tensión, identificación o urgencia emocional
- Siempre incluir "EP. [número]" y "@yosoyvillamar" donde corresponda según las instrucciones de cada pieza

Devuelve ÚNICAMENTE un JSON válido sin markdown. Formato exacto:
{
  "copy_portada": "...",
  "copy_lanzamiento": "...",
  "copy_reel": "...",
  "copy_story_lanzamiento": "...",
  "copy_story_quote": "...",
  "copy_quote_feed": "...",
  "copy_slide1": "...",
  "copy_slide2": "...",
  "copy_slide3": "...",
  "copy_slide4": "...",
  "copy_slide5": "...",
  "copy_slide6": "...",
  "copy_slide7": "...",
  "copy_slide8": "...",
  "copy_highlight": "..."
}`;

    const userPrompt = `Episodio: ${episodio}
Tesis central: "${tesis}"

Genera el copy tipográfico para las 15 piezas visuales del episodio. Instrucciones por pieza:

copy_portada (Feed 1:1): Frase principal del episodio, 2-3 bloques. Incluir número de episodio y nombre del podcast al final.

copy_lanzamiento (Feed 4:5): Titular dominante + señal de nuevo episodio + usuario. Incluir "NUEVO EPISODIO", número y @yosoyvillamar.

copy_reel (9:16 vertical): Título corto impactante + número de episodio. Máximo 2 bloques.

copy_story_lanzamiento (9:16): "NUEVO EPISODIO" arriba + título + CTA corto ("ESCÚCHALO YA" o similar) + número + usuario.

copy_story_quote (9:16): Una sola frase emocional del episodio, extendida con saltos de línea. Número al final.

copy_quote_feed (Feed 4:5): Frase corta y guardable. Máximo 4 líneas. Número al final.

copy_slide1 (Carrusel portada): Frase de anclaje que genere curiosidad + "01" + número de episodio.

copy_slide2: Una idea contundente del episodio + "02".

copy_slide3: Tensión entre dos ideas opuestas (estructura "CUANDO X / Y CUANDO X / Z") + "03".

copy_slide4: La frase de mayor impacto del episodio + "04".

copy_slide5: Afirmación sobria y directa + "05".

copy_slide6: Bloque tipográfico tenso, puede ser pregunta retórica + "06".

copy_slide7 (Clímax emocional): La frase más poderosa, máximo espacio negativo, 1-2 líneas + "07".

copy_slide8 (CTA final): CTA directo + invitación a escuchar + usuario + "08".

copy_highlight (1:1 circular): Solo el número del episodio en formato corto, ej: "14" o "EP.14". Máximo 2 caracteres/palabras.`;

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
        return new Response(JSON.stringify({ error: "Límite de uso alcanzado, intenta de nuevo." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error:", response.status, t);
      return new Response(JSON.stringify({ error: "Error del servicio de IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await response.json();
    const rawContent: string = aiData.choices?.[0]?.message?.content ?? "";

    const cleaned = rawContent
      .replace(/^```json?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    let parsed: Record<string, string>;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("JSON parse error. Raw:", rawContent);
      return new Response(JSON.stringify({ error: "La IA no devolvió un JSON válido. Intenta de nuevo." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ copy: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-visual-copy error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Error desconocido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
