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

// Build host reference URLs dynamically from SUPABASE_URL
function getHostReferenceUrl(key: "imagen01" | "imagen02"): string {
  const baseUrl = Deno.env.get("SUPABASE_URL")!;
  return `${baseUrl}/storage/v1/object/public/generated-images/host-${key}.png`;
}

const AMTME_BRAND_PROMPT = `INSTRUCCIÓN MAESTRA DE IMAGEN — AMTME (A MÍ TAMPOCO ME EXPLICARON)

PALETA OFICIAL (ÚNICA PERMITIDA — cualquier color fuera = ERROR de producción):
- Cobalt Blue (principal/fondo): #1A1AE6 · RGB 26, 26, 230
- Cobalt oscuro (hover/sombra): #1212A0 · RGB 18, 18, 160
- Cream / Marfil (tipografía principal): #F5F0E8 · RGB 245, 240, 232
- Amarillo editorial (SOLO dominante tipográfico): #F2C84B · RGB 242, 200, 75
- Negro editorial (fondo alternativo): #0A0A0A · RGB 10, 10, 10
- Blanco (logos plataformas): #FFFFFF
- Gris secundario (tipografía nivel 4): #CCCCCC
- Gris firma/metadatos: #888888 · opacidad 85%

REGLAS CROMÁTICAS OBLIGATORIAS:
— Máximo 3 colores activos por pieza (fondo + cream + amarillo).
— El amarillo #F2C84B SOLO va en el elemento dominante tipográfico (nivel 1).
— El cobalt azul #1A1AE6 es color estructural y de fondo.
— El cream #F5F0E8 es tipografía por defecto sobre cobalt o negro.
— No usar glow ni sombra de color activo.
— Amarillo: saturación −10%, sin glow.
— Cobalt fondo: luminosidad −5% para mayor peso visual.
— Fondo negro: exposición −5% para evitar aplastamiento.

SISTEMA TIPOGRÁFICO (6 NIVELES OBLIGATORIOS):
Nivel 1 — Dominante: 100% (72-88px), Black/ExtraBold, #F2C84B, tracking −10 a 0, interlineado −8% a −10%
Nivel 2 — Secundario: 72% (52-64px), Bold/SemiBold, #F5F0E8, tracking +10
Nivel 3 — Terciario: 60% (44-52px), Medium/Regular, #F5F0E8, tracking +10 a +15
Nivel 4 — Subtítulo: 52% (36-44px), Regular/Light, #CCCCCC, tracking +15
Nivel 5 — CTA: 45% (32-38px), Medium/Condensado, #F5F0E8 opacidad 90%, tracking +20 a +30
Nivel 6 — Firma/Metadatos/Logos: 38% (24-28px), Light, #888888 opacidad 85%, tracking +30 a +40

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
— A MÍ TAMPOCO ME EXPLICARON (siempre mayúsculas)
— Ep. XX — (formato número episodio)
— CHRISTIAN VILLAMAR (firma, #888888, opacidad 85%, tracking +30)
— Logos Spotify + Apple Podcasts (blanco #FFFFFF, escala 90%, alineados, separación 24px)
— PODCAST (tag, tracking +40, mayúsculas, pequeño)

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
    const ai = resolveAI();

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

    const response = await fetch(ai.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ai.key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages,
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Límite de uso alcanzado, intenta de nuevo más tarde." }), {
          status: 429, headers: { ...cors, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos agotados. Agrega fondos en Settings → Workspace → Usage." }), {
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
    const imageDataUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    const text = data.choices?.[0]?.message?.content || "";

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

    const base64Data = imageDataUrl.replace(/^data:image\/\w+;base64,/, "");
    const binaryData = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
    const fileName = `img_${Date.now()}.png`;

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
