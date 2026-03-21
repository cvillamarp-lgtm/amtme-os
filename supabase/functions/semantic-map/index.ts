import "../_shared/deno-shims.d.ts";

/**
 * AMTME — semantic-map Edge Function
 * Script Engine · Fase 3 — Mapa semántico vía Claude.
 *
 * Instrucción Maestra §10 · Fase 3 — Mapa Semántico
 *
 * Recibe: { episode_id, raw_input_id, cleaned_text_id, cleaned_text }
 * Retorna: { semantic_map_id, semantic_json, suggested_palette_id, suggested_host_image }
 *
 * El dominant_emotional_tone determina automáticamente:
 * - suggested_palette_id (1–4)
 * - suggested_host_image (REF_1 | REF_2)
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { callClaude } from "../_shared/ai.ts";

// ─── Prompt oficial §10 Fase 3 ────────────────────────────────────────────────
const SEMANTIC_MAP_SYSTEM = `Eres un analista editorial experto. Analiza el texto y devuelve únicamente JSON válido. Extrae exclusivamente lo que exista en el texto. No inventes. Si un campo no tiene datos, devuélvelo vacío. No uses markdown ni explicaciones.`;

const SEMANTIC_MAP_USER_TEMPLATE = (text: string) => `Analiza el siguiente texto del podcast "A Mí Tampoco Me Explicaron" (AMTME) conducido por Christian Villamar (@yosoyvillamar) y devuelve ÚNICAMENTE el siguiente JSON válido sin markdown:

{
  "episode_metadata": {
    "working_title": "",
    "central_theme": "",
    "central_thesis": "",
    "episode_promise": "",
    "central_conflict": "",
    "main_question": "",
    "dominant_emotional_tone": "",
    "emotional_intensity_level": "",
    "predominant_narrative_stage": "",
    "implicit_cta": "",
    "explicit_cta": "",
    "keywords": [],
    "psychological_concepts": []
  },
  "narrative_arc": {
    "initial_hook": "",
    "opening": "",
    "context": "",
    "wound": "",
    "conflict": "",
    "break_or_insight": "",
    "central_explanation": "",
    "example_or_anecdote": "",
    "tool_or_framework": "",
    "uncomfortable_truth": "",
    "closing": "",
    "final_cta": ""
  },
  "semantic_blocks": [],
  "key_phrases": [],
  "short_quotes": [],
  "long_quotes": [],
  "reel_hooks": [],
  "carousel_ideas": [],
  "story_prompts": [],
  "cta_lines": [],
  "memorable_lines": [],
  "shareable_phrases": [],
  "polarizing_concepts": []
}

TEXTO:
${text}`;

// ─── Sugerencia de imagen del host (§08) ──────────────────────────────────────
function suggestHostImage(tone: string, intensity: string): "REF_1" | "REF_2" {
  const intimate = ["melancólico", "reflexivo", "íntimo", "vulnerable", "nostálgico"];
  const direct   = ["confrontacional", "directo", "urgente", "empoderado", "claro"];
  const toneLower = (tone || "").toLowerCase();
  if (intimate.some(t => toneLower.includes(t))) return "REF_1";
  if (direct.some(t => toneLower.includes(t)))   return "REF_2";
  if ((intensity || "").toLowerCase() === "alto") return "REF_2";
  return "REF_1"; // Default: íntimo
}

// ─── Sugerencia de paleta según tono emocional ────────────────────────────────
function suggestPaletteId(tone: string, intensity: string): number {
  const toneLower = (tone || "").toLowerCase();
  const intLower  = (intensity || "").toLowerCase();
  // P2 Naranja — alta intensidad emocional: duelo, ruptura, crisis
  if (["duelo", "ruptura", "crisis", "rabia", "urgente"].some(t => toneLower.includes(t))) return 2;
  // P3 Invertida — quotes emocionales profundas, introspectivo
  if (["vulnerable", "nostálgico", "melancólico", "íntimo"].some(t => toneLower.includes(t)) && intLower === "bajo") return 3;
  // P4 Negro — máximo impacto
  if (intLower === "alto" && ["confrontacional", "empoderado"].some(t => toneLower.includes(t))) return 4;
  // P1 Principal — default
  return 1;
}

// ─── countWords helper ────────────────────────────────────────────────────────
function countWords(text: string): number {
  if (!text || text.trim() === "") return 0;
  return text.trim().split(/\s+/).filter(w => w.length > 0).length;
}

// ─── Word count validation (§12) ─────────────────────────────────────────────
function validateSemanticRanges(meta: Record<string, string>): string[] {
  const warnings: string[] = [];
  const thesis   = countWords(meta.central_thesis   || "");
  const conflict = countWords(meta.central_conflict || "");
  const promise  = countWords(meta.episode_promise  || "");
  if (thesis < 15 || thesis > 80)     warnings.push(`central_thesis fuera de rango (${thesis} palabras — esperado 15–80)`);
  if (conflict < 10 || conflict > 60) warnings.push(`central_conflict fuera de rango (${conflict} palabras — esperado 10–60)`);
  if (promise < 10 || promise > 50)   warnings.push(`episode_promise fuera de rango (${promise} palabras — esperado 10–50)`);
  return warnings;
}

// ─── Edge Function handler ────────────────────────────────────────────────────

serve(async (req: Request) => {
  const cors = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const { episode_id, raw_input_id, cleaned_text_id, cleaned_text } = await req.json();

    if (!cleaned_text || cleaned_text.trim().length === 0) {
      return new Response(JSON.stringify({ error: "cleaned_text es requerido" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const wordCount = countWords(cleaned_text);
    if (wordCount < 250) {
      return new Response(
        JSON.stringify({ error: `El texto limpio es demasiado corto (${wordCount} palabras — mínimo 250)` }),
        { status: 422, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    // Llamada a Claude — prompt oficial §10 Fase 3
    const rawResponse = await callClaude(
      SEMANTIC_MAP_SYSTEM,
      SEMANTIC_MAP_USER_TEMPLATE(cleaned_text),
      8192,
    );

    // Parseo defensivo — Claude puede retornar con markdown ocasionalmente
    const jsonText = rawResponse
      .replace(/^```json?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    let semanticJson: Record<string, unknown>;
    try {
      semanticJson = JSON.parse(jsonText);
    } catch {
      console.error("[semantic-map] JSON parse error. Raw:", rawResponse.slice(0, 500));
      return new Response(
        JSON.stringify({ error: "Claude no devolvió un JSON válido. Intenta de nuevo." }),
        { status: 502, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    const meta = (semanticJson.episode_metadata ?? {}) as Record<string, string>;
    const dominantTone  = meta.dominant_emotional_tone  || "";
    const intensityLevel = meta.emotional_intensity_level || "";

    const suggestedPaletteId  = suggestPaletteId(dominantTone, intensityLevel);
    const suggestedHostImage   = suggestHostImage(dominantTone, intensityLevel);
    const rangeWarnings        = validateSemanticRanges(meta);

    // Calcular word_counts_json para campos clave
    const wordCountsJson = {
      cleaned_text:    wordCount,
      central_thesis:  countWords(meta.central_thesis   || ""),
      central_conflict: countWords(meta.central_conflict || ""),
      episode_promise: countWords(meta.episode_promise  || ""),
    };

    // Guardar en semantic_maps
    let semanticMapId: string | null = null;
    if (episode_id) {
      const { data: saved, error: saveError } = await supabase
        .from("semantic_maps")
        .insert({
          episode_id,
          raw_input_id:   raw_input_id   ?? null,
          cleaned_text_id: cleaned_text_id ?? null,
          semantic_json: semanticJson,
          dominant_emotional_tone: dominantTone,
          emotional_intensity_level: intensityLevel,
          suggested_palette_id: suggestedPaletteId,
          suggested_host_image: suggestedHostImage,
        })
        .select("id")
        .single();

      if (saveError) {
        console.error("[semantic-map] DB insert error:", saveError);
      } else {
        semanticMapId = saved?.id ?? null;
      }
    }

    return new Response(
      JSON.stringify({
        semantic_map_id:      semanticMapId,
        semantic_json:        semanticJson,
        suggested_palette_id: suggestedPaletteId,
        suggested_host_image: suggestedHostImage,
        word_counts_json:     wordCountsJson,
        range_warnings:       rangeWarnings,
      }),
      { headers: { ...cors, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("[semantic-map] Error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }
});
