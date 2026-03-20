/**
 * AMTME — clean-text Edge Function
 * Script Engine · Fase 2 — Limpieza automática de texto vía Claude.
 *
 * Instrucción Maestra §10 · Fase 2 — Limpieza Automática
 *
 * Recibe: { raw_input_id, raw_text }
 * Retorna: { cleaned_text, cleaned_word_count, reduction_percentage, cleaned_text_id }
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { callClaude } from "../_shared/ai.ts";

const CLEAN_TEXT_SYSTEM = `Eres un editor profesional. Limpia este texto eliminando timestamps, marcas técnicas irrelevantes, exceso de muletillas, repeticiones innecesarias y errores básicos de puntuación. Reconstruye párrafos legibles. Conserva el tono emocional, íntimo y humano del hablante. No resumas. No inventes. No expliques. Devuelve únicamente el texto limpio.`;

function countWords(text: string): number {
  if (!text || text.trim() === "") return 0;
  return text.trim().split(/\s+/).filter(w => w.length > 0).length;
}

serve(async (req) => {
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

    const { raw_input_id, raw_text } = await req.json();

    if (!raw_text || raw_text.trim().length === 0) {
      return new Response(JSON.stringify({ error: "raw_text es requerido" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const rawWordCount = countWords(raw_text);

    // Bloqueo: texto muy corto
    if (rawWordCount < 300) {
      return new Response(
        JSON.stringify({ error: `El texto es muy corto para procesar (${rawWordCount} palabras — mínimo 300)` }),
        { status: 422, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    // Llamada a Claude — prompt oficial §10 Fase 2
    const cleanedText = await callClaude(CLEAN_TEXT_SYSTEM, raw_text, 8192);

    const cleanedWordCount = countWords(cleanedText);

    // Validación: texto limpio no puede ser vacío
    if (cleanedWordCount === 0) {
      return new Response(JSON.stringify({ error: "Claude devolvió texto vacío" }), {
        status: 502, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const reductionPct = rawWordCount > 0
      ? Math.round(((rawWordCount - cleanedWordCount) / rawWordCount) * 10000) / 100
      : 0;

    // Guardar en cleaned_texts si se proporcionó raw_input_id
    let cleanedTextId: string | null = null;
    if (raw_input_id) {
      const { data: saved, error: saveError } = await supabase
        .from("cleaned_texts")
        .insert({
          raw_input_id,
          cleaned_text: cleanedText,
          cleaned_word_count: cleanedWordCount,
          reduction_percentage: reductionPct,
        })
        .select("id")
        .single();

      if (saveError) {
        console.error("[clean-text] DB insert error:", saveError);
      } else {
        cleanedTextId = saved?.id ?? null;
      }
    }

    return new Response(
      JSON.stringify({
        cleaned_text: cleanedText,
        cleaned_word_count: cleanedWordCount,
        raw_word_count: rawWordCount,
        reduction_percentage: reductionPct,
        cleaned_text_id: cleanedTextId,
      }),
      { headers: { ...cors, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("[clean-text] Error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }
});
