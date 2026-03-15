/**
 * Block States System — AMTME Episode Workspace
 * Manages per-field status tracking and dependency propagation.
 */

// ─── Types ───────────────────────────────────────────────────────────

export type BlockStatus = "empty" | "generated" | "edited" | "approved" | "stale" | "blocked";

export interface BlockState {
  status: BlockStatus;
  updated_at: string;
  source_type: "ai_generated" | "ai_regenerated" | "edited" | "approved" | "initial";
  stale_reason?: string; // e.g. "idea_principal cambió"
}

export type BlockStatesMap = Record<string, BlockState>;

export interface VersionEntry {
  value: string;
  timestamp: string;
  source_type: string;
}

export type VersionHistoryMap = Record<string, VersionEntry[]>;

// ─── Constants ───────────────────────────────────────────────────────

/** The 8 AI-generated base fields */
export const BASE_FIELDS = [
  "working_title",
  "theme",
  "core_thesis",
  "summary",
  "hook",
  "cta",
  "quote",
  "descripcion_spotify",
] as const;

export type BaseField = (typeof BASE_FIELDS)[number];

/** All trackable fields including future ones */
export const ALL_TRACKABLE_FIELDS = [
  "idea_principal",
  ...BASE_FIELDS,
  "script_base",
  "script_generated",
] as const;

/**
 * Dependency map: when a source field changes, all its dependents become stale.
 * Only includes fields currently implemented (Prompt 2 scope).
 */
export const DEPENDENCY_MAP: Record<string, string[]> = {
  idea_principal: [
    "working_title", "theme", "core_thesis", "summary",
    "hook", "cta", "quote", "descripcion_spotify",
    "script_base", "script_generated",
  ],
  theme: ["core_thesis", "summary", "hook", "script_base", "script_generated"],
  core_thesis: ["summary", "hook", "script_base", "script_generated"],
  summary: ["hook", "script_base", "script_generated"],
  hook: [],
  cta: [],
  template_id: ["script_base", "script_generated"],
  visual_preset_id: [],
};

/** Human-readable labels for fields */
export const FIELD_LABELS: Record<string, string> = {
  idea_principal: "Idea principal",
  working_title: "Título de trabajo",
  theme: "Tema",
  core_thesis: "Tesis central",
  summary: "Resumen",
  hook: "Hook",
  cta: "CTA",
  quote: "Quote",
  descripcion_spotify: "Descripción Spotify",
  script_base: "Guión base",
  script_generated: "Guión generado",
};

/** Regeneration order groups */
export const REGEN_ORDER = [
  { group: "datos_base", fields: [...BASE_FIELDS] },
  { group: "guion", fields: ["script_base", "script_generated"] },
] as const;

// ─── Status Visual Config ────────────────────────────────────────────

export interface StatusVisual {
  label: string;
  color: string;       // Tailwind text color class
  bgColor: string;     // Tailwind bg class
  icon: string;        // emoji or icon key
  animate?: boolean;
}

export const STATUS_VISUALS: Record<BlockStatus, StatusVisual> = {
  empty:     { label: "Vacío",        color: "text-muted-foreground", bgColor: "bg-muted",        icon: "" },
  generated: { label: "Generado",     color: "text-primary",         bgColor: "bg-primary/10",    icon: "sparkles" },
  edited:    { label: "Editado",      color: "text-amber-500",       bgColor: "bg-amber-500/10",  icon: "pencil" },
  approved:  { label: "Aprobado",     color: "text-emerald-500",     bgColor: "bg-emerald-500/10",icon: "check" },
  stale:     { label: "Desactualizado", color: "text-orange-500",    bgColor: "bg-orange-500/10", icon: "alert-triangle", animate: true },
  blocked:   { label: "Bloqueado",    color: "text-destructive",     bgColor: "bg-destructive/10",icon: "lock" },
};

// ─── Functions ───────────────────────────────────────────────────────

/**
 * Determine the status of a field based on its block_states entry and value.
 */
export function getBlockStatus(
  fieldName: string,
  blockStates: BlockStatesMap,
  fieldValue: any
): BlockStatus {
  const state = blockStates[fieldName];
  if (state?.status) return state.status;
  // Fallback: if no state tracked, infer from value
  if (!fieldValue && fieldValue !== 0 && fieldValue !== false) return "empty";
  return "generated"; // assume generated if value exists but no state tracked
}

/**
 * When a source field changes, compute which dependent fields should become stale.
 * Respects the protection rule: approved blocks get a notification instead of stale.
 * Returns { staleFields, approvedWarnings }.
 */
export function computeStaleBlocks(
  changedField: string,
  currentStates: BlockStatesMap
): { staleFields: string[]; approvedWarnings: string[] } {
  const dependents = DEPENDENCY_MAP[changedField] || [];
  const staleFields: string[] = [];
  const approvedWarnings: string[] = [];

  for (const dep of dependents) {
    const current = currentStates[dep];
    if (current?.status === "approved") {
      approvedWarnings.push(dep);
    } else if (current?.status !== "empty") {
      staleFields.push(dep);
    }
  }

  return { staleFields, approvedWarnings };
}

/**
 * Apply stale propagation to block states after a field changes.
 * Returns a new BlockStatesMap with stale statuses applied.
 */
export function applyStaleToStates(
  changedField: string,
  currentStates: BlockStatesMap
): { newStates: BlockStatesMap; approvedWarnings: string[] } {
  const { staleFields, approvedWarnings } = computeStaleBlocks(changedField, currentStates);
  const now = new Date().toISOString();

  const newStates = { ...currentStates };

  // Update the changed field itself to "edited"
  newStates[changedField] = {
    status: "edited",
    updated_at: now,
    source_type: "edited",
  };

  // Mark dependents as stale
  for (const field of staleFields) {
    newStates[field] = {
      ...newStates[field],
      status: "stale",
      updated_at: now,
      source_type: newStates[field]?.source_type || "initial",
      stale_reason: `${FIELD_LABELS[changedField] || changedField} cambió`,
    };
  }

  return { newStates, approvedWarnings };
}

/**
 * Initialize block states for a newly created episode with AI-generated fields.
 */
export function initBlockStatesFromAI(): BlockStatesMap {
  const now = new Date().toISOString();
  const states: BlockStatesMap = {};

  for (const field of BASE_FIELDS) {
    states[field] = {
      status: "generated",
      updated_at: now,
      source_type: "ai_generated",
    };
  }

  return states;
}

/**
 * Count stale blocks in a BlockStatesMap.
 */
export function countStaleBlocks(states: BlockStatesMap): number {
  return Object.values(states).filter((s) => s.status === "stale").length;
}

/**
 * Get all stale field names.
 */
export function getStaleFields(states: BlockStatesMap): string[] {
  return Object.entries(states)
    .filter(([, s]) => s.status === "stale")
    .map(([field]) => field);
}

/**
 * Add a version entry to the history before overwriting.
 */
export function addVersionEntry(
  history: VersionHistoryMap,
  fieldName: string,
  currentValue: string,
  sourceType: string
): VersionHistoryMap {
  const entries = history[fieldName] || [];
  const newEntry: VersionEntry = {
    value: currentValue,
    timestamp: new Date().toISOString(),
    source_type: sourceType,
  };
  return {
    ...history,
    [fieldName]: [...entries, newEntry].slice(-10), // keep last 10 versions
  };
}
