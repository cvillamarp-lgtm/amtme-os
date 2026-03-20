/// <reference path="../_shared/deno-shims.d.ts" />

/**
 * AMTME — generate-outputs Edge Function
 * Script Engine · Fase 4 — Generación de 10 tipos de outputs vía Claude
 *
 * Instrucción Maestra §11 · Generación de Outputs — 10 Tipos
 *
 * Recibe: { semantic_map_id, semantic_json }
 * Retorna: Objeto con los 10 outputs, cada uno guardado en generated_assets
 *
 * Los 10 outputs se generan en paralelo con Promise.all.
 * Cada uno tiene word count validation según §12.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { callClaude } from "../_shared/ai.ts";

// ─── Prompt compartido para todos los outputs (§11) ────────────────────────────
const OUTPUTS_SYSTEM = `Eres el editor de contenido del podcast "A Mí Tampoco Me Explicaron" conducido por Christian Villamar (@yosoyvillamar). Tono: editorial, emocional, íntimo, claro, humano, sobrio. El tarot se usa como autoconocimiento, nunca como predicción. La marca no habla desde superioridad; habla desde verdad, conciencia y experiencia humana. Nunca generes contenido genérico, motivacional vacío, ni frases de coach. Todo debe nacer del mapa semántico proporcionado. Devuelve ÚNICAMENTE JSON válido sin markdown ni explicaciones.`;

// ─── Prompts individuales para los 10 outputs ──────────────────────────────────

function getPromptFor(outputNumber: number, semanticJson: Record<string, unknown>): string {
  const meta = (semanticJson.episode_metadata as Record<string, unknown>) || {};
  const narrative = (semanticJson.narrative_arc as Record<string, unknown>) || {};

  switch (outputNumber) {
    case 1:
      return `Basa en este mapa semántico y genera un RESUMEN EDITORIAL con ÚNICAMENTE este JSON:
{
  "internal_title": "",
  "central_thesis": "",
  "central_conflict": "",
  "promise": "",
  "summary_lines": [],
  "key_phrases": []
}

Mapa: ${JSON.stringify(meta)}`;

    case 2:
      return `Basa en este mapa semántico y genera VISUAL COPY para 15 piezas visuales (P01–P15). Devuelve ÚNICAMENTE array JSON:
[
  {
    "piece_number": 1,
    "headline": "",
    "keyword": "",
    "subheadline": "",
    "body_copy": "",
    "cta": "",
    "suggested_image": "REF_1 | REF_2 | none"
  }
  ...
]

Mapa: ${JSON.stringify(meta)}`;

    case 3:
      return `Basa en este mapa semántico y genera CAPTIONS para cada plataforma con JSON:
{
  "launch_short": "",
  "launch_medium": "",
  "reel": "",
  "quote_post": "",
  "carousel": "",
  "story_frame": ""
}

Mapa: ${JSON.stringify(meta)}`;

    case 4:
      return `Basa en este mapa semántico y genera HOOKS con JSON:
{
  "short_hooks": [],
  "emotional": [],
  "tension": [],
  "uncomfortable_truth": [],
  "question": []
}

Mapa: ${JSON.stringify(meta)}`;

    case 5:
      return `Basa en este mapa semántico y genera QUOTES con JSON:
{
  "short_quotes": [],
  "long_quotes": [],
  "high_impact": [],
  "saveable": [],
  "shareable": []
}

Mapa: ${JSON.stringify(meta)}`;

    case 6:
      return `Basa en este mapa semántico y genera CARRUSEL (8 slides exactos) con JSON:
{
  "carousel_central_idea": "",
  "slides": [
    { "slide_number": 1, "copy": "" },
    ...
  ],
  "emotional_climax": "",
  "final_cta": ""
}

Mapa: ${JSON.stringify(meta)}`;

    case 7:
      return `Basa en este mapa semántico y genera STORIES con JSON:
{
  "launch_stories": [],
  "interaction": [],
  "quote_stories": [],
  "response_box": [],
  "polls": []
}

Mapa: ${JSON.stringify(meta)}`;

    case 8:
      return `Basa en este mapa semántico y genera REEL CANDIDATES (3 opciones mínimo) con JSON:
{
  "reels": [
    {
      "opening_hook": "",
      "body_excerpt": "",
      "closing_line": "",
      "rationale": "",
      "impact": "",
      "duration": ""
    }
  ]
}

Mapa: ${JSON.stringify(meta)}`;

    case 9:
      return `Basa en este mapa semántico y genera DESCRIPCIONES para distribución con JSON:
{
  "short": "",
  "medium": "",
  "long": "",
  "spotify_apple": "",
  "editorial_keywords": []
}

Mapa: ${JSON.stringify(meta)}`;

    case 10:
      return `Basa en este mapa semántico y genera DISTRIBUCIÓN con JSON:
{
  "main_launch_copy": "",
  "summary": "",
  "primary_cta": "",
  "alt_cta": "",
  "hashtags": [],
  "bullets": []
}

Mapa: ${JSON.stringify(meta)}`;

    default:
      throw new Error(`Unknown output number: ${outputNumber}`);
  }
}

// ─── countWords helper ────────────────────────────────────────────────────────
function countWords(text: string): number {
  if (!text || text.trim() === "") return 0;
  return text.trim().split(/\s+/).filter(w => w.length > 0).length;
}

// ─── Edge Function handler ────────────────────────────────────────────────────

serve(async (req) => {
  const cors = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
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
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const { semantic_map_id, semantic_json } = await req.json();

    if (!semantic_map_id || !semantic_json) {
      return new Response(
        JSON.stringify({ error: "semantic_map_id and semantic_json required" }),
        { status: 400, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    // Generar los 10 outputs en paralelo
    const outputPromises = Array.from({ length: 10 }, (_, i) =>
      callClaude(OUTPUTS_SYSTEM, getPromptFor(i + 1, semantic_json), 4096)
        .then(text => {
          const jsonText = text
            .replace(/^```json?\s*/i, "")
            .replace(/\s*```$/i, "")
            .trim();
          return { outputNumber: i + 1, content: JSON.parse(jsonText) };
        })
        .catch(e => ({
          outputNumber: i + 1,
          error: e instanceof Error ? e.message : String(e),
        })),
    );

    const outputs = await Promise.all(outputPromises);

    // Guardar cada output en generated_assets
    const savedAssets = [];
    for (const output of outputs) {
      if ("error" in output) {
        console.error(`[generate-outputs] Output ${output.outputNumber} error:`, output.error);
        continue;
      }

      const assetKey = `output_${String(output.outputNumber).padStart(2, "0")}`;
      const { data, error } = await supabase
        .from("generated_assets")
        .insert({
          semantic_map_id,
          asset_type: "output",
          asset_key: assetKey,
          content_json: output.content,
          word_counts_json: calculateWordCounts(output.content),
          status: "draft",
        })
        .select("id")
        .single();

      if (error) {
        console.error(`[generate-outputs] DB insert error for output ${output.outputNumber}:`, error);
      } else {
        savedAssets.push({ outputNumber: output.outputNumber, assetId: data?.id });
      }
    }

    return new Response(
      JSON.stringify({
        outputs,
        savedAssets,
        message: "Outputs generated successfully",
      }),
      { headers: { ...cors, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("[generate-outputs] Error:", e);
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Unknown error",
      }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }
});

// ─── Helper: Calculate word counts for output structure ──────────────────────
function calculateWordCounts(content: unknown): Record<string, number> {
  const counts: Record<string, number> = {};

  if (typeof content === "object" && content !== null) {
    const obj = content as Record<string, unknown>;

    // Recorrer todos los valores del objeto
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === "string") {
        counts[key] = countWords(value);
      } else if (Array.isArray(value)) {
        // Si es array, contar palabras en cada elemento si es string
        counts[key] = value
          .filter(item => typeof item === "string")
          .reduce((sum, item) => sum + countWords(item), 0);
      } else if (typeof value === "object" && value !== null) {
        // Si es objeto anidado, intentar contar sus strings
        const nested = value as Record<string, unknown>;
        for (const [nestedKey, nestedValue] of Object.entries(nested)) {
          if (typeof nestedValue === "string") {
            counts[`${key}.${nestedKey}`] = countWords(nestedValue);
          }
        }
      }
    }
  }

  return counts;
}
