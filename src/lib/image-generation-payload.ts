export type HostReference = "imagen01" | "imagen02";

export interface PieceImagePayloadInput {
  prompt: string;
  hostReference: HostReference;
  pieceId?: number;
  episodeId?: string | null;
  includeHost?: boolean;
}

export interface VisualPromptPayloadInput {
  prompt: string;
  hostReference: HostReference;
}

function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([, value]) => value !== undefined && value !== null)) as Partial<T>;
}

export function buildPieceImagePayload(input: PieceImagePayloadInput) {
  return compact({
    prompt: input.prompt,
    hostReference: input.hostReference,
    pieceId: input.pieceId,
    episodeId: input.episodeId,
    includeHost: input.includeHost,
  });
}

export function buildVisualPromptImagePayload(input: VisualPromptPayloadInput) {
  return {
    prompt: input.prompt,
    hostReference: input.hostReference,
    mode: "create" as const,
    rawPrompt: true,
  };
}
