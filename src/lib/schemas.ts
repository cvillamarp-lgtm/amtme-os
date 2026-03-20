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

// ─── SCRIPT ENGINE ──────────────────────────────────────────────────────────

// Phase 1 − Ingesta
export const episodeIngestaSchema = z.object({
  title: z.string().min(1, "El título es obligatorio").max(200),
  season: z.number().int().positive().optional(),
  episode_number: z.number().int().positive().optional(),
});
export type EpisodeIngestaInput = z.infer<typeof episodeIngestaSchema>;

export const rawInputSchema = z.object({
  episode_id: z.string().uuid("ID de episodio inválido"),
  source_type: z.enum(["guion", "transcripcion", "notas"], {
    message: "Tipo de fuente inválido",
  }),
  raw_text: z
    .string()
    .min(300, "El texto debe tener al menos 300 palabras")
    .max(15000, "Máximo 15,000 palabras"),
});
export type RawInputInput = z.infer<typeof rawInputSchema>;

// Phase 2 − Limpieza
export const cleanedTextApprovalSchema = z.object({
  raw_input_id: z.string().uuid("ID de rawInput inválido"),
  cleaned_text: z.string().min(250, "El texto limpio debe tener al menos 250 palabras"),
  reduction_percentage: z.number().min(0).max(35, "Reducción máxima permitida 35%"),
});
export type CleanedTextApprovalInput = z.infer<typeof cleanedTextApprovalSchema>;

// Phase 3 − Mapa Semántico
export const episodeMetadataSchema = z.object({
  working_title: z.string().optional(),
  central_theme: z.string().optional(),
  central_thesis: z.string().min(15, "Mínimo 15 palabras").max(80, "Máximo 80 palabras"),
  episode_promise: z.string().min(10, "Mínimo 10 palabras").max(50, "Máximo 50 palabras"),
  central_conflict: z.string().min(10, "Mínimo 10 palabras").max(60, "Máximo 60 palabras"),
  main_question: z.string().optional(),
  dominant_emotional_tone: z.string(),
  emotional_intensity_level: z.enum(["bajo", "medio", "alto"]).optional(),
  predominant_narrative_stage: z.string().optional(),
  implicit_cta: z.string().optional(),
  explicit_cta: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  psychological_concepts: z.array(z.string()).optional(),
});
export type EpisodeMetadata = z.infer<typeof episodeMetadataSchema>;

export const semanticMapSchema = z.object({
  episode_id: z.string().uuid("ID de episodio inválido"),
  cleaned_text_id: z.string().uuid("ID de cleaned_text inválido"),
});
export type SemanticMapInput = z.infer<typeof semanticMapSchema>;

// ─── VISUAL OS ──────────────────────────────────────────────────────────────

// Paletas
export const PALETTE_IDS = [1, 2, 3, 4, 5] as const;
export type PaletteId = (typeof PALETTE_IDS)[number];

export const paletteDefinitionSchema = z.object({
  name: z.string().min(1),
  bg: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  accent: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  text_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  surface: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  surface2: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  accent_deep: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});
export type PaletteDefinition = z.infer<typeof paletteDefinitionSchema>;

export const customPaletteSchema = z.object({
  bg: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Color de fondo inválido"),
  accent: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Color de acento inválido"),
  text: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Color de texto inválido"),
});
export type CustomPalette = z.infer<typeof customPaletteSchema>;

// Host images
export const HOST_IMAGE_OPTIONS = ["REF_1", "REF_2", "none"] as const;
export type HostImage = (typeof HOST_IMAGE_OPTIONS)[number];

// Asset versions
export const assetVersionSchema = z.object({
  episode_id: z.string().uuid("ID de episodio inválido"),
  visual_spec_id: z.string().uuid("ID de plantilla inválido"),
  palette_id: z.number().min(1).max(4).optional(),
  custom_palette: customPaletteSchema.optional(),
  host_image: z.enum(HOST_IMAGE_OPTIONS).optional(),
  keyword: z.string().min(1, "Keyword obligatoria"),
  headline: z.string().min(1, "Headline obligatoria"),
  subheadline: z.string().optional(),
  body_copy: z.string().optional(),
  cta: z.string().optional(),
});
export type AssetVersionInput = z.infer<typeof assetVersionSchema>;

// Palette assignment
export const paletteAssignmentSchema = z.object({
  episode_id: z.string().uuid("ID de episodio inválido"),
  palette_id: z.number().min(1).max(4).optional(),
  custom_palette: customPaletteSchema.optional(),
  scope: z.enum(["episode", "piece"]).default("episode"),
});
export type PaletteAssignmentInput = z.infer<typeof paletteAssignmentSchema>;
