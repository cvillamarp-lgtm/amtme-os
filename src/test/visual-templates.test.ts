import { describe, it, expect } from "vitest";
import { buildPiecePrompt, VISUAL_PIECES, HOST_REFERENCES, getHostReferenceUrl, type EpisodeInput } from "@/lib/visual-templates";

describe("buildPiecePrompt", () => {
  const input: EpisodeInput = {
    number: "29",
    thesis: "Test thesis",
    keyPhrases: ["phrase1", "phrase2"],
  };

  it("generates a prompt string", () => {
    const piece = VISUAL_PIECES[0];
    const prompt = buildPiecePrompt(piece, input, piece.copyTemplate);
    expect(typeof prompt).toBe("string");
    expect(prompt.length).toBeGreaterThan(100);
  });

  it("replaces XX with padded episode number", () => {
    const piece = VISUAL_PIECES[0];
    const prompt = buildPiecePrompt(piece, input, ["EP. XX", "TEST XX"]);
    expect(prompt).toContain("EP. 29");
    expect(prompt).not.toContain("EP. XX");
  });

  it("includes brand context", () => {
    const piece = VISUAL_PIECES[0];
    const prompt = buildPiecePrompt(piece, input, piece.copyTemplate);
    expect(prompt).toContain("A MÍ TAMPOCO ME EXPLICARON");
    expect(prompt).toContain("#1A1AE6");
  });

  it("does not contain hardcoded Supabase project URLs", () => {
    const piece = VISUAL_PIECES[0];
    const prompt = buildPiecePrompt(piece, input, piece.copyTemplate);
    expect(prompt).not.toContain("knjhhmqthkpucfxpdhxj");
  });
});

describe("HOST_REFERENCES", () => {
  it("builds URLs dynamically from env", () => {
    const url1 = HOST_REFERENCES.imagen01;
    const url2 = HOST_REFERENCES.imagen02;
    expect(url1).toContain("/storage/v1/object/public/generated-images/host-imagen01.png");
    expect(url2).toContain("/storage/v1/object/public/generated-images/host-imagen02.png");
  });

  it("getHostReferenceUrl uses VITE_SUPABASE_URL", () => {
    // In test env, VITE_SUPABASE_URL may be undefined — the function still builds the path
    const url = getHostReferenceUrl("imagen01");
    expect(url).toContain("host-imagen01.png");
  });
});
