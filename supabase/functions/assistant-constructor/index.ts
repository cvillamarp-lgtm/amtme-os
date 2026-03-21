import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { callAI } from "../_shared/ai.ts";

type Mode = "plan" | "apply" | "cancel" | "history" | "rollback";

type ProposedChange = {
  field: string;
  before: unknown;
  after: unknown;
  status: "update" | "conflict" | "no_change";
  reason?: string;
};

type RiskSimulation = {
  score: number;
  level: "low" | "medium" | "high";
  factors: string[];
  requires_manual_review: boolean;
};

const ALLOWED_FIELDS = [
  "working_title",
  "theme",
  "core_thesis",
  "summary",
  "hook",
  "cta",
  "quote",
  "descripcion_spotify",
  "conflicto_central",
  "intencion_del_episodio",
] as const;

const CRITICAL_FIELDS = new Set<string>([
  "working_title",
  "theme",
  "core_thesis",
  "summary",
  "hook",
  "cta",
]);

const SYSTEM_PROMPT = `Eres un planner de cambios para una app editorial.
Tu salida SIEMPRE es JSON válido.
Convierte una instrucción en operaciones estructuradas seguras.

Reglas:
- Solo usa campos permitidos.
- No borres contenido crítico automáticamente.
- Si la instrucción es ambigua, devuelve menos operaciones y agrega warnings.
- Evita duplicar contenido si el valor propuesto es igual al actual.`;

function json(body: unknown, status: number, cors: HeadersInit) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

function buildSnapshot(episode: Record<string, unknown>) {
  const snapshot: Record<string, unknown> = {};
  for (const field of ALLOWED_FIELDS) {
    snapshot[field] = episode[field] ?? null;
  }
  return snapshot;
}

function parseModelJson(raw: string): Record<string, unknown> {
  const cleaned = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  const objMatch = cleaned.match(/\{[\s\S]*\}/);
  return JSON.parse(objMatch?.[0] ?? cleaned);
}

function estimateRisk(changes: ProposedChange[], warnings: string[], conflicts: string[]): RiskSimulation {
  let score = 0;
  const factors: string[] = [];

  const updates = changes.filter((c) => c.status === "update");
  const criticalUpdates = updates.filter((c) => CRITICAL_FIELDS.has(c.field));
  const clearOps = updates.filter((c) => c.after === null || String(c.after ?? "").trim() === "");
  const largeTextOps = updates.filter((c) => {
    const beforeLen = String(c.before ?? "").trim().length;
    const afterLen = String(c.after ?? "").trim().length;
    return Math.abs(afterLen - beforeLen) > 180;
  });

  if (updates.length > 0) {
    score += Math.min(20, updates.length * 3);
    factors.push(`Campos a modificar: ${updates.length}`);
  }
  if (criticalUpdates.length > 0) {
    score += criticalUpdates.length * 12;
    factors.push(`Campos críticos impactados: ${criticalUpdates.length}`);
  }
  if (clearOps.length > 0) {
    score += clearOps.length * 18;
    factors.push(`Posibles limpiezas de contenido: ${clearOps.length}`);
  }
  if (largeTextOps.length > 0) {
    score += largeTextOps.length * 8;
    factors.push(`Cambios largos de texto: ${largeTextOps.length}`);
  }
  if (warnings.length > 0) {
    score += Math.min(20, warnings.length * 5);
    factors.push(`Warnings del planner: ${warnings.length}`);
  }
  if (conflicts.length > 0) {
    score += conflicts.length * 25;
    factors.push(`Conflictos detectados: ${conflicts.length}`);
  }

  score = Math.max(0, Math.min(100, score));
  const level: RiskSimulation["level"] = score >= 70 ? "high" : score >= 40 ? "medium" : "low";
  return {
    score,
    level,
    factors,
    requires_manual_review: level !== "low" || conflicts.length > 0,
  };
}

serve(async (req) => {
  const cors = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Missing authorization" }, 401, cors);
    }

    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) return json({ error: "Invalid token" }, 401, cors);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json();
    const mode = (body.mode ?? "plan") as Mode;
    const episodeId = body.episode_id as string | undefined;

    if (!episodeId) return json({ error: "episode_id is required" }, 400, cors);

    const { data: episode, error: epErr } = await admin
      .from("episodes")
      .select("id, user_id, working_title, theme, core_thesis, summary, hook, cta, quote, descripcion_spotify, conflicto_central, intencion_del_episodio")
      .eq("id", episodeId)
      .eq("user_id", user.id)
      .single();

    if (epErr || !episode) return json({ error: "Episode not found" }, 404, cors);

    if (mode === "history") {
      const { data: runs, error } = await admin
        .from("assistant_action_runs")
        .select("id, instruction, status, intent, created_at, applied_at, rolled_back_at")
        .eq("episode_id", episodeId)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(30);

      if (error) return json({ error: error.message }, 500, cors);
      return json({ runs: runs ?? [] }, 200, cors);
    }

    const runId = body.run_id as string | undefined;

    if (mode === "cancel") {
      if (!runId) return json({ error: "run_id is required" }, 400, cors);
      const { error } = await admin
        .from("assistant_action_runs")
        .update({ status: "canceled" })
        .eq("id", runId)
        .eq("episode_id", episodeId)
        .eq("user_id", user.id)
        .eq("status", "planned");
      if (error) return json({ error: error.message }, 500, cors);
      return json({ run_id: runId, status: "canceled" }, 200, cors);
    }

    if (mode === "apply") {
      if (!runId) return json({ error: "run_id is required" }, 400, cors);

      const { data: run, error: runErr } = await admin
        .from("assistant_action_runs")
        .select("id, status, proposed_changes, before_snapshot")
        .eq("id", runId)
        .eq("episode_id", episodeId)
        .eq("user_id", user.id)
        .single();

      if (runErr || !run) return json({ error: "Run not found" }, 404, cors);
      if (run.status !== "planned") return json({ error: "Only planned runs can be applied" }, 400, cors);

      const changes = (run.proposed_changes as ProposedChange[] | null) ?? [];
      const patch: Record<string, unknown> = {};
      const conflicts = changes.filter((c) => c.status === "conflict");
      if (conflicts.length > 0) return json({ error: "Resolve conflicts before apply", conflicts }, 409, cors);

      for (const change of changes) {
        if (change.status !== "update") continue;
        if (!ALLOWED_FIELDS.includes(change.field as (typeof ALLOWED_FIELDS)[number])) continue;

        const afterValue = change.after;
        const isClear = afterValue === null || String(afterValue ?? "").trim() === "";
        if (isClear && CRITICAL_FIELDS.has(change.field)) {
          return json({ error: `Critical field cannot be cleared automatically: ${change.field}` }, 400, cors);
        }

        patch[change.field] = afterValue;
      }

      if (Object.keys(patch).length === 0) {
        const { error: markErr } = await admin
          .from("assistant_action_runs")
          .update({ status: "canceled" })
          .eq("id", runId)
          .eq("episode_id", episodeId)
          .eq("user_id", user.id);
        if (markErr) return json({ error: markErr.message }, 500, cors);
        return json({ run_id: runId, status: "canceled", updated_fields: [] }, 200, cors);
      }

      const { error: updateErr } = await admin
        .from("episodes")
        .update(patch)
        .eq("id", episodeId)
        .eq("user_id", user.id);
      if (updateErr) return json({ error: updateErr.message }, 500, cors);

      const afterSnapshot = {
        ...buildSnapshot(episode as unknown as Record<string, unknown>),
        ...patch,
      };

      const { error: runUpdateErr } = await admin
        .from("assistant_action_runs")
        .update({
          status: "applied",
          applied_at: new Date().toISOString(),
          after_snapshot: afterSnapshot,
          executed_actions: patch,
        })
        .eq("id", runId)
        .eq("episode_id", episodeId)
        .eq("user_id", user.id);
      if (runUpdateErr) return json({ error: runUpdateErr.message }, 500, cors);

      return json({ run_id: runId, status: "applied", updated_fields: Object.keys(patch) }, 200, cors);
    }

    if (mode === "rollback") {
      if (!runId) return json({ error: "run_id is required" }, 400, cors);

      const { data: run, error: runErr } = await admin
        .from("assistant_action_runs")
        .select("id, status, before_snapshot")
        .eq("id", runId)
        .eq("episode_id", episodeId)
        .eq("user_id", user.id)
        .single();
      if (runErr || !run) return json({ error: "Run not found" }, 404, cors);
      if (run.status !== "applied") return json({ error: "Only applied runs can be restored" }, 400, cors);

      const before = (run.before_snapshot as Record<string, unknown> | null) ?? {};
      const rollbackPatch: Record<string, unknown> = {};
      for (const field of ALLOWED_FIELDS) {
        if (before[field] !== undefined) rollbackPatch[field] = before[field];
      }

      const { error: epUpdateErr } = await admin
        .from("episodes")
        .update(rollbackPatch)
        .eq("id", episodeId)
        .eq("user_id", user.id);
      if (epUpdateErr) return json({ error: epUpdateErr.message }, 500, cors);

      const { error: runUpdateErr } = await admin
        .from("assistant_action_runs")
        .update({ status: "rolled_back", rolled_back_at: new Date().toISOString() })
        .eq("id", runId)
        .eq("episode_id", episodeId)
        .eq("user_id", user.id);
      if (runUpdateErr) return json({ error: runUpdateErr.message }, 500, cors);

      return json({ run_id: runId, status: "rolled_back" }, 200, cors);
    }

    // mode === "plan"
    const instruction = (body.instruction as string | undefined)?.trim();
    if (!instruction) return json({ error: "instruction is required" }, 400, cors);

    const plannerPrompt = `Convierte la instrucción del usuario en JSON estricto.

Campos permitidos: ${ALLOWED_FIELDS.join(", ")}
Estado actual del episodio:
${JSON.stringify(buildSnapshot(episode as unknown as Record<string, unknown>), null, 2)}

Instrucción:
"${instruction}"

Responde JSON exacto:
{
  "intent": "UPDATE_FIELDS" | "REORGANIZE" | "CONSOLIDATE" | "SAFETY_REVIEW",
  "summary": "resumen de la propuesta",
  "operations": [
    {
      "field": "uno de los permitidos",
      "value": "nuevo valor",
      "reason": "por qué"
    }
  ],
  "warnings": ["warning opcional"]
}`;

    const rawPlan = await callAI([
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: plannerPrompt },
    ], 0.3);

    const parsed = parseModelJson(rawPlan);
    const intent = String(parsed.intent ?? "UPDATE_FIELDS");
    const summary = String(parsed.summary ?? "Propuesta de actualización estructurada");
    const warnings = Array.isArray(parsed.warnings)
      ? parsed.warnings.map((w) => String(w))
      : [];

    const operations = Array.isArray(parsed.operations) ? parsed.operations : [];

    const beforeSnapshot = buildSnapshot(episode as unknown as Record<string, unknown>);
    const changes: ProposedChange[] = [];
    const conflicts: string[] = [];

    for (const op of operations as Array<Record<string, unknown>>) {
      const field = String(op.field ?? "").trim();
      if (!ALLOWED_FIELDS.includes(field as (typeof ALLOWED_FIELDS)[number])) continue;

      const before = beforeSnapshot[field];
      const after = op.value ?? null;
      const reason = String(op.reason ?? "");

      if (String(before ?? "").trim() === String(after ?? "").trim()) {
        changes.push({ field, before, after, status: "no_change", reason: reason || "Sin cambios efectivos" });
        continue;
      }

      const isCritical = CRITICAL_FIELDS.has(field);
      const hasBefore = String(before ?? "").trim().length > 0;
      if (isCritical && hasBefore) {
        changes.push({ field, before, after, status: "conflict", reason: reason || "Campo crítico ya tiene valor" });
        conflicts.push(`${field}: el campo ya tiene contenido y requiere revisión manual`);
        continue;
      }

      changes.push({ field, before, after, status: "update", reason });
    }

    if (changes.length === 0) {
      warnings.push("La instrucción no produjo cambios válidos sobre campos permitidos.");
    }

    const risk = estimateRisk(changes, warnings, conflicts);
    const impact = {
      will_modify: changes.filter((c) => c.status === "update").map((c) => c.field),
      will_preserve: ALLOWED_FIELDS.filter((f) => !changes.some((c) => c.field === f && c.status === "update")),
      historical_snapshot: true,
      potential_conflicts: conflicts.length,
    };

    const { data: run, error: insertErr } = await admin
      .from("assistant_action_runs")
      .insert({
        user_id: user.id,
        episode_id: episodeId,
        instruction,
        intent,
        status: "planned",
        plan_summary: summary,
        proposed_changes: changes,
        conflicts,
        warnings,
        before_snapshot: beforeSnapshot,
      })
      .select("id")
      .single();

    if (insertErr || !run) return json({ error: insertErr?.message ?? "Cannot store plan" }, 500, cors);

    return json({
      run_id: run.id,
      plan: {
        intent,
        summary,
        operations_count: changes.length,
      },
      changes,
      warnings,
      conflicts,
      risk,
      impact,
    }, 200, cors);
  } catch (error) {
    console.error("assistant-constructor error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return json({ error: message }, 500, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    });
  }
});
