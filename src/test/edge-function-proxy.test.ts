import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Supabase client
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
  },
}));

import { supabase } from "@/integrations/supabase/client";
import {
  callEdgeFunction,
  callCleanText,
  callSemanticMap,
  callGenerateOutputs,
} from "@/lib/edge-function-proxy";

const mockGetSession = supabase.auth.getSession as ReturnType<typeof vi.fn>;

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
  it("delegates to callEdgeFunction with correct payload", async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: "tok" } },
    });

    const fakeResult = {
      cleaned_text: "Cleaned",
      cleaned_word_count: 3,
      reduction_percentage: 25,
    };

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(fakeResult),
      }),
    );

    const result = await callCleanText("Raw text here");

    expect(result).toEqual(fakeResult);
    const [url, opts] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/functions/v1/clean-text");
    const body = JSON.parse(opts.body as string);
    expect(body.raw_text).toBe("Raw text here");
  });
});

describe("callSemanticMap helper", () => {
  it("calls the semantic-map edge function", async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: "tok" } },
    });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ semantic_json: {} }),
      }),
    );

    const result = await callSemanticMap("some cleaned text");

    expect(result).toMatchObject({ semantic_json: {} });
    const [url] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string];
    expect(url).toContain("/functions/v1/semantic-map");
  });
});

describe("callGenerateOutputs helper", () => {
  it("calls the generate-outputs edge function", async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: "tok" } },
    });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ outputs: [] }),
      }),
    );

    const result = await callGenerateOutputs({ theme: "tech" });

    expect(result).toMatchObject({ outputs: [] });
    const [url] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string];
    expect(url).toContain("/functions/v1/generate-outputs");
  });
});
