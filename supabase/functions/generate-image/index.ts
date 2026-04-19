import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { getCorsHeaders } from "../_shared/cors.ts";
import { errorResponse } from "../_shared/response.ts";

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

// ─── AMTME Master Image Prompt ───────────────────────────────────────────────
// Source: Instrucción Maestra + host photo description approved by Christian Villamar.
// The AI generates: hyperrealistic host photo + correct background + clear left text zone.
// ALL typography is rendered separately by the canvas overlay — NEVER by the AI.
const AMTME_BRAND_PROMPT = `CALIDAD EDITORIAL ALTA DEFINICIÓN — Podcast "A Mí Tampoco Me Explicaron" (AMTME).

═══ SUJETO — IDENTIDAD EXACTA, NO MODIFICAR ═══
Fotografía de estudio hiperrealista, cuerpo completo (de cabeza a tenis), encuadre vertical, composición frontal, centrada y simétrica. Estética de foto real de estudio, como revista editorial premium (GQ, Monocle).

Hombre adulto sentado al revés sobre una silla de madera (mirando hacia el respaldo), con piernas abiertas, torso levemente inclinado hacia adelante, brazos relajados apoyados sobre el respaldo, mirando directamente a cámara con expresión serena, tranquila y segura.

APARIENCIA EXACTA (preservar sin excepción):
• Complexión atlética delgada, proporciones naturales, rostro masculino realista
• Barba corta bien definida, textura natural, crecimiento ligeramente irregular
• Gorra verde lisa mate
• Camiseta blanca con logo "AMTME" en azul y ícono de micrófono azul en el pecho — forma, tamaño, color y posición exactos
• Jeans azules con textura auténtica y costuras visibles
• Tenis blancos limpios con volumen y materiales realistas
• Tatuaje visible en el brazo derecho del sujeto (lado izquierdo de la imagen), integrado naturalmente a la piel, siguiendo correctamente la anatomía del brazo
• Mano derecha del sujeto apoyada sobre el respaldo; mano izquierda cayendo de forma natural al frente
• Postura casual, estable y anatómicamente correcta

═══ COLORES AMTME — OBLIGATORIOS ═══
• Fondo cobalt: #1A1AE6 — usado en piezas de feed, identitarias y portadas de episodio
• Fondo negro: #0A0A0A — usado en Cover 1:1 Spotify y piezas introspectivas
• El fondo es SÓLIDO, PLANO y LIMPIO — sin texturas, gradientes, patrones ni elementos extra

═══ COMPOSICIÓN EDITORIAL ═══
• El host ocupa la mitad DERECHA del canvas (X: 440–990px en canvas de 1080px de ancho)
• La mitad IZQUIERDA (X: 90–540px) es la zona de texto: completamente DESPEJADA, solo el color de fondo — no colocar ningún elemento aquí
• El borde izquierdo del host se funde SUAVEMENTE con el fondo (gradiente sutil, sin corte duro)
• Los ojos del host están en el tercio superior de la imagen (Y: 220–360px)
• El host nunca es tapado por texto ni elementos visuales
• La figura del host es visible de cuerpo completo

═══ ILUMINACIÓN Y CALIDAD ═══
• Luz de estudio suave, difusa y frontal, ligeramente envolvente
• Sombras blandas y coherentes debajo de la silla, piernas y tenis
• Catchlight natural en los ojos
• Exposición limpia, contraste moderado, balance de blancos neutro a ligeramente frío
• Piel realista: poros sutiles, microtextura, variaciones tonales naturales
• Manos y dedos anatómicamente correctos; uñas, nudillos y articulaciones reales
• Madera de la silla con veta natural y tono cálido
• Nitidez alta pero natural, sin sobreprocesado
• Estética de cámara full-frame, lente 50–85mm, apertura f/4

═══ TEXTO — ZONA RESERVADA ═══
La zona izquierda del canvas (X: 90–540px) debe estar completamente libre de elementos visuales. Sobre esta zona, en post-producción, se superpondrán los textos del sistema editorial AMTME:
• Dominante emocional: color #F2C84B (amarillo), tamaño máximo, peso ExtraBold
• Secundario: color #F5F0E8 (cream), 72% del tamaño dominante
• Firma inferior: "A MÍ TAMPOCO ME EXPLICARON", color #888888, tracking +40

NO INCLUIR NINGÚN TEXTO, NÚMERO, LETRA, ÍCONO, LOGO NI ELEMENTO UI en la imagen generada. El texto se agrega programáticamente en post-producción. Cualquier texto en la imagen generada la hace inutilizable.

═══ INSTRUCCIÓN DE CORRECCIÓN PRIORITARIA ═══
Corregir cualquier defecto anatómico o de generación MANTENIENDO EXACTAMENTE la identidad del sujeto, la pose, la ropa, la silla, el encuadre y la composición general. Mejorar especialmente: manos, dedos, proporciones, textura de piel, definición de barba, integración del tatuaje, pliegues de la ropa, perspectiva de la silla, simetría facial natural, limpieza del fondo y calidad general. NO reinterpretar al sujeto, NO cambiar su rostro, NO modificar la ropa, NO alterar el estilo fotográfico.

═══ NEGATIVOS ═══
No caricatura, no ilustración, no anime, no render 3D, no CGI, no piel plástica, no exceso de suavizado, no sobreenfoque, no sobreprocesado, no manos deformes, no dedos extra, no dedos fusionados, no dedos cortados, no anatomía incorrecta, no brazos desproporcionados, no piernas asimétricas, no silla torcida, no perspectiva incorrecta, no tatuaje flotante, no logo alterado, no texto visible, no letras, no números, no UI elements, no íconos, no logos, no diseño gráfico, no cambio de ropa, no cambio de gorra, no cambio de expresión, no cambio de pose, no fondo diferente, no iluminación dramática, no color grading cinematográfico, no viñeta fuerte, no desenfoque artificial, no rostro cambiado, no identidad alterada, no composición desequilibrada, no duplicaciones, no elementos extra, no diseño de brand system, no swatches de color, no mockups.`;

serve(async (req) => {
  const cors = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return errorResponse(cors, "UNAUTHORIZED", "No autorizado", 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;

    const body = await req.json();
    const {
      prompt,
      mode,
      imageUrl: editImageUrl,
      episodeId,
      referenceImages,
      hostReference,
      includeHost,
      rawPrompt,
    } = body;

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
      const editText = rawPrompt
        ? `${hostContextNote}\n\nEdita esta imagen: ${prompt}`
        : `${AMTME_BRAND_PROMPT}\n\n${hostContextNote}\n\nEdita esta imagen: ${prompt}`;
      messages = [{ role: "user", content: buildContent(editText, editImageUrl) }];
    } else {
      const enhancedPrompt = rawPrompt
        ? `${hostContextNote}\n\nCrear: ${prompt}`
        : `${AMTME_BRAND_PROMPT}\n\n${hostContextNote}\n\nCrear: ${prompt}`;
      messages = [{ role: "user", content: buildContent(enhancedPrompt) }];
    }

    let imageDataUrl: string | undefined;
    let text = "";

    // Extract the text prompt from the messages array
    const textPrompt = Array.isArray(messages[0]?.content)
      ? (messages[0].content.find((p: { type: string }) => p.type === "text")?.text ?? prompt)
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

        const geminiParts: Array<
          { text: string } | { inlineData: { mimeType: string; data: string } }
        > = [{ text: textPrompt.slice(0, 8000) }, ...hostImageParts];

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
            return errorResponse(
              cors,
              "RATE_LIMIT",
              "Límite de Gemini alcanzado. Espera 1 minuto e intenta de nuevo.",
              429
            );
          }

          if (!res.ok) {
            const t = await res.text();
            console.error("Gemini error:", model, res.status, t);
            try {
              lastGeminiError = JSON.parse(t)?.error?.message ?? t;
            } catch {
              lastGeminiError = t;
            }
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
          return errorResponse(cors, "AI_ERROR", lastGeminiError, 400);
        }
      } else {
        // OpenAI DALL-E 3 (paid fallback)
        const response = await fetch("https://api.openai.com/v1/images/generations", {
          method: "POST",
          headers: { Authorization: `Bearer ${ai.key}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "dall-e-3",
            // DALL-E 3 limit: 4000 chars. Skip the full brand prompt (~5400 chars)
            // and use a condensed version so the piece-specific instructions are not truncated.
            prompt: [
              "Fotografía editorial hiperrealista. Podcast 'A Mí Tampoco Me Explicaron'. Fondo sólido cobalt #1A1AE6. Host en zona derecha (X 440–990px), zona izquierda completamente despejada para texto editorial. SIN texto, letras, números, íconos ni logos en la imagen.",
              hostContextNote,
              `Crear: ${prompt}`,
            ]
              .join("\n\n")
              .slice(0, 4000),
            n: 1,
            size: "1024x1024",
            response_format: "b64_json",
          }),
        });
        if (!response.ok) {
          if (response.status === 429)
            return errorResponse(
              cors,
              "RATE_LIMIT",
              "Límite de uso alcanzado, intenta de nuevo más tarde.",
              429
            );
          const t = await response.text();
          console.error("OpenAI DALL-E error:", response.status, t);
          return errorResponse(cors, "AI_ERROR", `Error de OpenAI (${response.status})`, 500, {
            upstream_status: response.status,
          });
        }
        const data = await response.json();
        const b64 = data.data?.[0]?.b64_json;
        if (b64) imageDataUrl = `data:image/png;base64,${b64}`;
        text = data.data?.[0]?.revised_prompt || "";
      }
    } // end for aiChain

    if (!imageDataUrl) {
      return errorResponse(cors, "AI_ERROR", "No se pudo generar la imagen", 500);
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
    const fileName =
      episodeId && pieceId
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
        return errorResponse(cors, "AI_ERROR", "No se pudo descargar la imagen generada", 500);
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

    const { data: publicUrlData } = supabase.storage
      .from("generated-images")
      .getPublicUrl(fileName);
    const finalUrl = publicUrlData.publicUrl;

    // Decode user_id from JWT payload (no API call needed)
    let userId: string | null = null;
    try {
      const token = authHeader!.replace("Bearer ", "");
      const payloadB64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
      const decoded = JSON.parse(atob(payloadB64));
      userId = decoded.sub ?? null;
    } catch {
      /* non-JWT bearer (e.g. service key) — skip content_assets upsert */
    }

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
        { onConflict: "user_id,piece_id,episode_id" }
      );
      if (assetError) console.error("content_assets upsert error:", assetError);
    }

    // Update episode cover (piece 1 = cover)
    if (episodeId && pieceId === 1) {
      await supabase.from("episodes").update({ cover_image_url: finalUrl }).eq("id", episodeId);
    }

    return new Response(
      JSON.stringify({
        imageUrl: finalUrl,
        text,
        stored: true,
      }),
      {
        headers: { ...cors, "Content-Type": "application/json" },
      }
    );
  } catch (e) {
    console.error("generate-image error:", e);
    return errorResponse(
      cors,
      "INTERNAL_ERROR",
      e instanceof Error ? e.message : "Unknown error",
      500
    );
  }
});
