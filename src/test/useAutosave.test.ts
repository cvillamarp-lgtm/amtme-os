import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAutosave } from "@/hooks/useAutosave";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
});

describe("useAutosave — initial state", () => {
  it("starts with idle status", () => {
    const getData = vi.fn(() => ({ text: "hello" }));
    const onSave = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() => useAutosave(getData, onSave));

    expect(result.current.status).toBe("idle");
  });
});

describe("useAutosave — schedule (debounced save)", () => {
  it("saves after debounce delay", async () => {
    const getData = vi.fn(() => ({ text: "hello" }));
    const onSave = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useAutosave(getData, onSave, { debounceMs: 200 }),
    );

    act(() => {
      result.current.schedule();
    });

    expect(onSave).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(201);
    });

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith({ text: "hello" });
  });

  it("debounces multiple schedule() calls into one save", async () => {
    const getData = vi.fn(() => ({ text: "world" }));
    const onSave = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useAutosave(getData, onSave, { debounceMs: 300 }),
    );

    act(() => {
      result.current.schedule();
      result.current.schedule();
      result.current.schedule();
    });

    await act(async () => {
      vi.advanceTimersByTime(301);
    });

    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it("transitions to saving then saved then idle", async () => {
    const getData = vi.fn(() => ({ v: 1 }));
    const onSave = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useAutosave(getData, onSave, { debounceMs: 100 }),
    );

    act(() => {
      result.current.schedule();
    });

    await act(async () => {
      vi.advanceTimersByTime(101);
    });

    expect(result.current.status).toBe("saved");

    await act(async () => {
      vi.advanceTimersByTime(2_001);
    });

    expect(result.current.status).toBe("idle");
  });
});

describe("useAutosave — flush", () => {
  it("saves immediately without waiting for debounce", async () => {
    const getData = vi.fn(() => ({ text: "flush test" }));
    const onSave = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useAutosave(getData, onSave, { debounceMs: 1_000 }),
    );

    act(() => {
      result.current.schedule();
    });

    await act(async () => {
      result.current.flush();
    });

    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it("does not double-save if data is unchanged since last save", async () => {
    const getData = vi.fn(() => ({ text: "same" }));
    const onSave = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useAutosave(getData, onSave, { debounceMs: 100 }),
    );

    // First flush
    await act(async () => {
      result.current.flush();
    });

    expect(onSave).toHaveBeenCalledTimes(1);

    // Second flush with the same data should be a no-op
    await act(async () => {
      result.current.flush();
    });

    expect(onSave).toHaveBeenCalledTimes(1);
  });
});

describe("useAutosave — resetHash", () => {
  it("marks loaded data as already-saved so it is not considered dirty", async () => {
    const data = { text: "loaded content" };
    const getData = vi.fn(() => data);
    const onSave = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useAutosave(getData, onSave, { debounceMs: 100 }),
    );

    act(() => {
      result.current.resetHash(JSON.stringify(data));
    });

    expect(result.current.status).toBe("idle");

    // Flush should be a no-op because hash matches current data
    await act(async () => {
      result.current.flush();
    });

    expect(onSave).not.toHaveBeenCalled();
  });
});

describe("useAutosave — error handling", () => {
  it("sets status to error after 3 consecutive failures", async () => {
    const getData = vi.fn(() => ({ v: 2 }));
    const onSave = vi.fn().mockRejectedValue(new Error("network error"));

    // Use a large intervalMs so the periodic timer doesn't interfere
    const { result } = renderHook(() =>
      useAutosave(getData, onSave, { debounceMs: 50, intervalMs: 60_000 }),
    );

    act(() => {
      result.current.schedule();
    });

    // Step through each retry: debounce + 3 retry delays (1s, 2s, 4s)
    // 4th failure triggers status="error"
    await act(async () => { await vi.advanceTimersByTimeAsync(51); });    // initial attempt
    await act(async () => { await vi.advanceTimersByTimeAsync(1001); });  // retry 1
    await act(async () => { await vi.advanceTimersByTimeAsync(2001); });  // retry 2
    await act(async () => { await vi.advanceTimersByTimeAsync(4001); });  // retry 3 → error

    expect(result.current.status).toBe("error");
  });
});
