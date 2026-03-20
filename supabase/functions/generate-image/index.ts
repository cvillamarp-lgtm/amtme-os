import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { getCorsHeaders } from "../_shared/cors.ts";

/**
 * Returns all available image AI keys for the fallback chain.
 * Priority: Gemini (free) first, then OpenAI DALL-E 3 (paid).
 */
function resolveImageAIChain(): Array<{ key: string; provider: "gemini" | "openai" }> {
  const chain: Array<{ key: string; provider: "gemini" | "openai" }> = [];
  const geminiKey = Deno.env.get("GEMINI_API_KEY");
  if (geminiKey) chain.push({ key: geminiKey, provider: "gemini" });
  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  if (openaiKey) chain.push({ key: openaiKey, provider: "openai" });
  if (chain.length === 0) {
    throw new Error(
      "No image AI key configured. Add OPENAI_API_KEY or GEMINI_API_KEY to Supabase Edge Function secrets."
    );
  }
  return chain;
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

GESTALT Y PSICOLOGÍA DEL DISEÑO (OBLIGATORIO — APLICAR EN CADA PIEZA):
— PROXIMIDAD: agrupar elementos relacionados con máx. 16px entre ellos y mín. 40px entre grupos distintos.
— SIMILITUD: mismo peso tipográfico y mismo color para elementos del mismo nivel jerárquico.
— CONTINUIDAD: guiar la mirada del dominante hacia el CTA mediante eje visual implícito (vertical u oblicuo 30–45°).
— FIGURA-FONDO: el host es la figura; el fondo genera contraste mínimo 4.5:1 WCAG con el texto.
— PUNTO FOCAL ÚNICO: exactamente 1 elemento de máxima atención por pieza. Todo lo demás es soporte.
— PRIMACÍA: el elemento más poderoso va en el tercio superior o esquina superior izquierda.
— EFECTO VON RESTORFF: la barra HL (#E8FF40) aísla la palabra de mayor carga emocional — úsala solo para esa palabra.
— PATRÓN F: el ojo escanea izquierda→derecha en líneas superiores, luego baja por margen izquierdo. Colocar dominante y CTA en ese recorrido.
— CARGA COGNITIVA: máximo 3 ideas por pieza. Si hay más, la pieza falla.
— RECIPROCIDAD VISUAL: el host orienta su mirada hacia el texto dominante (nunca hacia afuera del frame), guiando al espectador al mensaje.
— VALENCIA EMOCIONAL: Navy/Teal → confianza y profundidad. Sand → calidez y accesibilidad. HL → urgencia y descubrimiento.
— DOLOR DEL OYENTE: el dominante refleja una emoción o pregunta que el oyente ya tiene — no describe el episodio.

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

    const body = await req.json();
    const { prompt, mode, imageUrl: editImageUrl, episodeId, referenceImages, hostReference, includeHost } = body;

    if (!prompt && mode !== "edit") throw new Error("Prompt is required");
    const aiChain = resolveImageAIChain();

    // Host images: included by default, skipped when includeHost === false
    const useHost = includeHost !== false;
    const hostRef = hostReference as "imagen01" | "imagen02" | undefined;
    const hostUrls = useHost
      ? hostRef
        ? [getHostReferenceUrl(hostRef)]
        : [getHostReferenceUrl("imagen01"), getHostReferenceUrl("imagen02")]
      : [];

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

    const hostContextNote = !useHost
      ? "PIEZA SIN FOTO DEL HOST — diseño tipográfico puro. No incluir ninguna persona. Aplicar todo el sistema de composición con espacio negativo donde iría el host."
      : hostRef === "imagen01"
      ? "La foto de referencia adjunta muestra al host REAL: hombre adulto, barba corta, cap verde, camiseta blanca AMTME, tatuaje brazo izquierdo, sentado al revés en silla de madera. PRESERVAR RASGOS EXACTOS — no modificar rostro, complexión ni tatuaje."
      : hostRef === "imagen02"
      ? "La foto de referencia adjunta muestra al host REAL: hombre adulto, barba corta, cap verde, camiseta azul AMTME, tatuaje brazo izquierdo, sentado relajado en el suelo. PRESERVAR RASGOS EXACTOS — no modificar rostro, complexión ni tatuaje."
      : "Las dos fotos de referencia adjuntas muestran al host REAL en dos poses. PRESERVAR RASGOS EXACTOS — rostro, barba, cap verde, tatuaje brazo izquierdo. Elegir la pose que mejor sirva a la composición.";

    let messages: any[];

    if (mode === "edit" && editImageUrl) {
      const editText = `${AMTME_BRAND_PROMPT}\n\n${hostContextNote}\n\nEdita esta imagen: ${prompt}`;
      messages = [{ role: "user", content: buildContent(editText, editImageUrl) }];
    } else {
      const enhancedPrompt = `${AMTME_BRAND_PROMPT}\n\n${hostContextNote}\n\nCrear: ${prompt}`;
      messages = [{ role: "user", content: buildContent(enhancedPrompt) }];
    }

    let imageDataUrl: string | undefined;
    let text = "";

    // Extract the text prompt from the messages array
    const textPrompt = Array.isArray(messages[0]?.content)
      ? messages[0].content.find((p: { type: string }) => p.type === "text")?.text ?? prompt
      : prompt;

    for (const ai of aiChain) {
      if (imageDataUrl) break; // stop once we have an image

    if (ai.provider === "gemini") {
      // Google Gemini API — free tier ~1500 req/day
      // Model fallback chain: try each until one produces an image (not 404 and has inlineData)
      const GEMINI_MODELS = [
        "gemini-2.0-flash-preview-image-generation", // Único modelo oficial GA para imagen
      ];

      // Fetch host reference images and convert to base64 for Gemini inline data
      const hostImageParts: Array<{ inlineData: { mimeType: string; data: string } }> = [];
      for (const url of allReferenceImages) {
        try {
          const res = await fetch(url);
          if (!res.ok) {
            console.warn("Could not fetch reference image:", url, res.status);
            continue;
          }
          const buf = await res.arrayBuffer();
          const bytes = new Uint8Array(buf);
          let binary = "";
          for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          const b64 = btoa(binary);
          const mimeType = res.headers.get("content-type") ?? "image/png";
          hostImageParts.push({ inlineData: { mimeType, data: b64 } });
        } catch (err) {
          console.warn("Failed to fetch reference image:", url, err);
        }
      }

      const geminiParts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
        { text: textPrompt.slice(0, 8000) },
        ...hostImageParts,
      ];

      const geminiBody = JSON.stringify({
        contents: [{ parts: geminiParts }],
        generationConfig: { responseModalities: ["IMAGE", "TEXT"] },
      });

      let lastGeminiError = "";

      for (const model of GEMINI_MODELS) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${ai.key}`;
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: geminiBody,
        });

        if (res.status === 404) {
          console.warn("Gemini model not found:", model, "— trying next");
          continue;
        }

        if (res.status === 429) {
          return new Response(JSON.stringify({ error: "Límite de Gemini alcanzado. Espera 1 minuto e intenta de nuevo." }), {
            status: 429, headers: { ...cors, "Content-Type": "application/json" },
          });
        }

        if (!res.ok) {
          const t = await res.text();
          console.error("Gemini error:", model, res.status, t);
          try { lastGeminiError = JSON.parse(t)?.error?.message ?? t; } catch { lastGeminiError = t; }
          continue;
        }

        const data = await res.json();
        const parts = data.candidates?.[0]?.content?.parts ?? [];
        for (const part of parts) {
          if (part.inlineData?.data) {
            imageDataUrl = `data:${part.inlineData.mimeType ?? "image/png"};base64,${part.inlineData.data}`;
          }
          if (part.text) text = part.text;
        }

        if (imageDataUrl) {
          console.log("Gemini model used:", model);
          break;
        }

        console.warn("Gemini model", model, "returned 200 but no image — trying next");
      }

      if (!imageDataUrl && lastGeminiError) {
        return new Response(JSON.stringify({ error: lastGeminiError }), {
          status: 400, headers: { ...cors, "Content-Type": "application/json" },
        });
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
    } // end for aiChain

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

    // Organized path: episodes/{id}/piece_{n}.png (overwritable) or standalone/piece_{n}_{ts}.png
    const pieceId = body.pieceId as number | undefined;
    const fileName = episodeId && pieceId
      ? `episodes/${episodeId}/piece_${pieceId}.png`
      : episodeId
      ? `episodes/${episodeId}/img_${Date.now()}.png`
      : `standalone/piece_${pieceId ?? "x"}_${Date.now()}.png`;

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

    // Decode user_id from JWT payload (no API call needed)
    let userId: string | null = null;
    try {
      const token = authHeader!.replace("Bearer ", "");
      const payloadB64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
      const decoded = JSON.parse(atob(payloadB64));
      userId = decoded.sub ?? null;
    } catch { /* non-JWT bearer (e.g. service key) — skip content_assets upsert */ }

    // Upsert image_url into content_assets (service role bypasses RLS)
    if (userId && episodeId && pieceId) {
      const { error: assetError } = await supabase.from("content_assets").upsert(
        {
          user_id: userId,
          piece_id: pieceId,
          piece_name: body.pieceName ?? `Pieza ${pieceId}`,
          image_url: finalUrl,
          prompt_used: body.prompt ?? "",
          status: "generated",
          episode_id: episodeId,
        },
        { onConflict: "user_id,piece_id,episode_id" },
      );
      if (assetError) console.error("content_assets upsert error:", assetError);
    }

    // Update episode cover (piece 1 = cover)
    if (episodeId && pieceId === 1) {
      await supabase.from("episodes").update({ cover_image_url: finalUrl }).eq("id", episodeId);
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
