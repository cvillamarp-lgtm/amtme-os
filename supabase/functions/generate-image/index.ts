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

const AMTME_BRAND_PROMPT = `You are generating a real Instagram post for the podcast "A Mí Tampoco Me Explicaron" (AMTME). This is a FINISHED social media graphic — not a brand guide, not a mockup, not a color palette chart.

WHAT THE IMAGE LOOKS LIKE:
- A dark, editorial Instagram post with black background (#0A0A0A)
- Bold, uppercase sans-serif text (Inter or Helvetica Neue Black) on the LEFT half
- The host's photo on the RIGHT half (when included)
- Minimal design: maximum 3 text elements visible, abundant negative space
- It looks like a premium editorial magazine cover or Apple-level product campaign

COLOR PALETTE (these are the ONLY colors):
- Background: #0A0A0A (deep black) — the canvas itself
- Headline / dominant text: #F2C84B (warm yellow) — the most important phrase, large and bold
- Body / secondary text: #F5F0E8 (cream/off-white) — supporting lines, episode number, show name
- Tertiary / labels: #CCCCCC (light gray) — handles, small labels, timestamps
- Accent line: thin horizontal rule in #F2C84B separating sections
- Logos/icons: #FFFFFF pure white

TYPOGRAPHY ON THE IMAGE:
- Dominant (largest): 1–3 words max, #F2C84B yellow, Extra Bold / Black weight, uppercase, very tight leading
- Secondary: show name "A MÍ TAMPOCO ME EXPLICARON" in #F5F0E8, smaller, regular weight
- Episode tag: "EP. XX" in #F2C84B or #CCCCCC, small caps
- Handle: "@yosoyvillamar" in #CCCCCC, lightest weight, bottom area
- NO cursives, NO gradients, NO drop shadows, NO decorative fonts

LAYOUT:
- LEFT ZONE (text): dominant headline stacked vertically, left-aligned, top-third to center
- RIGHT ZONE (host): full-height photo, naturally cropped, slight vignette fade to black on left edge
- Bottom strip: show name + episode number + platform logos (Spotify, Apple Podcasts) in white

HOST PHOTO (when included):
- The reference photos show the REAL host: adult Hispanic male, short beard, green cap, AMTME t-shirt, tattoo on left arm
- PRESERVE exact facial features — do NOT alter face, skin tone, beard, tattoo
- Photo sits flush right, blending into black background with a subtle left-edge gradient
- Expression: natural, intimate, not posed — contemplative or slightly serious

WHAT THIS IS NOT:
- NOT a brand guide or color palette chart
- NOT a mockup with lorem ipsum
- NOT a tutorial or infographic about design
- NOT a template preview
- This is a REAL, FINISHED Instagram post ready to publish`;


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
