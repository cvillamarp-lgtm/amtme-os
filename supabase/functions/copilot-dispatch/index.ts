import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { callAI } from "../_shared/ai.ts";

const SYSTEM_PROMPT = `Eres el Copiloto Operativo del podcast A Mí Tampoco Me Explicaron (AMTME).
Host: Christian Villamar. Base: Playa del Carmen, México.
Audiencia: hombres hispanos 28–44 años, LATAM.
TONO: Directo, íntimo, primera persona. Nunca autoayuda. Español neutro LATAM.
POSICIONAMIENTO: "El único podcast en español que habla directamente a hombres hispanos sobre amor, apego e identidad — sin juicio, sin poses."

Recibirás: un COMANDO del usuario + el contexto actual del episodio.
Tu trabajo: detectar la intención y ejecutarla generando el contenido apropiado.

INTENCIONES DISPONIBLES:
- FILL_EPISODE_FIELDS: Genera theme, core_thesis, summary, hook, cta, quote, working_title, descripcion_spotify basado en la idea principal.
- GENERATE_OPTIONS: Genera 3 opciones distintas para el campo especificado y guárdalas en copilot_candidates.
- CLEAN_SCRIPT: Limpia el guión del episodio (quita timestamps, marcadores técnicos, normaliza formato).
- DISTRIBUTION_PACK: Genera descripcion_spotify, copy_ig, hashtags para distribución.
- QA_AUDIT_SAVE: Verifica completitud del episodio y genera reporte de auditoría.

Responde SOLO con un JSON válido, sin markdown, sin backticks.`;

// ── Field-specific instructions (mirrors generate-episode-fields) ────────────
const FIELD_INSTRUCTIONS: Record<string, string> = {
  working_title: "formato Ep. XX — [Título]. Máx 7 palabras.",
  theme: "el tema en una línea. Sin adornos.",
  core_thesis: "idea central. Una sola oración. Que el oyente pueda repetirla.",
  summary: "resumen. Máx 60 palabras. Sin spoilers del cierre.",
  hook: "frase de apertura. Máx 10 palabras. Directo al conflicto.",
  cta: "llamada a la acción. Menciona @yosoyvillamar y @amtmepodcast. Cierra con: Nos escuchamos. — A Mí Tampoco Me Explicaron",
  quote: "frase más poderosa. Máx 12 palabras. Afirmación, no consejo.",
  descripcion_spotify: "máx 150 palabras. Hook → desarrollo → lista 3-4 puntos → cierre. Termina con: Aquí no juzgamos. Acompañamos. @yosoyvillamar",
  conflicto_central: "el conflicto central en una oración. La grieta emocional que sostiene el episodio.",
  intencion_del_episodio: "qué quiere que el oyente sienta o piense al terminar.",
};

serve(async (req) => {
  const cors = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    // ── Auth ──────────────────────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const supabaseUser = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Service-role client for DB writes
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json();
    const { episode_id, command } = body as { episode_id: string; command: string };

    if (!episode_id || !command) {
      return new Response(JSON.stringify({ error: "episode_id and command are required" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // ── Fetch episode ─────────────────────────────────────────────────────────
    const { data: episode, error: epErr } = await supabaseAdmin
      .from("episodes")
      .select("id, title, working_title, idea_principal, theme, core_thesis, summary, hook, cta, quote, descripcion_spotify, script_base, script_generated, number, conflicto_central, intencion_del_episodio, copilot_candidates")
      .eq("id", episode_id)
      .eq("user_id", user.id)
      .single();

    if (epErr || !episode) {
      return new Response(JSON.stringify({ error: "Episode not found" }), {
        status: 404, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // ── Step 1: Detect intent ─────────────────────────────────────────────────
    const intentPrompt = `Detecta la intención del comando y responde con JSON:
{
  "intent": "FILL_EPISODE_FIELDS" | "GENERATE_OPTIONS" | "CLEAN_SCRIPT" | "DISTRIBUTION_PACK" | "QA_AUDIT_SAVE",
  "field": "nombre_campo_si_aplica_o_null",
  "description": "qué vas a hacer en una frase"
}

Episodio actual:
- working_title: "${episode.working_title || episode.title || ''}"
- idea_principal: "${(episode as Record<string, unknown>).idea_principal || ''}"
- theme: "${episode.theme || ''}"

Comando del usuario: "${command}"`;

    const intentContent = await callAI([
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: intentPrompt },
    ], 0.3);

    let intentPlan: { intent: string; field: string | null; description: string };
    try {
      const m = intentContent.match(/\{[\s\S]*\}/);
      intentPlan = JSON.parse(m?.[0] ?? intentContent);
    } catch {
      intentPlan = { intent: "FILL_EPISODE_FIELDS", field: null, description: "Generando campos del episodio" };
    }

    // ── Step 2: Execute intent ────────────────────────────────────────────────
    let patch: Record<string, unknown> = {};
    let fieldsUpdated: string[] = [];
    let extraResult: Record<string, unknown> = {};

    // ── FILL_EPISODE_FIELDS ───────────────────────────────────────────────────
    if (intentPlan.intent === "FILL_EPISODE_FIELDS") {
      const fieldInstructions = Object.entries(FIELD_INSTRUCTIONS)
        .filter(([k]) => ["working_title","theme","core_thesis","summary","hook","cta","quote","descripcion_spotify"].includes(k))
        .map(([k, v]) => `  "${k}": "${v}"`)
        .join(",\n");

      const fillPrompt = `Genera todos los campos base para este episodio de AMTME.

Idea principal: "${(episode as Record<string, unknown>).idea_principal || command}"
${episode.number ? `Número: ${episode.number}` : ""}
${(episode as Record<string, unknown>).conflicto_central ? `Conflicto: "${(episode as Record<string, unknown>).conflicto_central}"` : ""}

Responde ÚNICAMENTE con JSON válido:
{
${fieldInstructions}
}`;

      const fillContent = await callAI([
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: fillPrompt },
      ], 0.7);

      const m = fillContent.match(/\{[\s\S]*\}/);
      const fields = JSON.parse(m?.[0] ?? fillContent);
      patch = fields;
      fieldsUpdated = Object.keys(fields).filter((k) => fields[k]);
    }

    // ── GENERATE_OPTIONS ──────────────────────────────────────────────────────
    else if (intentPlan.intent === "GENERATE_OPTIONS") {
      const targetField = intentPlan.field || "hook";
      const instruction = FIELD_INSTRUCTIONS[targetField] || "genera opciones distintas";
      const optPrompt = `Genera 3 opciones DISTINTAS para el campo "${targetField}" de un episodio de AMTME.

Idea principal: "${(episode as Record<string, unknown>).idea_principal || ''}"
Tema actual: "${episode.theme || ''}"
Instrucción para "${targetField}": ${instruction}

Las opciones deben tener enfoques, ángulos y tonos REALMENTE diferentes.

Responde ÚNICAMENTE con JSON:
[
  {"value": "opción 1", "rationale": "por qué este enfoque"},
  {"value": "opción 2", "rationale": "por qué este enfoque"},
  {"value": "opción 3", "rationale": "por qué este enfoque"}
]`;

      const optContent = await callAI([
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: optPrompt },
      ], 0.9);

      const mArr = optContent.match(/\[[\s\S]*\]/);
      const options = JSON.parse(mArr?.[0] ?? optContent);
      const candidates = { ...(episode.copilot_candidates as Record<string, unknown> || {}), [targetField]: options };
      patch = { copilot_candidates: candidates };
      fieldsUpdated = [targetField];
      extraResult = { options, field: targetField };
    }

    // ── CLEAN_SCRIPT ──────────────────────────────────────────────────────────
    else if (intentPlan.intent === "CLEAN_SCRIPT") {
      const rawScript = episode.script_base || episode.script_generated || command;
      const cleanPrompt = `Limpia este guión de podcast:
1. Elimina timestamps (ej: [00:00], 00:00:00)
2. Elimina marcadores técnicos ([Música], [PAUSA], [FX], etc)
3. Elimina números de sección/bloque al inicio de líneas
4. Normaliza párrafos (separa bloques con línea en blanco)
5. Preserva TODO el contenido editorial sin cambiar palabras
6. NO hagas reescritura editorial — solo limpieza de formato

GUIÓN:
${rawScript}

Devuelve SOLO el guión limpio, sin comentarios.`;

      const cleaned = await callAI([
        { role: "system", content: "Eres un editor de guiones de podcast. Limpia formato sin cambiar contenido." },
        { role: "user", content: cleanPrompt },
      ], 0.1);

      patch = { script_clean: cleaned };
      fieldsUpdated = ["script_clean"];
    }

    // ── DISTRIBUTION_PACK ─────────────────────────────────────────────────────
    else if (intentPlan.intent === "DISTRIBUTION_PACK") {
      const distPrompt = `Genera el pack de distribución para este episodio de AMTME.

Episodio:
- Título: "${episode.working_title || episode.title}"
- Tema: "${episode.theme || ''}"
- Tesis: "${episode.core_thesis || ''}"
- Resumen: "${episode.summary || ''}"
- Hook: "${episode.hook || ''}"

Responde con JSON:
{
  "descripcion_spotify": "máx 150 palabras, estructura AMTME",
  "copy_ig": "copy para Instagram. 3-5 líneas. Hook + desarrollo + CTA. Incluye emojis estratégicos.",
  "hashtags": "#AMíTampocoMeExplicaron #christianvillamar + 6-8 hashtags del tema"
}`;

      const distContent = await callAI([
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: distPrompt },
      ], 0.7);

      const mDist = distContent.match(/\{[\s\S]*\}/);
      const distFields = JSON.parse(mDist?.[0] ?? distContent);
      patch = { descripcion_spotify: distFields.descripcion_spotify };
      fieldsUpdated = Object.keys(distFields);
      extraResult = distFields;
    }

    // ── QA_AUDIT_SAVE ─────────────────────────────────────────────────────────
    else if (intentPlan.intent === "QA_AUDIT_SAVE") {
      const checks = [
        { field: "idea_principal", ok: !!(episode as Record<string, unknown>).idea_principal },
        { field: "working_title", ok: !!(episode.working_title || episode.title) },
        { field: "theme", ok: !!episode.theme },
        { field: "core_thesis", ok: !!episode.core_thesis },
        { field: "summary", ok: !!episode.summary },
        { field: "hook", ok: !!episode.hook },
        { field: "cta", ok: !!episode.cta },
        { field: "quote", ok: !!episode.quote },
        { field: "script", ok: !!(episode.script_base || episode.script_generated) },
      ];
      const passed = checks.filter((c) => c.ok).length;
      const score = Math.round((passed / checks.length) * 100);
      extraResult = { checks, score, passed, total: checks.length };
      patch = {};
      fieldsUpdated = [];
      intentPlan.description = `Auditoría completada: ${score}% (${passed}/${checks.length} checks)`;
    }

    // ── Apply patch to DB ────────────────────────────────────────────────────
    const diff: Record<string, { before: unknown; after: unknown }> = {};
    if (Object.keys(patch).length > 0) {
      for (const key of Object.keys(patch)) {
        diff[key] = {
          before: (episode as Record<string, unknown>)[key] ?? null,
          after: patch[key],
        };
      }

      const { error: updateErr } = await supabaseAdmin
        .from("episodes")
        .update(patch)
        .eq("id", episode_id)
        .eq("user_id", user.id);

      if (updateErr) throw new Error(`DB update failed: ${updateErr.message}`);
    }

    // ── Log audit event ──────────────────────────────────────────────────────
    const { data: auditRow } = await supabaseAdmin
      .from("audit_events")
      .insert({
        episode_id,
        user_id: user.id,
        action: intentPlan.intent,
        patch,
        result: { ...extraResult, fields_updated: fieldsUpdated, diff },
      })
      .select("id")
      .single();

    return new Response(JSON.stringify({
      plan: {
        intent: intentPlan.intent,
        description: intentPlan.description,
        fields_to_update: fieldsUpdated,
      },
      diff,
      extra: extraResult,
      audit_id: auditRow?.id ?? null,
    }), {
      status: 200,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("copilot-dispatch error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message.includes("Créditos") ? 402 : 500;
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
