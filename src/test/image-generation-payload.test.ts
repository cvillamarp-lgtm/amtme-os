import { describe, expect, it } from "vitest";
import {
  buildPieceImagePayload,
  buildVisualPromptImagePayload,
} from "@/lib/image-generation-payload";

describe("image-generation payload contract", () => {
  it("builds piece payload with episodeId and pieceId", () => {
    const payload = buildPieceImagePayload({
      prompt: "test prompt",
      hostReference: "imagen01",
      pieceId: 3,
      episodeId: "ep-123",
      includeHost: true,
    });

    expect(payload).toEqual({
      prompt: "test prompt",
      hostReference: "imagen01",
      pieceId: 3,
      episodeId: "ep-123",
      includeHost: true,
    });
  });

  it("omits nullable fields when not provided", () => {
    const payload = buildPieceImagePayload({
      prompt: "test prompt",
      hostReference: "imagen02",
      episodeId: null,
    });

    expect(payload).toEqual({
      prompt: "test prompt",
      hostReference: "imagen02",
    });
    expect("episodeId" in payload).toBe(false);
    expect("pieceId" in payload).toBe(false);
  });

  it("enforces raw prompt mode for visual prompt generator", () => {
    const payload = buildVisualPromptImagePayload({
      prompt: "visual prompt",
      hostReference: "imagen02",
    });

    expect(payload).toEqual({
      prompt: "visual prompt",
      hostReference: "imagen02",
      mode: "create",
      rawPrompt: true,
    });
  });
});
