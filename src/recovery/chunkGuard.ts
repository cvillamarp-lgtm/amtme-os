const RELOAD_ONCE_KEY = "amtme:chunk-reload-once";

function isChunkLoadError(error: unknown): boolean {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
      ? error
      : JSON.stringify(error);

  return (
    /Failed to fetch dynamically imported module/i.test(message) ||
    /Importing a module script failed/i.test(message) ||
    /Loading chunk [\d\w-]+ failed/i.test(message) ||
    /ChunkLoadError/i.test(message)
  );
}

export function installChunkReloadGuard() {
  window.addEventListener("error", (event) => {
    const err = event.error;
    if (!isChunkLoadError(err)) return;

    const alreadyReloaded = sessionStorage.getItem(RELOAD_ONCE_KEY);
    if (alreadyReloaded === "1") return;

    sessionStorage.setItem(RELOAD_ONCE_KEY, "1");
    window.location.reload();
  });

  window.addEventListener("unhandledrejection", (event) => {
    if (!isChunkLoadError(event.reason)) return;

    const alreadyReloaded = sessionStorage.getItem(RELOAD_ONCE_KEY);
    if (alreadyReloaded === "1") return;

    sessionStorage.setItem(RELOAD_ONCE_KEY, "1");
    window.location.reload();
  });
}

export function clearChunkReloadGuardFlag() {
  sessionStorage.removeItem(RELOAD_ONCE_KEY);
}

export function isChunkError(error: unknown) {
  return isChunkLoadError(error);
}
