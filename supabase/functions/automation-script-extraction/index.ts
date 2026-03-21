/**
 * Edge Function: automation-script-extraction
 *
 * Extracts quotes and insights from an episode script, inserts them into
 * quote_candidates and insights tables, and triggers episode evaluation.
 *
 * Accepts:
 *   - User JWT (called from frontend via invokeEdgeFunction)
 *   - Service Role Key (called from SQL trigger via pg_net)
 *
 * Body: { episode_id, script, episode_title?, episode_number?, run_id?, source? }
 * Returns: { ok, quotesExtracted, insightsExtracted, runId, skipped? }
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { resolveAI } from "../_shared/ai.ts";
import { errorResponse } from "../_shared/response.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

// Same podcast context as extract-from-script for consistent output
const AMTME_CONTEXT = `Podcast: "A Mi Tampoco Me Explicaron" (AMTME). Host: Christian Villamar.
Audiencia: hombres hispanos 28-44 años, LATAM.
Tono: directo, íntimo, psicológico, como un amigo honesto.
Estilo: sobrio, editorial, sin exclamaciones ni emojis.`;

const QUOTES_PROMPT = `Eres un editor de contenido del podcast AMTME. ${AMTME_CONTEXT}

Analiza este guión y extrae las 6-10 frases más poderosas como candidatas a citas.

CRITERIOS DE SELECCIÓN:
- Afirmaciones con alto peso emocional o psicológico
- Frases que funcionan solas sin contexto
- Insights que el oyente querrá compartir
- Máximo 30 palabras por cita
- Sin frases de transición ni de presentación

TIPOS DE CITA:
- hook: frase de apertura impactante
- revelation: insight profundo o verdad incómoda
- punchline: remate con humor o ironía
- closing: frase de cierre memorable
- social: ideal para publicar en redes
- question: pregunta que incomoda o desafía
- bridge: transición entre ideas importantes
- opening: apertura de sección narrativa

Responde ÚNICAMENTE con un JSON válido (sin markdown, sin backticks):
{
  "quotes": [
    {
      "text": "texto exacto de la frase",
      "quote_type": "hook|revelation|punchline|closing|social|question|bridge|opening",
      "timestamp_hint": "descripción breve de dónde aparece en el guión (ej: 'intro', 'mitad', 'cierre')",
      "rationale": "por qué esta frase es poderosa (1 línea)"
    }
  ]
}`;

const INSIGHTS_PROMPT = `Eres un estratega de aprendizaje del podcast AMTME. ${AMTME_CONTEXT}

Analiza este guión y extrae 4-8 hipótesis o experimentos de aprendizaje que el host podría implementar o validar.

CRITERIOS:
- Hipótesis sobre comportamiento del oyente, distribución de contenido, o formato narrativo
- Experimentos que se pueden medir o validar en 1-4 semanas
- Ideas de mejora para próximos episodios
- Patrones o tendencias identificados en el guión

CATEGORÍAS:
- content: sobre el contenido del episodio
- format: sobre el formato narrativo o duración
- distribution: sobre canales y plataformas
- audience: sobre la respuesta esperada de la audiencia
- production: sobre la calidad o proceso de producción

Responde ÚNICAMENTE con un JSON válido (sin markdown, sin backticks):
{
  "insights": [
    {
      "hypothesis": "Si [condición], entonces [resultado esperado]",
      "category": "content|format|distribution|audience|production",
      "potential_action": "acción concreta para validar esta hipótesis (1-2 líneas)",
      "rationale": "por qué este insight es relevante para AMTME"
    }
  ]
}`;

function json(data: unknown, status: number, cors: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

serve(async (req: Request) => {
  const cors = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  try {
    const body = await req.json();
    const {
      episode_id,
      script,
      episode_title,
      episode_number,
      run_id: providedRunId,
      source = "frontend",
    } = body as {
      episode_id: string;
      script: string;
      episode_title?: string;
      episode_number?: string | number;
      run_id?: string;
      source?: string;
    };

    if (!episode_id || !script || script.trim().length < 50) {
      return json({ error: "episode_id required and script must be ≥50 chars" }, 400, cors);
    }

    // ── Auth resolution ────────────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization") ?? "";
    let userId: string;

    const isServiceRole = authHeader === `Bearer ${SERVICE_ROLE_KEY}`;
    if (isServiceRole) {
      // Called from DB trigger — look up episode owner
      const { data: ep } = await adminClient
        .from("episodes")
        .select("user_id")
        .eq("id", episode_id)
        .single();
      if (!ep?.user_id) return json({ error: "Episode not found" }, 404, cors);
      userId = ep.user_id;
    } else {
      const userClient = createClient(SUPABASE_URL, ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
      });
      const {
        data: { user },
      } = await userClient.auth.getUser();
      if (!user) return json({ error: "Unauthorized" }, 401, cors);
      userId = user.id;
    }

    // ── Server-side idempotency: skip if ran within last 30s ──────────────────
    // Prevents double-execution when both frontend and DB trigger fire together
    const since = new Date(Date.now() - 30_000).toISOString();
    const { data: recentRun } = await adminClient
      .from("automation_logs")
      .select("id")
      .eq("episode_id", episode_id)
      .eq("event_type", "script_saved")
      .in("status", ["started", "success"])
      .gte("created_at", since)
      .limit(1)
      .maybeSingle();

    if (recentRun) {
      return json({ ok: true, quotesExtracted: 0, insightsExtracted: 0, skipped: true }, 200, cors);
    }

    const runId = providedRunId ?? crypto.randomUUID();
    const started = Date.now();

    // Log: started
    await adminClient.from("automation_logs").insert({
      user_id: userId,
      run_id: runId,
      event_type: "script_saved",
      entity_type: "episode",
      entity_id: episode_id,
      episode_id,
      status: "started",
      metadata: { source, scriptLength: script.trim().length, episode_title, episode_number },
    });

    // ── AI extraction ──────────────────────────────────────────────────────────
    const ai = resolveAI();
    const scriptTruncated = script.substring(0, 8000);
    const episodeContext = [
      episode_number ? `Episodio #${episode_number}` : "",
      episode_title ? `Título: "${episode_title}"` : "",
    ]
      .filter(Boolean)
      .join(" — ");

    const userContent = `${episodeContext ? episodeContext + "\n\n" : ""}GUIÓN:\n${scriptTruncated}`;

    // Run quotes + insights in parallel
    const [quotesResp, insightsResp] = await Promise.all([
      fetch(ai.url, {
        method: "POST",
        headers: { Authorization: `Bearer ${ai.key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: ai.model,
          messages: [
            { role: "system", content: QUOTES_PROMPT },
            { role: "user", content: userContent },
          ],
          temperature: 0.6,
        }),
      }),
      fetch(ai.url, {
        method: "POST",
        headers: { Authorization: `Bearer ${ai.key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: ai.model,
          messages: [
            { role: "system", content: INSIGHTS_PROMPT },
            { role: "user", content: userContent },
          ],
          temperature: 0.7,
        }),
      }),
    ]);

    if (!quotesResp.ok)
      throw new Error(`AI quotes error: ${quotesResp.status}`);
    if (!insightsResp.ok)
      throw new Error(`AI insights error: ${insightsResp.status}`);

    const [quotesData, insightsData] = await Promise.all([
      quotesResp.json(),
      insightsResp.json(),
    ]);

    type QuoteItem = { text: string; quote_type: string; timestamp_hint: string };
    type InsightItem = { hypothesis: string; category: string; potential_action: string };

    const parseJson = (content: string, field: string) => {
      const m = content.match(/\{[\s\S]*\}/);
      if (!m) return [];
      const parsed = JSON.parse(m[0]);
      return parsed[field] ?? [];
    };

    const quotesContent = quotesData.choices?.[0]?.message?.content?.trim() ?? "";
    const insightsContent = insightsData.choices?.[0]?.message?.content?.trim() ?? "";

    const quotes: QuoteItem[] = parseJson(quotesContent, "quotes");
    const insights: InsightItem[] = parseJson(insightsContent, "insights");

    let quotesExtracted = 0;
    let insightsExtracted = 0;

    if (quotes.length) {
      const rows = quotes.map((q) => ({
        user_id: userId,
        episode_id,
        text: q.text,
        quote_type: q.quote_type || null,
        timestamp_ref: q.timestamp_hint || null,
        status: "captured",
        clarity: 3,
        emotional_intensity: 3,
        memorability: 3,
        shareability: 3,
        visual_fit: 3,
        source_type: "ai_extracted",
        source_module: "automation.script_extraction",
      }));
      const { error } = await adminClient.from("quote_candidates").insert(rows);
      if (!error) quotesExtracted = rows.length;
    }

    if (insights.length) {
      const rows = insights.map((i) => ({
        user_id: userId,
        episode_id,
        finding: i.hypothesis,
        hypothesis: i.hypothesis,
        recommendation: i.potential_action || null,
        confidence_level: "medium",
        status: "active",
        source: "ai_extracted",
        category: i.category || null,
      }));
      const { error } = await adminClient.from("insights").insert(rows);
      if (!error) insightsExtracted = rows.length;
    }

    const durationMs = Date.now() - started;

    // Log: success
    await adminClient.from("automation_logs").insert({
      user_id: userId,
      run_id: runId,
      event_type: "script_saved",
      entity_type: "episode",
      entity_id: episode_id,
      episode_id,
      status: "success",
      result_summary: `${quotesExtracted} quotes · ${insightsExtracted} insights extraídos`,
      duration_ms: durationMs,
      metadata: { source, quotesExtracted, insightsExtracted },
    });

    // Fire-and-forget episode evaluation
    fetch(`${SUPABASE_URL}/functions/v1/automation-episode-evaluate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ episode_id, source: "automation-script-extraction" }),
    }).catch(() => {});

    return json({ ok: true, quotesExtracted, insightsExtracted, runId }, 200, cors);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return json({ ok: false, error: message }, 500, cors);
  }
});
