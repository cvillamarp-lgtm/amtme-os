import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useScriptEngineOutputs, triggerVisualAssetGeneration } from "@/hooks/useScriptEngineOutputs";
import * as supabaseModule from "@/integrations/supabase/client";
import * as edgeFunctionProxy from "@/lib/edge-function-proxy";
import React from "react";

// Mock Supabase client
vi.mock("@/integrations/supabase/client");
vi.mock("@/lib/edge-function-proxy");

// Helper to wrap hook with QueryClientProvider
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

// Helper to create a complete Supabase mock
const createSupabaseMock = (options: Record<string, any> = {}) => {
  return {
    from: vi.fn().mockImplementation((table: string) => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue(options.selectResult || { data: null, error: null }),
          maybeSingle: vi.fn().mockResolvedValue(options.selectResult || { data: null, error: null }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue(options.updateResult || { error: null }),
      }),
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue(options.deleteResult || { error: null }),
      }),
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue(options.insertResult || { data: null, error: null }),
      }),
    })),
    functions: {
      invoke: vi.fn().mockResolvedValue(options.invokeResult || { error: null }),
    },
  };
};

describe("useScriptEngineOutputs", () => {
  const mockSemanticJson = {
    episode_metadata: {
      central_thesis: "Test thesis for the episode",
      theme: "Lifestyle",
    },
    key_phrases: ["phrase1", "phrase2"],
    shareable_phrases: ["share1"],
    memorable_lines: ["memorable"],
    short_quotes: ["quote"],
  };

  const mockOutputs = {
    outputs: [
      {
        output_number: 1,
        asset_type: "editorial_summary",
        content: { text: "summary" },
        word_counts_json: { text: 50 },
      },
      {
        output_number: 2,
        asset_type: "visual_copy",
        content: [{ headline: "Test", cta: "Click" }],
        word_counts_json: {},
      },
    ],
    savedAssets: [
      { outputNumber: 1, assetId: "asset-1" },
      { outputNumber: 2, assetId: "asset-2" },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should initialize with empty state", () => {
    const { result } = renderHook(() => useScriptEngineOutputs(), { wrapper: createWrapper() });

    expect(result.current.state.semanticMapId).toBeNull();
    expect(result.current.state.episodeId).toBeNull();
    expect(result.current.state.outputs).toEqual([]);
    expect(result.current.state.loading).toBe(false);
    expect(result.current.state.error).toBeNull();
  });

  it("should load semantic map successfully", async () => {
    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: {
            id: "map-1",
            episode_id: "ep-1",
            semantic_json: mockSemanticJson,
          },
          error: null,
        }),
      }),
    });

    vi.spyOn(supabaseModule, "supabase", "get").mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: mockSelect,
      }),
    } as any);

    const { result } = renderHook(() => useScriptEngineOutputs(), { wrapper: createWrapper() });

    await result.current.loadSemanticMap("map-1");

    await waitFor(() => {
      expect(result.current.state.semanticMapId).toBe("map-1");
      expect(result.current.state.episodeId).toBe("ep-1");
      expect(result.current.state.semanticJson).toBeTruthy();
    });

    expect(result.current.state.loading).toBe(false);
    expect(result.current.state.error).toBeNull();
  });

  it("should handle semantic map load error", async () => {
    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: null,
          error: new Error("Load failed"),
        }),
      }),
    });

    vi.spyOn(supabaseModule, "supabase", "get").mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: mockSelect,
      }),
    } as any);

    const { result } = renderHook(() => useScriptEngineOutputs(), { wrapper: createWrapper() });

    await result.current.loadSemanticMap("map-1");

    await waitFor(() => {
      expect(result.current.state.error).toBeTruthy();
      expect(result.current.state.loading).toBe(false);
    });
  });

  it("should generate 10 outputs in parallel", async () => {
    const mockCallGenerateOutputs = vi.spyOn(edgeFunctionProxy, "callGenerateOutputs");
    mockCallGenerateOutputs.mockResolvedValue(mockOutputs as any);

    const mockSupabase = createSupabaseMock({
      selectResult: { data: { episode_id: "ep-1" }, error: null },
      insertResult: {
        data: [
          { id: "asset-1", asset_key: "output_01" },
          { id: "asset-2", asset_key: "output_02" },
        ],
        error: null,
      },
    });

    vi.spyOn(supabaseModule, "supabase", "get").mockReturnValue(mockSupabase as any);

    const { result } = renderHook(() => useScriptEngineOutputs(), { wrapper: createWrapper() });

    await result.current.generateOutputs("map-1", mockSemanticJson);

    await waitFor(() => {
      expect(result.current.state.outputs.length).toBe(2);
      expect(result.current.state.loading).toBe(false);
      expect(result.current.state.progress).toBe(100);
    });

    expect(mockCallGenerateOutputs).toHaveBeenCalledWith(mockSemanticJson);
  });

  it("should map outputs by type", async () => {
    const mockCallGenerateOutputs = vi.spyOn(edgeFunctionProxy, "callGenerateOutputs");
    mockCallGenerateOutputs.mockResolvedValue(mockOutputs as any);

    const mockSupabase = createSupabaseMock({
      selectResult: { data: { episode_id: "ep-1" }, error: null },
      insertResult: {
        data: [
          { id: "asset-1", asset_key: "output_01" },
          { id: "asset-2", asset_key: "output_02" },
        ],
        error: null,
      },
    });

    vi.spyOn(supabaseModule, "supabase", "get").mockReturnValue(mockSupabase as any);

    const { result } = renderHook(() => useScriptEngineOutputs(), { wrapper: createWrapper() });

    await result.current.generateOutputs("map-1", mockSemanticJson);

    await waitFor(() => {
      expect(result.current.state.outputsByType.editorial_summary).toBeTruthy();
      expect(result.current.state.outputsByType.visual_copy).toBeTruthy();
    });
  });

  it("should get output by number", async () => {
    const mockCallGenerateOutputs = vi.spyOn(edgeFunctionProxy, "callGenerateOutputs");
    mockCallGenerateOutputs.mockResolvedValue(mockOutputs as any);

    const mockSupabase = createSupabaseMock({
      selectResult: { data: { episode_id: "ep-1" }, error: null },
      insertResult: {
        data: [
          { id: "asset-1", asset_key: "output_01" },
          { id: "asset-2", asset_key: "output_02" },
        ],
        error: null,
      },
    });

    vi.spyOn(supabaseModule, "supabase", "get").mockReturnValue(mockSupabase as any);

    const { result } = renderHook(() => useScriptEngineOutputs(), { wrapper: createWrapper() });

    await result.current.generateOutputs("map-1", mockSemanticJson);

    await waitFor(() => {
      expect(result.current.state.outputs.length).toBe(2);
    });

    const output1 = result.current.getOutput(1);
    expect(output1?.output_number).toBe(1);
  });

  it("should handle generation error", async () => {
    const mockCallGenerateOutputs = vi.spyOn(edgeFunctionProxy, "callGenerateOutputs");
    mockCallGenerateOutputs.mockRejectedValue(new Error("Generation failed"));

    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { episode_id: "ep-1" },
          error: null,
        }),
      }),
    });

    vi.spyOn(supabaseModule, "supabase", "get").mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: mockSelect,
      }),
    } as any);

    const { result } = renderHook(() => useScriptEngineOutputs(), { wrapper: createWrapper() });

    const generatePromise = result.current.generateOutputs("map-1", mockSemanticJson);

    await expect(generatePromise).rejects.toThrow("Generation failed");

    await waitFor(() => {
      expect(result.current.state.error).toBeTruthy();
      expect(result.current.state.loading).toBe(false);
    });
  });

  it("should trigger visual asset generation", async () => {
    const mockFunctionsInvoke = vi.fn().mockResolvedValue({ error: null });

    vi.spyOn(supabaseModule, "supabase", "get").mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { title: "Test Episode" },
              error: null,
            }),
          }),
        }),
      }),
      functions: {
        invoke: mockFunctionsInvoke,
      },
    } as any);

    await triggerVisualAssetGeneration("ep-1", mockSemanticJson);

    expect(mockFunctionsInvoke).toHaveBeenCalledWith("generate-visual-assets", {
      body: {
        episode_id: "ep-1",
        episode_title: "Test Episode",
        central_thesis: "Test thesis for the episode",
        theme: "Lifestyle",
      },
    });
  });
});
