import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Supabase client
vi.mock("@/integrations/supabase/client", () => {
  const mockSupabase = {
    auth: {
      getSession: vi.fn(),
    },
    from: vi.fn(),
  };
  return { supabase: mockSupabase };
});

import { supabase } from "@/integrations/supabase/client";
import {
  logAutomation,
  generateRunId,
} from "@/services/automation/infrastructure/logAutomation";
import type { AutomationLogEntry } from "@/services/automation/infrastructure/logAutomation";

const mockSupabase = supabase as unknown as {
  auth: { getSession: ReturnType<typeof vi.fn> };
  from: ReturnType<typeof vi.fn>;
};

function makeInsertChain(resolvedValue?: unknown, error?: Error) {
  const chain = {
    insert: error
      ? vi.fn().mockRejectedValue(error)
      : vi.fn().mockResolvedValue(resolvedValue ?? { data: null, error: null }),
  };
  return chain;
}

function getInsertArg(chain: ReturnType<typeof makeInsertChain>): Record<string, unknown> {
  return chain.insert.mock.calls[0][0] as Record<string, unknown>;
}

const SAMPLE_ENTRY: AutomationLogEntry = {
  runId: "test-run-id",
  eventType: "script_saved",
  entityType: "episode",
  entityId: "ep-123",
  episodeId: "ep-123",
  status: "success",
  resultSummary: "Script saved successfully",
  durationMs: 42,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("generateRunId", () => {
  it("returns a non-empty string", () => {
    const id = generateRunId();
    expect(typeof id).toBe("string");
    expect(id.length).toBeGreaterThan(0);
  });

  it("returns a unique ID on each call", () => {
    const id1 = generateRunId();
    const id2 = generateRunId();
    expect(id1).not.toBe(id2);
  });
});

describe("logAutomation — success path", () => {
  it("inserts a log entry and resolves without throwing", async () => {
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: "user-1" } } },
    });
    const chain = makeInsertChain({ data: null, error: null });
    mockSupabase.from.mockReturnValue(chain);

    await expect(logAutomation(SAMPLE_ENTRY)).resolves.toBeUndefined();
    expect(mockSupabase.from).toHaveBeenCalledWith("automation_logs");
    expect(chain.insert).toHaveBeenCalledOnce();
  });

  it("passes the correct fields to the insert call", async () => {
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: "user-42" } } },
    });
    const chain = makeInsertChain({ data: null, error: null });
    mockSupabase.from.mockReturnValue(chain);

    await logAutomation(SAMPLE_ENTRY);

    const insertArg = getInsertArg(chain);
    expect(insertArg.user_id).toBe("user-42");
    expect(insertArg.run_id).toBe(SAMPLE_ENTRY.runId);
    expect(insertArg.event_type).toBe(SAMPLE_ENTRY.eventType);
    expect(insertArg.entity_type).toBe(SAMPLE_ENTRY.entityType);
    expect(insertArg.entity_id).toBe(SAMPLE_ENTRY.entityId);
    expect(insertArg.episode_id).toBe(SAMPLE_ENTRY.episodeId);
    expect(insertArg.status).toBe(SAMPLE_ENTRY.status);
    expect(insertArg.result_summary).toBe(SAMPLE_ENTRY.resultSummary);
    expect(insertArg.duration_ms).toBe(SAMPLE_ENTRY.durationMs);
  });

  it("uses null user_id when there is no active session", async () => {
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: null },
    });
    const chain = makeInsertChain({ data: null, error: null });
    mockSupabase.from.mockReturnValue(chain);

    await logAutomation(SAMPLE_ENTRY);

    const insertArg = getInsertArg(chain);
    expect(insertArg.user_id).toBeNull();
  });

  it("defaults optional fields to null/empty when omitted", async () => {
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: "u1" } } },
    });
    const chain = makeInsertChain({ data: null, error: null });
    mockSupabase.from.mockReturnValue(chain);

    const minimalEntry: AutomationLogEntry = {
      runId: "r1",
      eventType: "episode_completion",
      entityType: "episode",
      status: "skipped",
    };
    await logAutomation(minimalEntry);

    const insertArg = getInsertArg(chain);
    expect(insertArg.entity_id).toBeNull();
    expect(insertArg.episode_id).toBeNull();
    expect(insertArg.result_summary).toBeNull();
    expect(insertArg.skip_reason).toBeNull();
    expect(insertArg.error_message).toBeNull();
    expect(insertArg.duration_ms).toBeNull();
    expect(insertArg.metadata).toEqual({});
  });
});

describe("logAutomation — error handling (must never throw)", () => {
  it("does not throw when the Supabase insert rejects", async () => {
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: "u1" } } },
    });
    const chain = makeInsertChain(undefined, new Error("DB connection failed"));
    mockSupabase.from.mockReturnValue(chain);

    // This is the key regression test: the unhandled Promise rejection is fixed
    await expect(logAutomation(SAMPLE_ENTRY)).resolves.toBeUndefined();
  });

  it("does not throw when getSession rejects", async () => {
    mockSupabase.auth.getSession.mockRejectedValue(new Error("Network error"));
    mockSupabase.from.mockReturnValue(makeInsertChain({ data: null, error: null }));

    await expect(logAutomation(SAMPLE_ENTRY)).resolves.toBeUndefined();
  });

  it("does not throw when getSession returns an unexpected shape", async () => {
    mockSupabase.auth.getSession.mockResolvedValue({ data: {} });
    const chain = makeInsertChain({ data: null, error: null });
    mockSupabase.from.mockReturnValue(chain);

    await expect(logAutomation(SAMPLE_ENTRY)).resolves.toBeUndefined();
  });
});
