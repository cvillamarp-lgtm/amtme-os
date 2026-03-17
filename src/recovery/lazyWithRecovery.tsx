import React from "react";
import { isChunkError } from "./chunkGuard";

const LAZY_RETRY_KEY = "amtme:lazy-retry-once";

export function lazyWithRecovery<T extends React.ComponentType<unknown>>(
  factory: () => Promise<{ default: T }>
) {
  return React.lazy(async () => {
    try {
      const mod = await factory();
      // Successful load — clear the retry flag so future chunk errors can retry once more.
      sessionStorage.removeItem(LAZY_RETRY_KEY);
      return mod;
    } catch (error) {
      if (isChunkError(error)) {
        const alreadyTried = sessionStorage.getItem(LAZY_RETRY_KEY);
        if (alreadyTried !== "1") {
          sessionStorage.setItem(LAZY_RETRY_KEY, "1");
          window.location.reload();
          // Keep the Suspense fallback visible while the reload is in progress
          // instead of triggering the error boundary with a flash of error UI.
          return new Promise<{ default: T }>(() => {});
        }
      }
      throw error;
    }
  });
}
