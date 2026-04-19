import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Supabase client (used by callEdgeFunction health-check utility)
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
  },
}));

// Mock the canonical invokeEdgeFunction so helper tests don't hit the network
vi.mock("@/services/functions/invokeEdgeFunction", () => ({
  invokeEdgeFunction: vi.fn(),
}));

import { supabase } from "@/integrations/supabase/client";
import { invokeEdgeFunction } from "@/services/functions/invokeEdgeFunction";
import {
  callEdgeFunction,
  callCleanText,
  callSemanticMap,
  callGenerateOutputs,
} from "@/lib/edge-function-proxy";

const mockGetSession = supabase.auth.getSession as ReturnType<typeof vi.fn>;
const mockInvoke = invokeEdgeFunction as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("callEdgeFunction — authentication guard", () => {
  it("throws when there is no active session token", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });

    await expect(
      callEdgeFunction("clean-text", { body: { raw_text: "hello" } }),
    ).rejects.toThrow("No authentication token found");
  });
});

describe("callEdgeFunction — unknown function", () => {
  it("throws for an unregistered function name", async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: "fake-token" } },
    });

    await expect(
      callEdgeFunction("non-existent-fn", {}),
    ).rejects.toThrow("Unknown function: non-existent-fn");
  });
});

describe("callEdgeFunction — successful HTTP call", () => {
  it("returns parsed JSON on 200 response", async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: "fake-token" } },
    });

    const fakeResponse = { cleaned_text: "Clean result", cleaned_word_count: 5, reduction_percentage: 10 };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(fakeResponse),
      }),
    );

    const result = await callEdgeFunction("clean-text", {
      body: { raw_text: "Some raw text" },
    });

    expect(result).toEqual(fakeResponse);
    expect(fetch).toHaveBeenCalledOnce();
  });

  it("sends Authorization header with Bearer token", async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: "my-token-123" } },
    });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      }),
    );

    await callEdgeFunction("clean-text", { body: { raw_text: "x" } });

    const [, options] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    const headers = options.headers as Record<string, string>;
    expect(headers["Authorization"]).toBe("Bearer my-token-123");
  });
});

describe("callEdgeFunction — HTTP error", () => {
  it("throws when response is not ok", async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: "fake-token" } },
    });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        text: () => Promise.resolve("Server blew up"),
      }),
    );

    await expect(
      callEdgeFunction("clean-text", { body: { raw_text: "x" } }),
    ).rejects.toThrow("clean-text failed: Internal Server Error");
  });

  it("extracts message from normalized { code, message } error body", async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: "fake-token" } },
    });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 422,
        statusText: "Unprocessable Entity",
        json: () =>
          Promise.resolve({
            code: "VALIDATION_ERROR",
            message: "raw_text es requerido",
          }),
      }),
    );

    await expect(
      callEdgeFunction("clean-text", { body: { raw_text: "" } }),
    ).rejects.toThrow("raw_text es requerido");
  });
});

describe("callCleanText helper", () => {
  it("delegates to invokeEdgeFunction with correct args", async () => {
    const fakeResult = {
      cleaned_text: "Cleaned",
      cleaned_word_count: 3,
      reduction_percentage: 25,
    };
    mockInvoke.mockResolvedValue(fakeResult);

    const result = await callCleanText("Raw text here");

    expect(result).toEqual(fakeResult);
    expect(mockInvoke).toHaveBeenCalledWith("clean-text", { raw_text: "Raw text here" });
  });
});

describe("callSemanticMap helper", () => {
  it("delegates to invokeEdgeFunction with correct args", async () => {
    const fakeResult = { semantic_json: {} };
    mockInvoke.mockResolvedValue(fakeResult);

    const result = await callSemanticMap("some cleaned text");

    expect(result).toMatchObject({ semantic_json: {} });
    expect(mockInvoke).toHaveBeenCalledWith("semantic-map", { cleaned_text: "some cleaned text" });
  });
});

describe("callGenerateOutputs helper", () => {
  it("delegates to invokeEdgeFunction with correct args", async () => {
    const fakeResult = { outputs: [] };
    mockInvoke.mockResolvedValue(fakeResult);

    const result = await callGenerateOutputs("map-id-123", { theme: "tech" });

    expect(result).toMatchObject({ outputs: [] });
    expect(mockInvoke).toHaveBeenCalledWith("generate-outputs", {
      semantic_map_id: "map-id-123",
      semantic_json: { theme: "tech" },
    });
  });
});
