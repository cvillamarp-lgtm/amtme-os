import { useCallback, useEffect, useRef, useState } from "react";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

interface Options {
  debounceMs?: number;
  intervalMs?: number;
}

/**
 * Generic autosave hook.
 *
 * Usage:
 *   const { status, schedule, flush, resetHash } = useAutosave(
 *     () => ({ id, title, body }),          // getData — always reads latest state
 *     async (data) => updateNote(data),     // onSave
 *   );
 *
 * Call `schedule()` inside every onChange handler.
 * Call `flush()` before switching context (e.g. selecting a different note).
 * Call `resetHash(hash)` after loading new data so autosave doesn't consider
 *   the freshly-loaded content "dirty".
 */
export function useAutosave<T>(
  getData: () => T,
  onSave: (data: T) => Promise<void>,
  options?: Options,
) {
  const { debounceMs = 700, intervalMs = 10_000 } = options ?? {};

  const [status, setStatus] = useState<SaveStatus>("idle");

  // Keep latest callbacks in refs to avoid stale closures
  const getDataRef = useRef(getData);
  const onSaveRef  = useRef(onSave);
  useEffect(() => { getDataRef.current = getData; }, [getData]);
  useEffect(() => { onSaveRef.current  = onSave;  }, [onSave]);

  const lastHashRef    = useRef("");
  const debounceRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCountRef  = useRef(0);
  const savingRef      = useRef(false);

  const doSave = useCallback(async (data: T) => {
    const hash = JSON.stringify(data);
    if (hash === lastHashRef.current) return;
    if (savingRef.current) return;   // already in-flight; periodic timer will retry

    savingRef.current = true;
    setStatus("saving");

    try {
      await onSaveRef.current(data);
      lastHashRef.current = hash;
      retryCountRef.current = 0;
      savingRef.current = false;
      setStatus("saved");
      setTimeout(() => setStatus((s) => (s === "saved" ? "idle" : s)), 2_000);
    } catch {
      savingRef.current = false;
      if (retryCountRef.current < 3) {
        const delay = Math.min(1_000 * 2 ** retryCountRef.current, 16_000);
        retryCountRef.current += 1;
        setTimeout(() => doSave(data), delay);
      } else {
        setStatus("error");
      }
    }
  }, []);

  /** Schedule a debounced save. Call on every onChange. */
  const schedule = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(
      () => doSave(getDataRef.current()),
      debounceMs,
    );
  }, [doSave, debounceMs]);

  /** Flush immediately (e.g. Cmd+S, note switch, unmount). */
  const flush = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    doSave(getDataRef.current());
  }, [doSave]);

  /**
   * Reset the saved-hash after loading a new document.
   * Pass `JSON.stringify(newData)` so the freshly-loaded content is not
   * treated as unsaved.
   */
  const resetHash = useCallback((hash: string) => {
    lastHashRef.current = hash;
    retryCountRef.current = 0;
    setStatus("idle");
  }, []);

  // Periodic save — flush if dirty while idle
  useEffect(() => {
    const id = setInterval(() => {
      if (savingRef.current) return;
      const data = getDataRef.current();
      const hash = JSON.stringify(data);
      if (hash !== lastHashRef.current) doSave(data);
    }, intervalMs);
    return () => clearInterval(id);
  }, [doSave, intervalMs]);

  // Flush on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      const data = getDataRef.current();
      if (JSON.stringify(data) !== lastHashRef.current) {
        onSaveRef.current(data).catch(() => {});
      }
    };
  }, []);

  return { status, schedule, flush, resetHash };
}
