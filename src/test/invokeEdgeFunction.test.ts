import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FunctionsHttpError } from "@supabase/supabase-js";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      refreshSession: vi.fn(),
    },
    functions: {
      invoke: vi.fn(),
    },
  },
}));

import { supabase } from "@/integrations/supabase/client";
import { invokeEdgeFunction } from "@/services/functions/invokeEdgeFunction";

const mockGetSession = supabase.auth.getSession as ReturnType<typeof vi.fn>;
const mockRefreshSession = supabase.auth.refreshSession as ReturnType<typeof vi.fn>;
const mockInvoke = supabase.functions.invoke as ReturnType<typeof vi.fn>;
const ONE_HOUR_IN_SECONDS = 3_600;

function httpError(status: number, message: string): FunctionsHttpError {
  return new FunctionsHttpError(
    new Response(JSON.stringify({ message }), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

describe("invokeEdgeFunction — 401 recovery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          access_token: "stale-token",
          expires_at: Math.floor(Date.now() / 1000) + ONE_HOUR_IN_SECONDS,
        },
      },
    });
    mockRefreshSession.mockResolvedValue({
      data: {
        session: { access_token: "fresh-token" },
      },
      error: null,
    });
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("refreshes on first 401 and retries with refreshed authorization header", async () => {
    mockInvoke
      .mockResolvedValueOnce({
        data: null,
        error: httpError(401, "Invalid token"),
      })
      .mockResolvedValueOnce({
        data: { ok: true },
        error: null,
      });

    const result = await invokeEdgeFunction("generate-episode-fields", { mode: "regenerate_field" }, {
      maxRetries: 2,
      baseDelayMs: 0,
      jitterMs: 0,
    });

    expect(result).toEqual({ ok: true });
    expect(mockInvoke).toHaveBeenCalledTimes(2);
    expect(mockRefreshSession).toHaveBeenCalledTimes(1);

    expect(mockInvoke.mock.calls[0][1].headers.Authorization).toBe("Bearer stale-token");
    expect(mockInvoke.mock.calls[1][1].headers.Authorization).toBe("Bearer fresh-token");
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("returned 401"));
    expect(console.info).toHaveBeenCalledWith(expect.stringContaining("Session refreshed"));
  });

  it("retries only once for 401 and then fails with session-expired error", async () => {
    mockInvoke
      .mockResolvedValueOnce({
        data: null,
        error: httpError(401, "Invalid token"),
      })
      .mockResolvedValueOnce({
        data: null,
        error: httpError(401, "Invalid token again"),
      });

    await expect(
      invokeEdgeFunction("generate-episode-fields", { mode: "regenerate_field" }, {
        maxRetries: 3,
        baseDelayMs: 0,
        jitterMs: 0,
      }),
    ).rejects.toThrow("Sesión expirada, inicia sesión nuevamente");

    expect(mockInvoke).toHaveBeenCalledTimes(2);
    expect(mockRefreshSession).toHaveBeenCalledTimes(1);
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("returned 401"));
  });
});
