import React from "react";
import { isChunkError } from "./chunkGuard";

const LAZY_RETRY_KEY = "amtme:lazy-retry-once";

export function lazyWithRecovery<T extends React.ComponentType<unknown>>(
  factory: () => Promise<{ default: T }>
) {
  return React.lazy(async () => {
    try {
      return await factory();
    } catch (error) {
      if (isChunkError(error)) {
        const alreadyTried = sessionStorage.getItem(LAZY_RETRY_KEY);
        if (alreadyTried !== "1") {
          sessionStorage.setItem(LAZY_RETRY_KEY, "1");
          window.location.reload();
        }
      }
      throw error;
    }
  });
}
