import { z } from "zod";

// ─── Auth ──────────────────────────────────────────────────────────────────
export const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
});
export type LoginInput = z.infer<typeof loginSchema>;

// ─── Knowledge Base ────────────────────────────────────────────────────────
export const KNOWLEDGE_DOC_TYPES = ["sop", "prompt", "reference", "insight"] as const;
export type KnowledgeDocType = (typeof KNOWLEDGE_DOC_TYPES)[number];

export const knowledgeDocSchema = z.object({
  title: z.string().min(1, "El título es obligatorio").max(200, "Máximo 200 caracteres"),
  doc_type: z.enum(KNOWLEDGE_DOC_TYPES, { message: "Tipo de documento inválido" }),
  body: z.string().max(20_000, "Máximo 20,000 caracteres").optional(),
  tags: z.string().optional(), // comma-separated, parsed on submit
});
export type KnowledgeDocInput = z.infer<typeof knowledgeDocSchema>;

// ─── Audio Take (title + episode) ─────────────────────────────────────────
export const audioTakeTitleSchema = z.object({
  title: z
    .string()
    .min(1, "Escribe un nombre para la toma")
    .max(100, "Máximo 100 caracteres")
    .regex(/^[a-zA-Z0-9\s\-_áéíóúÁÉÍÓÚñÑüÜ,.!?]+$/, "Caracteres no permitidos en el nombre"),
});
export type AudioTakeTitleInput = z.infer<typeof audioTakeTitleSchema>;

// ─── Episode (basic) ───────────────────────────────────────────────────────
export const episodeBaseSchema = z.object({
  title: z.string().min(1, "El título es obligatorio").max(200),
  description: z.string().max(5000).optional(),
});
export type EpisodeBaseInput = z.infer<typeof episodeBaseSchema>;

// ─── Metric Snapshot ───────────────────────────────────────────────────────
export const metricSnapshotSchema = z.object({
  platform: z.string().min(1, "Selecciona una plataforma"),
  metric_type: z.string().min(1, "Selecciona un tipo de métrica"),
  value: z.coerce
    .number({ invalid_type_error: "Debe ser un número" })
    .nonnegative("El valor debe ser ≥ 0"),
  snapshot_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido (YYYY-MM-DD)"),
});
export type MetricSnapshotInput = z.infer<typeof metricSnapshotSchema>;
