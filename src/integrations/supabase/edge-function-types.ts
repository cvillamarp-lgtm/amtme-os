// ============================================================
// Edge Function — Typed Contracts (request / response / error)
// ============================================================
// All types are aligned with the Supabase Edge Function handlers.
// The frontend MUST NOT use `any` when consuming edge functions.
// ============================================================

/** Normalized error envelope returned by every edge function on failure. */
export interface EdgeFunctionApiError {
  code: string;
  message: string;
  details?: unknown;
}

// ── clean-text ────────────────────────────────────────────────────────────────

export interface CleanTextRequest {
  raw_text: string;
  raw_input_id?: string;
}

export interface CleanTextResponse {
  cleaned_text: string;
  cleaned_word_count: number;
  raw_word_count: number;
  reduction_percentage: number;
  cleaned_text_id: string | null;
}

// ── semantic-map ──────────────────────────────────────────────────────────────

export interface SemanticMapRequest {
  cleaned_text: string;
  episode_id?: string;
  raw_input_id?: string;
  cleaned_text_id?: string;
}

export interface SemanticMapResponse {
  semantic_map_id: string | null;
  semantic_json: Record<string, unknown>;
  suggested_palette_id: number;
  suggested_host_image: "REF_1" | "REF_2";
  word_counts_json: Record<string, number>;
  range_warnings: string[];
}

// ── generate-outputs ──────────────────────────────────────────────────────────

export interface GenerateOutputItem {
  outputNumber: number;
  content?: Record<string, unknown>;
  error?: string;
}

export interface GenerateOutputsRequest {
  semantic_map_id: string;
  semantic_json: Record<string, unknown>;
}

export interface GenerateOutputsResponse {
  outputs: GenerateOutputItem[];
  savedAssets: Array<{ outputNumber: number; assetId: string }>;
  message: string;
}

// ── generate-image ────────────────────────────────────────────────────────────

export interface GenerateImageRequest {
  prompt: string;
  mode?: "generate" | "edit";
  imageUrl?: string;
  episodeId?: string;
  referenceImages?: string[];
  hostReference?: "imagen01" | "imagen02";
  includeHost?: boolean;
  rawPrompt?: boolean;
  pieceId?: number;
  pieceName?: string;
}

export interface GenerateImageResponse {
  imageUrl: string;
  text: string;
  stored: boolean;
}

// ── claude-call ───────────────────────────────────────────────────────────────

export interface ClaudeCallRequest {
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
}

export interface ClaudeCallResponse {
  text: string;
}

// ── extract-content ───────────────────────────────────────────────────────────

export interface ExtractContentRequest {
  script?: string;
  title?: string;
  theme?: string;
}

export interface ExtractContentResponse {
  thesis: string;
  keyPhrases: string[];
  pieceCopy: Record<string, string[]>;
}

// ── generate-episode-fields ───────────────────────────────────────────────────

export interface GenerateEpisodeFieldsRequest {
  mode?: "regenerate_field" | "generate_options";
  field_name?: string;
  idea_principal: string;
  current_fields?: Record<string, string>;
  episode_number?: string;
  conflicto_central?: string;
  intencion_del_episodio?: string;
  tono?: string;
  restricciones?: string;
  count?: number;
}

export type AICallStatus = "success" | "recovered" | "degraded" | "failed";
export type AICallErrorCode =
  | "USER_AUTH_EXPIRED"
  | "USER_AUTH_INVALID"
  | "MISSING_PROVIDER_SECRET"
  | "INVALID_PROVIDER_SECRET"
  | "PROVIDER_401"
  | "PROVIDER_429"
  | "PROVIDER_5XX"
  | "NETWORK_TIMEOUT"
  | "BAD_REQUEST_PAYLOAD"
  | "UNKNOWN_UPSTREAM_ERROR";

export interface GenerateEpisodeFieldsResponse {
  status: AICallStatus;
  error_code?: AICallErrorCode;
  retryable: boolean;
  provider_used: string | null;
  fallback_used: boolean;
  message: string;
  request_id?: string;
  value?: string;
  options?: Array<{ value: string; rationale?: string }>;
  fields?: Record<string, string>;
  metadata?: Record<string, unknown>;
}

// ── assistant-constructor ─────────────────────────────────────────────────────

export type AssistantConstructorMode = "plan" | "apply" | "cancel" | "history" | "rollback";

export interface AssistantConstructorRequest {
  episode_id: string;
  mode: AssistantConstructorMode;
  run_id?: string;
  instruction?: string;
}

export interface AssistantConstructorResponse {
  mode: AssistantConstructorMode;
  run_id?: string;
  plan?: unknown;
  applied?: boolean;
  rolled_back?: boolean;
  history?: unknown[];
}

// ── copilot-dispatch ──────────────────────────────────────────────────────────

export interface CopilotDispatchRequest {
  episode_id: string;
  command: string;
}

export interface CopilotDispatchResponse {
  plan: {
    intent: string;
    description: string;
    fields_to_update: string[];
  };
  diff: Record<string, { before: unknown; after: unknown }>;
  extra: Record<string, unknown>;
  audit_id: string | null;
}

// ── fetch-instagram-insights ──────────────────────────────────────────────────

/** No request body required — the function reads the connected account from the DB using the JWT. */
export type FetchInstagramInsightsRequest = Record<string, never>;

export interface FetchInstagramInsightsResponse {
  success: boolean;
  days_fetched: number;
  posts_fetched: number;
  followers: number;
  username: string;
  avg_reach: number;
  avg_engagement: number;
  synced_at: string;
}

// ── oauth-init ────────────────────────────────────────────────────────────────

export interface OAuthInitRequest {
  platform: "instagram" | "youtube" | "tiktok";
  user_id: string;
}

export interface OAuthInitResponse {
  url: string;
}

// ── sync-platform-account ─────────────────────────────────────────────────────

export interface SyncPlatformAccountRequest {
  platform: "instagram" | "youtube" | "tiktok";
}

export interface SyncPlatformAccountResponse {
  success: boolean;
  account_name: string;
  account_id: string;
  metadata: Record<string, unknown>;
}

// ── queue-audio-master ────────────────────────────────────────────────────────

export interface QueueAudioMasterRequest {
  audioTakeId: string;
  preset?: string;
}

export interface QueueAudioMasterResponse {
  ok: boolean;
  job: Record<string, unknown>;
}

// ── queue-audio-transcript ────────────────────────────────────────────────────

export interface QueueAudioTranscriptRequest {
  audioTakeId: string;
  language?: string;
}

export interface QueueAudioTranscriptResponse {
  ok: boolean;
  transcript: Record<string, unknown>;
}

// ── queue-audio-clip-export ───────────────────────────────────────────────────

export interface QueueAudioClipExportRequest {
  audioTakeId: string;
  startSeconds: number;
  endSeconds: number;
  label?: string;
}

export interface QueueAudioClipExportResponse {
  ok: boolean;
}
