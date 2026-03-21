import "../_shared/deno-shims.d.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { callAI } from "../_shared/ai.ts";
import { errorResponse } from "../_shared/response.ts";

type Mode = "plan" | "apply" | "cancel" | "history" | "rollback";

type ProposedChange = {
  change_id: string;
  entity_type: "episode" | "asset_candidates" | "tasks" | "publication_queue";
  action:
    | "update_field"
    | "create_candidate"
    | "update_candidate"
    | "create_task"
    | "update_task"
    | "create_publication"
    | "update_publication";
  field: string;
  before: unknown;
  after: unknown;
  status: "update" | "conflict" | "no_change";
  reason?: string;
  payload?: Record<string, unknown>;
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

const ALLOWED_ENTITY_TYPES = ["episode", "asset_candidates", "tasks", "publication_queue"] as const;

const ALLOWED_ACTIONS = [
  "update_field",
  "create_candidate",
  "update_candidate",
  "create_task",
  "update_task",
  "create_publication",
  "update_publication",
] as const;

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

function asUpdatePayload(row: Record<string, unknown>) {
  const out = { ...row };
  delete out.id;
  delete out.user_id;
  delete out.created_at;
  delete out.updated_at;
  return out;
}

function estimateRisk(changes: ProposedChange[], warnings: string[], conflicts: string[]): RiskSimulation {
  let score = 0;
  const factors: string[] = [];

  const updates = changes.filter((c) => c.status === "update");
  const criticalUpdates = updates.filter((c) => c.entity_type === "episode" && CRITICAL_FIELDS.has(c.field));
  const crossEntityOps = updates.filter((c) => c.entity_type !== "episode");
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
  if (crossEntityOps.length > 0) {
    score += crossEntityOps.length * 10;
    factors.push(`Operaciones multi-entidad: ${crossEntityOps.length}`);
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
      const selectedChangeIds = Array.isArray(body.selected_change_ids)
        ? body.selected_change_ids.map((id: unknown) => String(id))
        : null;

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
      const changesToApply = selectedChangeIds
        ? changes.filter((c) => selectedChangeIds.includes(c.change_id))
        : changes.filter((c) => c.status === "update");
      const patch: Record<string, unknown> = {};
      const createdAssets: string[] = [];
      const createdTasks: string[] = [];
      const createdPublications: string[] = [];
      const updatedAssets: string[] = [];
      const updatedTasks: string[] = [];
      const updatedPublications: string[] = [];
      const executedActions: Record<string, unknown> = {
        episode_patch: {},
        created_assets: [] as string[],
        created_tasks: [] as string[],
        created_publications: [] as string[],
        updated_assets_before: [] as Array<Record<string, unknown>>,
        updated_tasks_before: [] as Array<Record<string, unknown>>,
        updated_publications_before: [] as Array<Record<string, unknown>>,
      };
      const conflicts = changesToApply.filter((c) => c.status === "conflict");
      if (conflicts.length > 0) return json({ error: "Resolve conflicts before apply", conflicts }, 409, cors);

      for (const change of changesToApply) {
        if (change.status !== "update") continue;
        if (change.entity_type === "episode") {
          if (!ALLOWED_FIELDS.includes(change.field as (typeof ALLOWED_FIELDS)[number])) continue;

          const afterValue = change.after;
          const isClear = afterValue === null || String(afterValue ?? "").trim() === "";
          if (isClear && CRITICAL_FIELDS.has(change.field)) {
            return json({ error: `Critical field cannot be cleared automatically: ${change.field}` }, 400, cors);
          }

          patch[change.field] = afterValue;
          continue;
        }

        if (change.entity_type === "asset_candidates" && change.action === "create_candidate") {
          const payload = (change.payload ?? {}) as Record<string, unknown>;
          const title = String(payload.title ?? "").trim();
          const bodyText = String(payload.body_text ?? "").trim();
          const assetType = String(payload.asset_type ?? "quote").trim() || "quote";
          const platform = String(payload.platform ?? "instagram_feed").trim() || "instagram_feed";

          if (!title && !bodyText) continue;

          const { data: existing } = await admin
            .from("asset_candidates")
            .select("id")
            .eq("user_id", user.id)
            .eq("episode_id", episodeId)
            .eq("asset_type", assetType)
            .eq("title", title || null)
            .eq("body_text", bodyText || null)
            .limit(1);

          if ((existing ?? []).length > 0) continue;

          const { data: created, error: createErr } = await admin
            .from("asset_candidates")
            .insert({
              user_id: user.id,
              episode_id: episodeId,
              asset_type: assetType,
              platform,
              title: title || null,
              body_text: bodyText || null,
              status: "candidate",
            })
            .select("id")
            .single();
          if (createErr) return json({ error: createErr.message }, 500, cors);
          if (created?.id) createdAssets.push(String(created.id));
          continue;
        }

        if (change.entity_type === "asset_candidates" && change.action === "update_candidate") {
          const payload = (change.payload ?? {}) as Record<string, unknown>;
          const candidateId = String(payload.id ?? "").trim();
          if (!candidateId) continue;

          const { data: current, error: currentErr } = await admin
            .from("asset_candidates")
            .select("*")
            .eq("id", candidateId)
            .eq("user_id", user.id)
            .eq("episode_id", episodeId)
            .single();
          if (currentErr || !current) return json({ error: "asset candidate not found" }, 404, cors);

          const updatePayload = {
            title: payload.title ?? current.title,
            body_text: payload.body_text ?? current.body_text,
            status: payload.status ?? current.status,
            platform: payload.platform ?? current.platform,
            asset_type: payload.asset_type ?? current.asset_type,
          };

          const { error: updateCandidateErr } = await admin
            .from("asset_candidates")
            .update(updatePayload)
            .eq("id", candidateId)
            .eq("user_id", user.id)
            .eq("episode_id", episodeId);
          if (updateCandidateErr) return json({ error: updateCandidateErr.message }, 500, cors);

          (executedActions.updated_assets_before as Array<Record<string, unknown>>).push({
            id: candidateId,
            before: asUpdatePayload(current as unknown as Record<string, unknown>),
          });
          updatedAssets.push(candidateId);
          continue;
        }

        if (change.entity_type === "tasks" && change.action === "create_task") {
          const payload = (change.payload ?? {}) as Record<string, unknown>;
          const title = String(payload.title ?? "").trim();
          if (!title) continue;

          const { data: existing } = await admin
            .from("tasks")
            .select("id")
            .eq("user_id", user.id)
            .eq("title", title)
            .in("status", ["todo", "in_progress", "pending"])
            .limit(1);
          if ((existing ?? []).length > 0) continue;

          const { data: created, error: createErr } = await admin
            .from("tasks")
            .insert({
              user_id: user.id,
              title,
              description: String(payload.description ?? "").trim() || null,
              status: String(payload.status ?? "todo") || "todo",
              priority: String(payload.priority ?? "medium") || "medium",
              category: String(payload.category ?? "assistant") || "assistant",
              due_date: String(payload.due_date ?? "").trim() || null,
            })
            .select("id")
            .single();
          if (createErr) return json({ error: createErr.message }, 500, cors);
          if (created?.id) createdTasks.push(String(created.id));
          continue;
        }

        if (change.entity_type === "tasks" && change.action === "update_task") {
          const payload = (change.payload ?? {}) as Record<string, unknown>;
          const taskId = String(payload.id ?? "").trim();
          if (!taskId) continue;

          const { data: current, error: currentErr } = await admin
            .from("tasks")
            .select("*")
            .eq("id", taskId)
            .eq("user_id", user.id)
            .single();
          if (currentErr || !current) return json({ error: "task not found" }, 404, cors);

          const updatePayload = {
            title: payload.title ?? current.title,
            description: payload.description ?? current.description,
            status: payload.status ?? current.status,
            priority: payload.priority ?? current.priority,
            category: payload.category ?? current.category,
            due_date: payload.due_date ?? current.due_date,
          };

          const { error: updateTaskErr } = await admin
            .from("tasks")
            .update(updatePayload)
            .eq("id", taskId)
            .eq("user_id", user.id);
          if (updateTaskErr) return json({ error: updateTaskErr.message }, 500, cors);

          (executedActions.updated_tasks_before as Array<Record<string, unknown>>).push({
            id: taskId,
            before: asUpdatePayload(current as unknown as Record<string, unknown>),
          });
          updatedTasks.push(taskId);
          continue;
        }

        if (change.entity_type === "publication_queue" && change.action === "create_publication") {
          const payload = (change.payload ?? {}) as Record<string, unknown>;
          const platform = String(payload.platform ?? "instagram").trim() || "instagram";

          const { data: existing } = await admin
            .from("publication_queue")
            .select("id")
            .eq("user_id", user.id)
            .eq("episode_id", episodeId)
            .eq("platform", platform)
            .in("status", ["draft", "scheduled"])
            .limit(1);
          if ((existing ?? []).length > 0) continue;

          const { data: created, error: createErr } = await admin
            .from("publication_queue")
            .insert({
              user_id: user.id,
              episode_id: episodeId,
              platform,
              status: String(payload.status ?? "draft") || "draft",
              notes: String(payload.notes ?? "").trim() || null,
              scheduled_at: String(payload.scheduled_at ?? "").trim() || null,
              checklist: (payload.checklist ?? null) as Record<string, unknown> | null,
            })
            .select("id")
            .single();
          if (createErr) return json({ error: createErr.message }, 500, cors);
          if (created?.id) createdPublications.push(String(created.id));
          continue;
        }

        if (change.entity_type === "publication_queue" && change.action === "update_publication") {
          const payload = (change.payload ?? {}) as Record<string, unknown>;
          const publicationId = String(payload.id ?? "").trim();
          if (!publicationId) continue;

          const { data: current, error: currentErr } = await admin
            .from("publication_queue")
            .select("*")
            .eq("id", publicationId)
            .eq("user_id", user.id)
            .eq("episode_id", episodeId)
            .single();
          if (currentErr || !current) return json({ error: "publication queue item not found" }, 404, cors);

          const updatePayload = {
            status: payload.status ?? current.status,
            notes: payload.notes ?? current.notes,
            scheduled_at: payload.scheduled_at ?? current.scheduled_at,
            checklist: payload.checklist ?? current.checklist,
            platform: payload.platform ?? current.platform,
          };

          const { error: updatePublicationErr } = await admin
            .from("publication_queue")
            .update(updatePayload)
            .eq("id", publicationId)
            .eq("user_id", user.id)
            .eq("episode_id", episodeId);
          if (updatePublicationErr) return json({ error: updatePublicationErr.message }, 500, cors);

          (executedActions.updated_publications_before as Array<Record<string, unknown>>).push({
            id: publicationId,
            before: asUpdatePayload(current as unknown as Record<string, unknown>),
          });
          updatedPublications.push(publicationId);
          continue;
        }
      }

      if (Object.keys(patch).length === 0 && createdAssets.length === 0 && createdTasks.length === 0 && createdPublications.length === 0 && updatedAssets.length === 0 && updatedTasks.length === 0 && updatedPublications.length === 0) {
        const { error: markErr } = await admin
          .from("assistant_action_runs")
          .update({ status: "canceled" })
          .eq("id", runId)
          .eq("episode_id", episodeId)
          .eq("user_id", user.id);
        if (markErr) return json({ error: markErr.message }, 500, cors);
        return json({ run_id: runId, status: "canceled", updated_fields: [] }, 200, cors);
      }

      if (Object.keys(patch).length > 0) {
        const { error: updateErr } = await admin
          .from("episodes")
          .update(patch)
          .eq("id", episodeId)
          .eq("user_id", user.id);
        if (updateErr) return json({ error: updateErr.message }, 500, cors);
      }

      const afterSnapshot = {
        ...buildSnapshot(episode as unknown as Record<string, unknown>),
        ...patch,
      };

      executedActions.episode_patch = patch;
      executedActions.created_assets = createdAssets;
      executedActions.created_tasks = createdTasks;
      executedActions.created_publications = createdPublications;

      const { error: runUpdateErr } = await admin
        .from("assistant_action_runs")
        .update({
          status: "applied",
          applied_at: new Date().toISOString(),
          after_snapshot: afterSnapshot,
          executed_actions: executedActions,
        })
        .eq("id", runId)
        .eq("episode_id", episodeId)
        .eq("user_id", user.id);
      if (runUpdateErr) return json({ error: runUpdateErr.message }, 500, cors);

      return json({
        run_id: runId,
        status: "applied",
        updated_fields: Object.keys(patch),
        created_assets: createdAssets.length,
        created_tasks: createdTasks.length,
        created_publications: createdPublications.length,
        updated_assets: updatedAssets.length,
        updated_tasks: updatedTasks.length,
        updated_publications: updatedPublications.length,
      }, 200, cors);
    }

    if (mode === "rollback") {
      if (!runId) return json({ error: "run_id is required" }, 400, cors);

      const { data: run, error: runErr } = await admin
        .from("assistant_action_runs")
        .select("id, status, before_snapshot, executed_actions")
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

      if (Object.keys(rollbackPatch).length > 0) {
        const { error: epUpdateErr } = await admin
          .from("episodes")
          .update(rollbackPatch)
          .eq("id", episodeId)
          .eq("user_id", user.id);
        if (epUpdateErr) return json({ error: epUpdateErr.message }, 500, cors);
      }

      const executed = (run.executed_actions ?? {}) as Record<string, unknown>;
      const createdAssetIds = Array.isArray(executed.created_assets) ? executed.created_assets.map((v) => String(v)) : [];
      const createdTaskIds = Array.isArray(executed.created_tasks) ? executed.created_tasks.map((v) => String(v)) : [];
      const createdPublicationIds = Array.isArray(executed.created_publications) ? executed.created_publications.map((v) => String(v)) : [];

      if (createdAssetIds.length > 0) {
        const { error } = await admin.from("asset_candidates").delete().eq("user_id", user.id).eq("episode_id", episodeId).in("id", createdAssetIds);
        if (error) return json({ error: error.message }, 500, cors);
      }
      if (createdTaskIds.length > 0) {
        const { error } = await admin.from("tasks").delete().eq("user_id", user.id).in("id", createdTaskIds);
        if (error) return json({ error: error.message }, 500, cors);
      }
      if (createdPublicationIds.length > 0) {
        const { error } = await admin.from("publication_queue").delete().eq("user_id", user.id).eq("episode_id", episodeId).in("id", createdPublicationIds);
        if (error) return json({ error: error.message }, 500, cors);
      }

      const updatedAssetsBefore = Array.isArray(executed.updated_assets_before) ? executed.updated_assets_before as Array<Record<string, unknown>> : [];
      for (const row of updatedAssetsBefore) {
        const id = String(row.id ?? "");
        const beforeRow = (row.before ?? {}) as Record<string, unknown>;
        if (!id) continue;
        const { error } = await admin.from("asset_candidates").update(beforeRow).eq("id", id).eq("user_id", user.id).eq("episode_id", episodeId);
        if (error) return json({ error: error.message }, 500, cors);
      }

      const updatedTasksBefore = Array.isArray(executed.updated_tasks_before) ? executed.updated_tasks_before as Array<Record<string, unknown>> : [];
      for (const row of updatedTasksBefore) {
        const id = String(row.id ?? "");
        const beforeRow = (row.before ?? {}) as Record<string, unknown>;
        if (!id) continue;
        const { error } = await admin.from("tasks").update(beforeRow).eq("id", id).eq("user_id", user.id);
        if (error) return json({ error: error.message }, 500, cors);
      }

      const updatedPublicationsBefore = Array.isArray(executed.updated_publications_before) ? executed.updated_publications_before as Array<Record<string, unknown>> : [];
      for (const row of updatedPublicationsBefore) {
        const id = String(row.id ?? "");
        const beforeRow = (row.before ?? {}) as Record<string, unknown>;
        if (!id) continue;
        const { error } = await admin.from("publication_queue").update(beforeRow).eq("id", id).eq("user_id", user.id).eq("episode_id", episodeId);
        if (error) return json({ error: error.message }, 500, cors);
      }

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
Entidades permitidas: episode, asset_candidates, tasks, publication_queue
Acciones permitidas: update_field, create_candidate, create_task, create_publication
Acciones update existentes: update_candidate, update_task, update_publication (requieren payload.id)
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
      "entity_type": "episode | asset_candidates | tasks | publication_queue",
      "action": "update_field | create_candidate | update_candidate | create_task | update_task | create_publication | update_publication",
      "field": "si action=update_field, uno de los permitidos",
      "value": "si action=update_field, nuevo valor",
      "payload": {"si action=create_* o update_*, datos de la entidad; para update_* incluye id"},
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
      const entityType = String(op.entity_type ?? "episode") as ProposedChange["entity_type"];
      const action = String(op.action ?? "update_field") as ProposedChange["action"];
      const field = String(op.field ?? "").trim();
      const payload = (op.payload ?? null) as Record<string, unknown> | null;
      const reason = String(op.reason ?? "");

      if (!ALLOWED_ENTITY_TYPES.includes(entityType)) continue;
      if (!ALLOWED_ACTIONS.includes(action)) continue;

      if (entityType === "episode" && action === "update_field") {
        if (!ALLOWED_FIELDS.includes(field as (typeof ALLOWED_FIELDS)[number])) continue;

        const before = beforeSnapshot[field];
        const after = op.value ?? null;

        if (String(before ?? "").trim() === String(after ?? "").trim()) {
          changes.push({ change_id: crypto.randomUUID(), entity_type: entityType, action, field, before, after, status: "no_change", reason: reason || "Sin cambios efectivos" });
          continue;
        }

        const isCritical = CRITICAL_FIELDS.has(field);
        const hasBefore = String(before ?? "").trim().length > 0;
        if (isCritical && hasBefore) {
          changes.push({ change_id: crypto.randomUUID(), entity_type: entityType, action, field, before, after, status: "conflict", reason: reason || "Campo crítico ya tiene valor" });
          conflicts.push(`${field}: el campo ya tiene contenido y requiere revisión manual`);
          continue;
        }

        changes.push({ change_id: crypto.randomUUID(), entity_type: entityType, action, field, before, after, status: "update", reason });
        continue;
      }

      if (entityType === "asset_candidates" && action === "create_candidate") {
        const assetPayload = payload ?? {
          title: String(op.value ?? "").trim(),
          body_text: String(op.value ?? "").trim(),
          asset_type: "quote",
          platform: "instagram_feed",
        };

        const candidateTitle = String(assetPayload.title ?? "").trim();
        const candidateBody = String(assetPayload.body_text ?? "").trim();
        if (!candidateTitle && !candidateBody) {
          changes.push({
            entity_type: entityType,
            action,
            field: "asset_candidate",
            before: null,
            after: assetPayload,
            status: "no_change",
            reason: "Sin contenido suficiente para crear asset",
            payload: assetPayload,
            change_id: crypto.randomUUID(),
          });
          continue;
        }

        const { data: existing } = await admin
          .from("asset_candidates")
          .select("id")
          .eq("user_id", user.id)
          .eq("episode_id", episodeId)
          .eq("asset_type", String(assetPayload.asset_type ?? "quote"))
          .eq("title", candidateTitle || null)
          .eq("body_text", candidateBody || null)
          .limit(1);

        if ((existing ?? []).length > 0) {
          changes.push({
            entity_type: entityType,
            action,
            field: "asset_candidate",
            before: "ya existe uno igual",
            after: assetPayload,
            status: "conflict",
            reason: "Posible duplicado",
            payload: assetPayload,
            change_id: crypto.randomUUID(),
          });
          conflicts.push("asset_candidate duplicado detectado");
          continue;
        }

        changes.push({
          entity_type: entityType,
          action,
          field: "asset_candidate",
          before: null,
          after: assetPayload,
          status: "update",
          reason: reason || "Crear nuevo asset candidate",
          payload: assetPayload,
          change_id: crypto.randomUUID(),
        });
        continue;
      }

      if (entityType === "asset_candidates" && action === "update_candidate") {
        const assetPayload = payload ?? {};
        const candidateId = String(assetPayload.id ?? "").trim();
        if (!candidateId) {
          changes.push({
            change_id: crypto.randomUUID(),
            entity_type: entityType,
            action,
            field: "asset_candidate",
            before: null,
            after: assetPayload,
            status: "conflict",
            reason: "Falta payload.id para actualizar asset",
            payload: assetPayload,
          });
          conflicts.push("update_candidate sin id");
          continue;
        }

        const { data: existing, error: existingErr } = await admin
          .from("asset_candidates")
          .select("id, title, body_text, status, platform, asset_type")
          .eq("id", candidateId)
          .eq("user_id", user.id)
          .eq("episode_id", episodeId)
          .single();

        if (existingErr || !existing) {
          changes.push({
            change_id: crypto.randomUUID(),
            entity_type: entityType,
            action,
            field: "asset_candidate",
            before: null,
            after: assetPayload,
            status: "conflict",
            reason: "Asset candidate no encontrado",
            payload: assetPayload,
          });
          conflicts.push("asset candidate no encontrado para update");
          continue;
        }

        const updatePayload = {
          id: candidateId,
          title: assetPayload.title ?? existing.title,
          body_text: assetPayload.body_text ?? existing.body_text,
          status: assetPayload.status ?? existing.status,
          platform: assetPayload.platform ?? existing.platform,
          asset_type: assetPayload.asset_type ?? existing.asset_type,
        };

        changes.push({
          change_id: crypto.randomUUID(),
          entity_type: entityType,
          action,
          field: "asset_candidate",
          before: existing,
          after: updatePayload,
          status: "update",
          reason: reason || "Actualizar asset candidate existente",
          payload: updatePayload,
        });
        continue;
      }

      if (entityType === "tasks" && action === "create_task") {
        const taskPayload = payload ?? {
          title: String(op.value ?? "").trim(),
          description: null,
          priority: "medium",
          status: "todo",
          category: "assistant",
        };

        const taskTitle = String(taskPayload.title ?? "").trim();
        if (!taskTitle) {
          changes.push({
            entity_type: entityType,
            action,
            field: "task",
            before: null,
            after: taskPayload,
            status: "no_change",
            reason: "Task sin título",
            payload: taskPayload,
            change_id: crypto.randomUUID(),
          });
          continue;
        }

        const { data: existing } = await admin
          .from("tasks")
          .select("id")
          .eq("user_id", user.id)
          .eq("title", taskTitle)
          .in("status", ["todo", "in_progress", "pending"])
          .limit(1);

        if ((existing ?? []).length > 0) {
          changes.push({
            entity_type: entityType,
            action,
            field: "task",
            before: "ya existe una tarea activa con ese título",
            after: taskPayload,
            status: "conflict",
            reason: "Posible duplicado",
            payload: taskPayload,
            change_id: crypto.randomUUID(),
          });
          conflicts.push("task duplicada detectada");
          continue;
        }

        changes.push({
          entity_type: entityType,
          action,
          field: "task",
          before: null,
          after: taskPayload,
          status: "update",
          reason: reason || "Crear nueva tarea",
          payload: taskPayload,
          change_id: crypto.randomUUID(),
        });
        continue;
      }

      if (entityType === "tasks" && action === "update_task") {
        const taskPayload = payload ?? {};
        const taskId = String(taskPayload.id ?? "").trim();
        if (!taskId) {
          changes.push({
            change_id: crypto.randomUUID(),
            entity_type: entityType,
            action,
            field: "task",
            before: null,
            after: taskPayload,
            status: "conflict",
            reason: "Falta payload.id para actualizar task",
            payload: taskPayload,
          });
          conflicts.push("update_task sin id");
          continue;
        }

        const { data: existing, error: existingErr } = await admin
          .from("tasks")
          .select("id, title, description, status, priority, category, due_date")
          .eq("id", taskId)
          .eq("user_id", user.id)
          .single();

        if (existingErr || !existing) {
          changes.push({
            change_id: crypto.randomUUID(),
            entity_type: entityType,
            action,
            field: "task",
            before: null,
            after: taskPayload,
            status: "conflict",
            reason: "Task no encontrada",
            payload: taskPayload,
          });
          conflicts.push("task no encontrada para update");
          continue;
        }

        const updatePayload = {
          id: taskId,
          title: taskPayload.title ?? existing.title,
          description: taskPayload.description ?? existing.description,
          status: taskPayload.status ?? existing.status,
          priority: taskPayload.priority ?? existing.priority,
          category: taskPayload.category ?? existing.category,
          due_date: taskPayload.due_date ?? existing.due_date,
        };

        changes.push({
          change_id: crypto.randomUUID(),
          entity_type: entityType,
          action,
          field: "task",
          before: existing,
          after: updatePayload,
          status: "update",
          reason: reason || "Actualizar task existente",
          payload: updatePayload,
        });
        continue;
      }

      if (entityType === "publication_queue" && action === "create_publication") {
        const publicationPayload = payload ?? {
          platform: String(op.value ?? "instagram").trim() || "instagram",
          status: "draft",
          notes: null,
          scheduled_at: null,
        };

        const platform = String(publicationPayload.platform ?? "instagram").trim() || "instagram";

        const { data: existing } = await admin
          .from("publication_queue")
          .select("id")
          .eq("user_id", user.id)
          .eq("episode_id", episodeId)
          .eq("platform", platform)
          .in("status", ["draft", "scheduled"])
          .limit(1);

        if ((existing ?? []).length > 0) {
          changes.push({
            entity_type: entityType,
            action,
            field: "publication_queue",
            before: "ya existe una cola activa para esa plataforma",
            after: publicationPayload,
            status: "conflict",
            reason: "Posible duplicado",
            payload: publicationPayload,
            change_id: crypto.randomUUID(),
          });
          conflicts.push("publication_queue duplicada detectada");
          continue;
        }

        changes.push({
          entity_type: entityType,
          action,
          field: "publication_queue",
          before: null,
          after: publicationPayload,
          status: "update",
          reason: reason || "Crear nueva publicación en cola",
          payload: publicationPayload,
          change_id: crypto.randomUUID(),
        });
        continue;
      }

      if (entityType === "publication_queue" && action === "update_publication") {
        const publicationPayload = payload ?? {};
        const publicationId = String(publicationPayload.id ?? "").trim();
        if (!publicationId) {
          changes.push({
            change_id: crypto.randomUUID(),
            entity_type: entityType,
            action,
            field: "publication_queue",
            before: null,
            after: publicationPayload,
            status: "conflict",
            reason: "Falta payload.id para actualizar publication_queue",
            payload: publicationPayload,
          });
          conflicts.push("update_publication sin id");
          continue;
        }

        const { data: existing, error: existingErr } = await admin
          .from("publication_queue")
          .select("id, platform, status, notes, scheduled_at, checklist")
          .eq("id", publicationId)
          .eq("user_id", user.id)
          .eq("episode_id", episodeId)
          .single();

        if (existingErr || !existing) {
          changes.push({
            change_id: crypto.randomUUID(),
            entity_type: entityType,
            action,
            field: "publication_queue",
            before: null,
            after: publicationPayload,
            status: "conflict",
            reason: "Publication queue no encontrada",
            payload: publicationPayload,
          });
          conflicts.push("publication_queue no encontrada para update");
          continue;
        }

        const updatePayload = {
          id: publicationId,
          platform: publicationPayload.platform ?? existing.platform,
          status: publicationPayload.status ?? existing.status,
          notes: publicationPayload.notes ?? existing.notes,
          scheduled_at: publicationPayload.scheduled_at ?? existing.scheduled_at,
          checklist: publicationPayload.checklist ?? existing.checklist,
        };

        changes.push({
          change_id: crypto.randomUUID(),
          entity_type: entityType,
          action,
          field: "publication_queue",
          before: existing,
          after: updatePayload,
          status: "update",
          reason: reason || "Actualizar item de publication_queue",
          payload: updatePayload,
        });
        continue;
      }
    }

    if (changes.length === 0) {
      warnings.push("La instrucción no produjo cambios válidos sobre campos permitidos.");
    }

    const risk = estimateRisk(changes, warnings, conflicts);
    const impact = {
      will_modify: changes.filter((c) => c.status === "update").map((c) => `${c.entity_type}.${c.field}`),
      will_preserve: ALLOWED_FIELDS.filter((f) => !changes.some((c) => c.entity_type === "episode" && c.field === f && c.status === "update")),
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
