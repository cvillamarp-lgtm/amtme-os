import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { getCorsHeaders } from "../_shared/cors.ts";

/**
 * Resolves image generation endpoint.
 * Priority: Gemini (free) → OpenAI DALL-E 3 (paid).
 * Groq and LOVABLE_API_KEY are skipped — neither supports external image generation.
 */
function resolveImageAI(): { key: string; provider: "gemini" | "openai" } {
  const geminiKey = Deno.env.get("GEMINI_API_KEY");
  if (geminiKey) return { key: geminiKey, provider: "gemini" };

  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  if (openaiKey) return { key: openaiKey, provider: "openai" };

  throw new Error(
    "No image AI key configured. Get a free GEMINI_API_KEY at aistudio.google.com/apikey and add it to Supabase Edge Function secrets."
  );
}

// Build host reference URLs dynamically from SUPABASE_URL
function getHostReferenceUrl(key: "imagen01" | "imagen02"): string {
  const baseUrl = Deno.env.get("SUPABASE_URL")!;
  return `${baseUrl}/storage/v1/object/public/generated-images/host-${key}.png`;
}

const AMTME_BRAND_PROMPT = `INSTRUCCIÓN MAESTRA DE IMAGEN — AMTME (A MÍ TAMPOCO ME EXPLICARON)
Sistema visual SB-01 — Única paleta permitida en producción.

PALETA OFICIAL SB-01 (cualquier color fuera de esta lista = ERROR de producción):
- Navy #083A4F · RGB 8, 58, 79 — fondo principal CW-01 (el más usado)
- Sand #E5E1DD · RGB 229, 225, 221 — fondo cálido CW-02 · tipografía principal sobre Navy/Teal
- Teal #407E8C · RGB 64, 126, 140 — fondo CW-04 (slides pregunta/CTA)
- Gold #A58D66 · RGB 165, 141, 102 — etiquetas, handles, líneas separadoras
- HL #E8FF40 · RGB 232, 255, 64 — barra de resaltado de 1 palabra. Texto encima: Navy.
- Negro profundo #030A0F — fondo de página exterior
- Blanco #FFFFFF — logos plataformas

REGLAS CROMÁTICAS OBLIGATORIAS:
— Máximo 3 colores activos por pieza (fondo + Sand + Gold/HL).
— La barra HL (#E8FF40) resalta EXACTAMENTE 1 PALABRA por pieza. Texto en esa barra: Navy #083A4F.
— La barra HL NUNCA es fondo completo de la pieza.
— Gold (#A58D66) solo en elementos secundarios: handles, etiquetas, separadores.
— No usar glow ni sombra de color activo.
— Fondo Navy: luminosidad −5% para mayor peso visual.
— Fondo Sand: temperatura +3% cálida para evitar frialdad.

SISTEMA TIPOGRÁFICO (6 NIVELES OBLIGATORIOS):
Color tipografía según el colorway de la pieza:
  — Sobre Navy (CW-01): texto = Sand #E5E1DD · barra HL = #E8FF40 con texto Navy
  — Sobre Sand (CW-02): texto = Navy #083A4F · barra HL = #E8FF40 con texto Navy
  — Sobre Teal (CW-04): texto = Navy #083A4F · barra HL = #E8FF40 con texto Navy
Nivel 1 — Dominante: 100% (72-88px), Black/ExtraBold, color-texto-del-colorway, tracking −10 a 0, interlineado −8% a −10%
Nivel 2 — Secundario: 72% (52-64px), Bold/SemiBold, color-texto-del-colorway, tracking +10
Nivel 3 — Terciario: 60% (44-52px), Medium/Regular, color-texto-del-colorway, tracking +10 a +15
Nivel 4 — Subtítulo: 52% (36-44px), Regular/Light, color-texto-del-colorway opacidad 70%, tracking +15
Nivel 5 — CTA: 45% (32-38px), Medium/Condensado, color-texto-del-colorway opacidad 90%, tracking +20 a +30
Nivel 6 — Firma/Handle/Logos: 38% (24-28px), Light, Gold #A58D66 opacidad 85%, tracking +30 a +40

REGLAS TIPOGRÁFICAS:
— Sans serif editorial contemporánea (Inter, Neue Haas, Helvetica Neue).
— No usar cursivas NUNCA. No duplicar dominantes. Máx. 2 pesos por bloque.
— Mayúsculas siempre. Máx. 12-16 palabras por línea.

COMPOSICIÓN:
— Retícula 12 columnas, márgenes 90px, gutter 24px.
— Un solo dominante claro por pieza.
— Tipografía NO puede tapar la cara del host.
— Máximo 4 grupos visuales, sin elementos flotantes.
— Espacio negativo activo. Mínimo 40px entre grupos.
— Orden lectura: Dominante → Contexto → Complemento → Subtítulo → CTA → Firma/logos.

FOTOGRAFÍA DEL HOST (OBLIGATORIO — PRESERVAR RASGOS EXACTOS):
— Las fotos de referencia adjuntas son el host REAL. PRESERVAR rasgos faciales, complexión, barba, tatuaje brazo izquierdo.
— Lente 85mm, f/4, ISO 100, 1/125s. Iluminación frontal suave + relleno lateral. Temp 5500-6000K.
— Expresión natural, íntima, no posada. Piel realista sin retoque excesivo.
— Contraste moderado. Saturación −5% a −10%. Color grading cinematográfico.
— Acabado nivel revista editorial. Nitidez alta en ojos y rostro.

ELEMENTOS FIJOS EN TODA PIEZA:
— A MÍ TAMPOCO ME EXPLICARON (siempre mayúsculas, color Sand #E5E1DD sobre Navy)
— Ep. XX — (formato número episodio, color Gold #A58D66)
— @yosoyvillamar (handle, color Gold #A58D66, tracking +30)
— Logos Spotify + Apple Podcasts (blanco #FFFFFF, escala 90%, alineados, separación 24px)
— PODCAST (tag, tracking +40, mayúsculas, pequeño, color Gold #A58D66)

SAFE ZONES:
1080×1080: X 90–990 / Y 90–990 (zona activa 900×900px)
1080×1350: X 90–990 / Y 120–1230 (zona activa 900×1110px)
1080×1920: X 90–990 / Y 250–1670
Ningún texto ni elemento visual puede salir de estas coordenadas.

PROHIBIDO:
— Cualquier color fuera de la paleta oficial
— Distorsión gran angular, sombras duras, saturación excesiva, filtros artificiales
— Glow, 3D, biseles, gradientes, stickers
— Retoque plástico, estética de red social genérica, filtros IG, presets genéricos
— Cursivas, micro-firmas tipo Barra de Navidad
— Lentes menores a 50mm

PSICOLOGÍA DE CONVERSIÓN:
— Se entiende en <0.7s en scroll. Dominante activa en 0.5s. Identificación emocional en 1s. Intriga en 1.5s. CTA en 2s.
— El dominante refleja dolor del oyente, no describe contenido.
— CTA conversacional, no publicitario.
— La pieza genera urgencia emocional sin agresividad.

ESTÁNDAR: Editorial premium. Si hay duda sobre un elemento, ajustar. No "suficientemente bueno".`;

serve(async (req) => {
  const cors = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: claimsError } = await supabaseAuth.auth.getUser();
    if (claimsError || !user) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Extract authenticated user ID for ownership validation
    const userId = user.id;

    const body = await req.json();
    const { prompt, mode, imageUrl: editImageUrl, episodeId, referenceImages, hostReference } = body;

    if (!prompt && mode !== "edit") throw new Error("Prompt is required");
    const ai = resolveImageAI();

    // G: Build host reference URLs dynamically
    const hostRef = hostReference as "imagen01" | "imagen02" | undefined;
    const hostUrls = hostRef
      ? [getHostReferenceUrl(hostRef)]
      : [getHostReferenceUrl("imagen01"), getHostReferenceUrl("imagen02")];

    const allReferenceImages = [...hostUrls, ...(referenceImages || [])];

    const buildContent = (textContent: string, extraImageUrl?: string): any => {
      const parts: any[] = [{ type: "text", text: textContent }];
      for (const refImg of allReferenceImages) {
        parts.push({ type: "image_url", image_url: { url: refImg } });
      }
      if (extraImageUrl) {
        parts.push({ type: "image_url", image_url: { url: extraImageUrl } });
      }
      return parts;
    };

    const hostContextNote = hostRef === "imagen01"
      ? "La foto de referencia muestra al host sentado al revés en silla de madera, camiseta blanca AMTME, cap verde, brazos cruzados. USAR ESTA PERSONA EXACTA."
      : hostRef === "imagen02"
      ? "La foto de referencia muestra al host sentado en el suelo, relajado, camiseta azul AMTME, cap verde. USAR ESTA PERSONA EXACTA."
      : "Las fotos de referencia muestran al host en dos poses distintas. USAR ESTA PERSONA EXACTA preservando rasgos faciales, barba y tatuaje.";

    let messages: any[];

    if (mode === "edit" && editImageUrl) {
      const editText = `${AMTME_BRAND_PROMPT}\n\n${hostContextNote} ${allReferenceImages.length > 2 ? "Las fotos adicionales muestran otras personas que también deben aparecer. " : ""}Edita esta imagen: ${prompt}`;
      messages = [{ role: "user", content: buildContent(editText, editImageUrl) }];
    } else {
      const enhancedPrompt = `${AMTME_BRAND_PROMPT}\n\n${hostContextNote} ${allReferenceImages.length > 2 ? "Las fotos adicionales muestran otras personas que también deben aparecer. " : ""}Crear: ${prompt}`;
      messages = [{ role: "user", content: buildContent(enhancedPrompt) }];
    }

    let imageDataUrl: string | undefined;
    let text = "";

    // Extract the text prompt from the messages array
    const textPrompt = Array.isArray(messages[0]?.content)
      ? messages[0].content.find((p: { type: string }) => p.type === "text")?.text ?? prompt
      : prompt;

    if (ai.provider === "gemini") {
      // Google Gemini API — free tier ~1500 req/day
      // Model fallback chain: try each until one responds (not 404)
      const GEMINI_MODELS = [
        "gemini-2.5-flash-image",          // GA stable (confirmed 2026-03)
        "gemini-2.0-flash-exp",             // Standard flash with image modality
        "gemini-2.0-flash",                 // Non-exp flash with image modality
      ];

      const geminiBody = JSON.stringify({
        contents: [{ parts: [{ text: textPrompt.slice(0, 8000) }] }],
        generationConfig: { responseModalities: ["IMAGE", "TEXT"] },
      });

      let geminiResponse: Response | null = null;
      let lastGeminiError = "";

      for (const model of GEMINI_MODELS) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${ai.key}`;
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: geminiBody,
        });
        // 404 = model doesn't exist, try next. Any other status = use this response.
        if (res.status !== 404) {
          geminiResponse = res;
          console.log("Gemini model used:", model, "status:", res.status);
          break;
        }
        console.warn("Gemini model not found:", model, "— trying next");
      }

      if (!geminiResponse) {
        return new Response(JSON.stringify({ error: "Ningún modelo de Gemini disponible. Contacta soporte." }), {
          status: 500, headers: { ...cors, "Content-Type": "application/json" },
        });
      }

      if (!geminiResponse.ok) {
        if (geminiResponse.status === 429) return new Response(JSON.stringify({ error: "Límite de Gemini alcanzado. Espera 1 minuto e intenta de nuevo." }), { status: 429, headers: { ...cors, "Content-Type": "application/json" } });
        const t = await geminiResponse.text();
        console.error("Gemini error:", geminiResponse.status, t);
        try { lastGeminiError = JSON.parse(t)?.error?.message ?? t; } catch { lastGeminiError = t; }
        return new Response(JSON.stringify({ error: lastGeminiError || `Error de Gemini (${geminiResponse.status})` }), {
          status: 400, headers: { ...cors, "Content-Type": "application/json" },
        });
      }

      const data = await geminiResponse.json();
      const parts = data.candidates?.[0]?.content?.parts ?? [];
      for (const part of parts) {
        if (part.inlineData?.data) {
          imageDataUrl = `data:${part.inlineData.mimeType ?? "image/png"};base64,${part.inlineData.data}`;
        }
        if (part.text) text = part.text;
      }
    } else {
      // OpenAI DALL-E 3 (paid fallback)
      const response = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: { Authorization: `Bearer ${ai.key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "dall-e-3",
          prompt: textPrompt.slice(0, 4000),
          n: 1,
          size: "1024x1024",
          response_format: "b64_json",
        }),
      });
      if (!response.ok) {
        if (response.status === 429) return new Response(JSON.stringify({ error: "Límite de uso alcanzado, intenta de nuevo más tarde." }), { status: 429, headers: { ...cors, "Content-Type": "application/json" } });
        const t = await response.text();
        console.error("OpenAI DALL-E error:", response.status, t);
        return new Response(JSON.stringify({ error: `Error de OpenAI (${response.status})` }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
      }
      const data = await response.json();
      const b64 = data.data?.[0]?.b64_json;
      if (b64) imageDataUrl = `data:image/png;base64,${b64}`;
      text = data.data?.[0]?.revised_prompt || "";
    }

    if (!imageDataUrl) {
      return new Response(JSON.stringify({ error: "No se pudo generar la imagen" }), {
        status: 500, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Store in Supabase Storage using service role
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { error: bucketError } = await supabase.storage.createBucket("generated-images", {
      public: true,
      fileSizeLimit: 10485760,
    });
    if (bucketError && !bucketError.message.includes("already exists")) {
      console.error("Bucket error:", bucketError);
    }

    const fileName = `img_${Date.now()}.png`;

    // Handle both base64 data URLs and plain https:// URLs
    let binaryData: Uint8Array;
    if (imageDataUrl.startsWith("data:")) {
      const base64Data = imageDataUrl.replace(/^data:image\/\w+;base64,/, "");
      binaryData = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
    } else {
      // Fetch the image from the URL and convert to binary
      const imgRes = await fetch(imageDataUrl);
      if (!imgRes.ok) {
        console.error("Failed to fetch image URL:", imgRes.status);
        return new Response(JSON.stringify({ error: "No se pudo descargar la imagen generada" }), {
          status: 500, headers: { ...cors, "Content-Type": "application/json" },
        });
      }
      const imgBuffer = await imgRes.arrayBuffer();
      binaryData = new Uint8Array(imgBuffer);
    }

    const { error: uploadError } = await supabase.storage
      .from("generated-images")
      .upload(fileName, binaryData, { contentType: "image/png", upsert: true });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return new Response(JSON.stringify({ imageUrl: imageDataUrl, text, stored: false }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const { data: publicUrlData } = supabase.storage.from("generated-images").getPublicUrl(fileName);
    const finalUrl = publicUrlData.publicUrl;

    // C: Validate episode ownership before updating
    if (episodeId) {
      // Use authenticated client (not service role) so RLS enforces ownership
      const { error: updateError } = await supabaseAuth
        .from("episodes")
        .update({ cover_image_url: finalUrl })
        .eq("id", episodeId);
      if (updateError) console.error("Episode update error:", updateError);
    }

    return new Response(JSON.stringify({
      imageUrl: finalUrl,
      text,
      stored: true,
    }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-image error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
