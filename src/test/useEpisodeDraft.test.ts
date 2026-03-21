import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useEpisodeDraft } from "@/hooks/useEpisodeDraft";

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

const mockSupabase = supabase as unknown as {
  auth: { getSession: ReturnType<typeof vi.fn> };
  from: ReturnType<typeof vi.fn>;
};

function makeFromChain(returnValue: unknown) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(returnValue),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(returnValue),
    then: vi.fn().mockResolvedValue(undefined),
  };
  return chain;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useEpisodeDraft — initial state", () => {
  it("starts with empty draft", () => {
    const { result } = renderHook(() => useEpisodeDraft());
    expect(result.current.draft.idea_principal).toBe("");
    expect(result.current.draft.step).toBe(1);
    expect(result.current.draft.id).toBeNull();
  });
});

describe("useEpisodeDraft — saveDraft", () => {
  it("updates local draft state immediately", async () => {
    const { result } = renderHook(() => useEpisodeDraft());

    await act(async () => {
      result.current.saveDraft({ idea_principal: "Mi idea de episodio" });
    });

    expect(result.current.draft.idea_principal).toBe("Mi idea de episodio");
  });

  it("merges partial updates into current draft", async () => {
    const { result } = renderHook(() => useEpisodeDraft());

    await act(async () => {
      result.current.saveDraft({ idea_principal: "Idea inicial", tono: "serio" });
    });

    await act(async () => {
      result.current.saveDraft({ tono: "ligero" });
    });

    expect(result.current.draft.idea_principal).toBe("Idea inicial");
    expect(result.current.draft.tono).toBe("ligero");
  });
});

describe("useEpisodeDraft — loadActiveDraft", () => {
  it("returns empty draft when no session exists", async () => {
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: null },
    });

    const { result } = renderHook(() => useEpisodeDraft());

    let loaded;
    await act(async () => {
      loaded = await result.current.loadActiveDraft();
    });

    expect(loaded).toMatchObject({ idea_principal: "", step: 1, id: null });
  });

  it("returns empty draft when DB returns no rows", async () => {
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: "user-1" } } },
    });

    const chain = makeFromChain({ data: null, error: null });
    mockSupabase.from.mockReturnValue(chain);

    const { result } = renderHook(() => useEpisodeDraft());

    let loaded;
    await act(async () => {
      loaded = await result.current.loadActiveDraft();
    });

    expect(loaded).toMatchObject({ idea_principal: "", id: null });
  });

  it("restores draft from DB when a row is found", async () => {
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: "user-1" } } },
    });

    const dbRow = {
      id: "draft-123",
      idea_principal: "Episodio sobre tecnología",
      tono: "informal",
      restricciones: "",
      release_date: null,
      conflict_options_json: null,
      selected_conflicto: null,
      selected_intencion: null,
      step: 1,
    };

    const chain = makeFromChain({ data: dbRow, error: null });
    mockSupabase.from.mockReturnValue(chain);

    const { result } = renderHook(() => useEpisodeDraft());

    let loaded;
    await act(async () => {
      loaded = await result.current.loadActiveDraft();
    });

    expect(loaded).toMatchObject({
      id: "draft-123",
      idea_principal: "Episodio sobre tecnología",
      tono: "informal",
      step: 1,
    });
  });
});

describe("useEpisodeDraft — markConverted", () => {
  it("resets draft to empty state", async () => {
    const { result } = renderHook(() => useEpisodeDraft());

    await act(async () => {
      result.current.saveDraft({ idea_principal: "Idea" });
    });

    expect(result.current.draft.idea_principal).toBe("Idea");

    const chain = makeFromChain({ data: null, error: null });
    mockSupabase.from.mockReturnValue(chain);

    await act(async () => {
      await result.current.markConverted("episode-abc");
    });

    expect(result.current.draft.idea_principal).toBe("");
    expect(result.current.draft.id).toBeNull();
  });
});

describe("useEpisodeDraft — clearDraft", () => {
  it("resets draft to empty state", async () => {
    const { result } = renderHook(() => useEpisodeDraft());

    await act(async () => {
      result.current.saveDraft({ idea_principal: "Algo", step: 2 });
    });

    const chain = makeFromChain({ data: null, error: null });
    mockSupabase.from.mockReturnValue(chain);

    await act(async () => {
      await result.current.clearDraft();
    });

    expect(result.current.draft.idea_principal).toBe("");
    expect(result.current.draft.step).toBe(1);
  });
});
