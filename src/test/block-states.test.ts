import { describe, it, expect } from "vitest";
import {
  computeStaleBlocks,
  initBlockStatesFromAI,
  addVersionEntry,
  applyStaleToStates,
  countStaleBlocks,
  getStaleFields,
  BASE_FIELDS,
  type BlockStatesMap,
  type VersionHistoryMap,
} from "@/lib/block-states";

describe("initBlockStatesFromAI", () => {
  it("creates states for all 8 base fields with generated status", () => {
    const states = initBlockStatesFromAI();
    expect(Object.keys(states)).toHaveLength(BASE_FIELDS.length);
    for (const field of BASE_FIELDS) {
      expect(states[field]).toBeDefined();
      expect(states[field].status).toBe("generated");
      expect(states[field].source_type).toBe("ai_generated");
    }
  });
});

describe("computeStaleBlocks", () => {
  it("marks dependents as stale when source changes", () => {
    const states: BlockStatesMap = {
      idea_principal: { status: "edited", updated_at: "", source_type: "edited" },
      working_title: { status: "generated", updated_at: "", source_type: "ai_generated" },
      theme: { status: "generated", updated_at: "", source_type: "ai_generated" },
      core_thesis: { status: "generated", updated_at: "", source_type: "ai_generated" },
    };

    const { staleFields, approvedWarnings } = computeStaleBlocks("idea_principal", states);
    expect(staleFields).toContain("working_title");
    expect(staleFields).toContain("theme");
    expect(staleFields).toContain("core_thesis");
    expect(approvedWarnings).toHaveLength(0);
  });

  it("does not mark approved blocks as stale — adds to warnings instead", () => {
    const states: BlockStatesMap = {
      idea_principal: { status: "edited", updated_at: "", source_type: "edited" },
      working_title: { status: "approved", updated_at: "", source_type: "approved" },
      theme: { status: "generated", updated_at: "", source_type: "ai_generated" },
    };

    const { staleFields, approvedWarnings } = computeStaleBlocks("idea_principal", states);
    expect(staleFields).not.toContain("working_title");
    expect(staleFields).toContain("theme");
    expect(approvedWarnings).toContain("working_title");
  });

  it("returns empty arrays for fields with no dependents", () => {
    const states: BlockStatesMap = {};
    const { staleFields, approvedWarnings } = computeStaleBlocks("hook", states);
    expect(staleFields).toHaveLength(0);
    expect(approvedWarnings).toHaveLength(0);
  });
});

describe("applyStaleToStates", () => {
  it("marks changed field as edited and dependents as stale", () => {
    const states: BlockStatesMap = {
      theme: { status: "generated", updated_at: "", source_type: "ai_generated" },
      core_thesis: { status: "generated", updated_at: "", source_type: "ai_generated" },
      summary: { status: "generated", updated_at: "", source_type: "ai_generated" },
    };

    const { newStates } = applyStaleToStates("theme", states);
    expect(newStates.theme.status).toBe("edited");
    expect(newStates.core_thesis.status).toBe("stale");
    expect(newStates.summary.status).toBe("stale");
  });
});

describe("countStaleBlocks / getStaleFields", () => {
  it("counts and lists stale fields correctly", () => {
    const states: BlockStatesMap = {
      a: { status: "stale", updated_at: "", source_type: "edited" },
      b: { status: "generated", updated_at: "", source_type: "ai_generated" },
      c: { status: "stale", updated_at: "", source_type: "edited" },
    };

    expect(countStaleBlocks(states)).toBe(2);
    expect(getStaleFields(states)).toEqual(["a", "c"]);
  });
});

describe("addVersionEntry", () => {
  it("adds a version entry and keeps max 10", () => {
    const history: VersionHistoryMap = {};
    const result = addVersionEntry(history, "working_title", "Old title", "edited");
    expect(result.working_title).toHaveLength(1);
    expect(result.working_title[0].value).toBe("Old title");
  });

  it("trims to 10 entries when exceeding limit", () => {
    const entries = Array.from({ length: 12 }, (_, i) => ({
      value: `v${i}`,
      timestamp: new Date().toISOString(),
      source_type: "edited",
    }));
    const history: VersionHistoryMap = { field: entries };
    const result = addVersionEntry(history, "field", "new", "edited");
    expect(result.field.length).toBeLessThanOrEqual(10);
    expect(result.field[result.field.length - 1].value).toBe("new");
  });
});
