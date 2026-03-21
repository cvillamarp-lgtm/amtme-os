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
  content: Record<string, unknown>;
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
  url: string;
  episode_id?: string;
}

export interface ExtractContentResponse {
  title: string;
  content: string;
  word_count: number;
  raw_input_id: string | null;
}

// ── generate-episode-fields ───────────────────────────────────────────────────

export interface GenerateEpisodeFieldsRequest {
  episode_id: string;
  cleaned_text?: string;
  semantic_json?: Record<string, unknown>;
}

export interface GenerateEpisodeFieldsResponse {
  updated_fields: Record<string, unknown>;
}

// ── assistant-constructor ─────────────────────────────────────────────────────

export interface AssistantConstructorRequest {
  systemPrompt: string;
  userPrompt: string;
  context?: Record<string, unknown>;
  maxTokens?: number;
}

export interface AssistantConstructorResponse {
  text: string;
  usage?: Record<string, number>;
}

// ── copilot-dispatch ──────────────────────────────────────────────────────────

export interface CopilotDispatchRequest {
  action: string;
  payload?: Record<string, unknown>;
}

export interface CopilotDispatchResponse {
  result: unknown;
  action: string;
}

// ── fetch-instagram-insights ──────────────────────────────────────────────────

export interface FetchInstagramInsightsRequest {
  account_id: string;
  period?: "day" | "week" | "month";
}

export interface FetchInstagramInsightsResponse {
  insights: Record<string, unknown>[];
  fetched_at: string;
}

// ── oauth-init ────────────────────────────────────────────────────────────────

export interface OAuthInitRequest {
  provider: string;
  redirect_uri?: string;
}

export interface OAuthInitResponse {
  auth_url: string;
}

// ── sync-platform-account ─────────────────────────────────────────────────────

export interface SyncPlatformAccountRequest {
  platform_account_id: string;
}

export interface SyncPlatformAccountResponse {
  synced: boolean;
  updated_at: string;
}

// ── queue-audio-master ────────────────────────────────────────────────────────

export interface QueueAudioMasterRequest {
  episode_id: string;
  audio_url: string;
}

export interface QueueAudioMasterResponse {
  job_id: string;
  status: "queued" | "processing";
}

// ── queue-audio-transcript ────────────────────────────────────────────────────

export interface QueueAudioTranscriptRequest {
  episode_id: string;
  audio_url: string;
}

export interface QueueAudioTranscriptResponse {
  job_id: string;
  status: "queued" | "processing";
}

// ── queue-audio-clip-export ───────────────────────────────────────────────────

export interface QueueAudioClipExportRequest {
  episode_id: string;
  clip_start: number;
  clip_end: number;
  audio_url: string;
}

export interface QueueAudioClipExportResponse {
  job_id: string;
  status: "queued" | "processing";
}
