import { z } from "zod";

// ─── Episode Zod Schema ───────────────────────────────────────────────────────

export const episodeSchema = z.object({
  number: z.string().min(1, "Número requerido"),
  working_title: z.string().min(1, "Título de trabajo requerido"),
  final_title: z.string().nullable().optional(),
  titulo_original: z.string().nullable().optional(),
  theme: z.string().min(1, "Tema requerido"),
  core_thesis: z.string().nullable().optional(),
  summary: z.string().min(10, "Resumen mínimo 10 caracteres"),
  descripcion_spotify: z.string().min(10, "Descripción Spotify requerida"),
  link_spotify: z.string().url("URL inválida").nullable().optional().or(z.literal("")),
  hook: z.string().nullable().optional(),
  cta: z.string().min(1, "CTA requerido"),
  script_base: z.string().nullable().optional(),
  script_generated: z.string().nullable().optional(),
  nota_trazabilidad: z.string().min(1, "Nota de trazabilidad requerida"),
  conflicto_detectado: z.boolean().default(false),
  conflicto_nota: z.string().nullable().optional(),
  nivel_completitud: z.enum(["A", "B", "C", "D"]).default("D"),
});

// ─── Production blocking rules ────────────────────────────────────────────────

export interface ValidationResult {
  field: string;
  label: string;
  status: "ok" | "missing" | "warning";
  message?: string;
}

export interface AuditResult {
  validations: ValidationResult[];
  healthScore: number;
  canProduce: boolean;
  canPublish: boolean;
  blockers: string[];
  warnings: string[];
}

const PRODUCTION_REQUIRED_FIELDS: { field: string; label: string }[] = [
  { field: "number", label: "Número de episodio" },
  { field: "working_title", label: "Título de trabajo" },
  { field: "idea_principal", label: "Idea principal" },
  { field: "theme", label: "Tema" },
  { field: "summary", label: "Resumen" },
  { field: "cta", label: "CTA" },
];

const PUBLISH_REQUIRED_FIELDS: { field: string; label: string }[] = [
  ...PRODUCTION_REQUIRED_FIELDS,
  { field: "descripcion_spotify", label: "Descripción Spotify" },
  { field: "nota_trazabilidad", label: "Nota de trazabilidad" },
];

export function auditEpisode(episode: Record<string, any>): AuditResult {
  const validations: ValidationResult[] = [];
  const blockers: string[] = [];
  const warnings: string[] = [];

  // Check all fields
  const allFields = [
    { field: "number", label: "Número" },
    { field: "working_title", label: "Título de trabajo" },
    { field: "final_title", label: "Título final" },
    { field: "idea_principal", label: "Idea principal" },
    { field: "theme", label: "Tema" },
    { field: "core_thesis", label: "Tesis central" },
    { field: "summary", label: "Resumen" },
    { field: "descripcion_spotify", label: "Descripción Spotify" },
    { field: "hook", label: "Hook" },
    { field: "cta", label: "CTA" },
    { field: "script_base", label: "Guión base" },
    { field: "script_generated", label: "Guión generado" },
    { field: "nota_trazabilidad", label: "Trazabilidad" },
    { field: "link_spotify", label: "Link Spotify" },
    { field: "release_date", label: "Fecha de lanzamiento" },
  ];

  let filledCount = 0;
  for (const { field, label } of allFields) {
    const value = episode[field];
    const isEmpty = value === null || value === undefined || value === "";
    if (!isEmpty) filledCount++;
    validations.push({
      field,
      label,
      status: isEmpty ? "missing" : "ok",
      message: isEmpty ? `${label} está vacío` : undefined,
    });
  }

  // Production blockers
  const canProduce = PRODUCTION_REQUIRED_FIELDS.every(({ field }) => {
    const v = episode[field];
    return v !== null && v !== undefined && v !== "";
  });

  if (!canProduce) {
    const missing = PRODUCTION_REQUIRED_FIELDS
      .filter(({ field }) => !episode[field])
      .map(({ label }) => label);
    blockers.push(`Campos faltantes para producción: ${missing.join(", ")}`);
  }

  // Script check
  const hasScript = !!(episode.script_base || episode.script_generated);
  if (!hasScript) {
    blockers.push("Se necesita al menos un guión (base o generado)");
  }

  // Conflict check
  if (episode.conflicto_detectado && !episode.conflicto_nota) {
    warnings.push("Conflicto detectado sin nota de resolución");
  }

  // Publish blockers
  const canPublish = canProduce && hasScript &&
    PUBLISH_REQUIRED_FIELDS.every(({ field }) => {
      const v = episode[field];
      return v !== null && v !== undefined && v !== "";
    }) &&
    !(episode.conflicto_detectado && !episode.conflicto_nota);

  if (!canPublish && canProduce) {
    const missingPub = PUBLISH_REQUIRED_FIELDS
      .filter(({ field }) => !episode[field])
      .map(({ label }) => label);
    if (missingPub.length) {
      blockers.push(`Campos faltantes para publicación: ${missingPub.join(", ")}`);
    }
  }

  // Health score: 0-100
  const healthScore = Math.round((filledCount / allFields.length) * 100);

  return {
    validations,
    healthScore,
    canProduce: canProduce && hasScript,
    canPublish,
    blockers,
    warnings,
  };
}

// ─── Completeness percentage ──────────────────────────────────────────────────

export function getCompletenessLevel(score: number): { label: string; nivel: string; color: string } {
  if (score >= 90) return { label: "Completo", nivel: "A", color: "text-[hsl(var(--chart-2))]" };
  if (score >= 70) return { label: "Casi listo", nivel: "B", color: "text-[hsl(var(--chart-4))]" };
  if (score >= 40) return { label: "En progreso", nivel: "C", color: "text-[hsl(var(--chart-3))]" };
  return { label: "Idea", nivel: "D", color: "text-muted-foreground" };
}
