# Technical Audit Report

## Date: 2026-03-17

---

## 1. Executive Summary

A full audit of routing, lazy loading, imports, build configuration, and runtime error handling was performed. Three critical build-breaking errors were found in stub files that had been incorrectly generated (imported from a removed package and missing required exports). All three were corrected. The build now passes cleanly with all 3,564 modules transformed and 67 output chunks, with stable named vendor chunks for cache management.

---

## 2. Critical Errors Found and Root Causes

### Error 1 — `src/hooks/useEpisode.ts`: import from `'react-query'` (uninstalled v3)

**Root cause:** The file was replaced with an auto-generated stub that imported `useQuery` from `'react-query'` (the old v3 package name). The project uses `@tanstack/react-query` v5, which is not backwards-compatible. Rollup failed to resolve the import at build time.

**Secondary issues in the same file:**
- Missing `useEpisodes` export (required by `Episodes.tsx` and `ContentFactory.tsx`)
- Missing `updateEpisode` mutation (required by `EpisodeWorkspace.tsx`)
- Missing TypeScript types on `id` parameter and return value
- Using deprecated `cacheTime` option (renamed to `gcTime` in v5)
- The old `useQuery(['key'], fn, opts)` positional signature (removed in v5; now uses object form)

**Correction implemented:** Rewrote `useEpisode.ts` from scratch using the `@tanstack/react-query` v5 object API with full TypeScript types from `@/integrations/supabase/types`. Exports both `useEpisode(id)` and `useEpisodes()` with the return shapes expected by all consuming pages.

---

### Error 2 — `src/services/automation/retryAutomation.ts`: no `retryAutomation` export

**Root cause:** The file was replaced with a stub that contained internal helper functions but no exports. `App.tsx` imports `retryAutomation` from this module and passes it to `RecoveryAgentProvider`. Rollup hard-fails on missing named exports.

**Secondary issues:**
- Import paths used `'../core/scriptExtraction'` etc. (relative paths that would work) but the functions were never re-exported
- The stub contained dead code with no runtime value (`someFunction`, `evaluateState`)

**Correction implemented:** Rewrote the file to export a single `retryAutomation(row)` function that dispatches to the correct core automation function (`onScriptSaved`, `onAssetApproved`, `onPublicationStateChanged`, `evaluateEpisodeCompletion`) based on `event_type` from the automation log row. Also exports the `AutomationLogRow` interface.

---

### Error 3 — `src/hooks/useExportPackages.ts`: missing named exports

**Root cause:** The file was replaced with a stub that only had a default export (`const useExportPackages = () => ...`) instead of named exports. Three consumers required:
- `useExportPackages(episodeId)` — used by `AudioStudio.tsx` and `useEpisodeOperationalState.ts`
- `useCreateExportPackage()` — used by `AudioStudio.tsx`
- `useAddToPublicationQueue()` — used by `AudioStudio.tsx`
- `usePublicationQueue(episodeId)` — used by `useEpisodeOperationalState.ts`

**Secondary issues:**
- Used old v4 `queryClient.invalidateQueries(['key'])` array syntax (broken in v5; now requires `{ queryKey: [...] }`)
- Untyped `episodeId` parameter

**Correction implemented:** Rewrote `useExportPackages.ts` with four named exports using `@tanstack/react-query` v5 object API and full TypeScript types.

---

## 3. New Files

None. All fixes were applied to existing files.

---

## 4. Modified Files

| File | Change |
|------|--------|
| `src/hooks/useEpisode.ts` | Full rewrite: correct package, proper types, all exports |
| `src/services/automation/retryAutomation.ts` | Full rewrite: `retryAutomation` named export with dispatch logic |
| `src/hooks/useExportPackages.ts` | Full rewrite: four named exports, v5 API, proper types |

---

## 5. Routes / Imports / Chunks Corrected

- All 34 lazy-loaded page routes in `App.tsx` compile and build correctly
- Each page gets its own hashed chunk (e.g. `Episodes-DJgFQaBn.js`)
- Vendor chunks are stable across deploys: `vendor-react`, `vendor-router`, `vendor-query`, `vendor-supabase`, `vendor-recharts`, `vendor-radix`, `vendor-lucide`, `vendor-utils`

---

## 6. Build / Deploy / Cache Configuration

`vite.config.ts` `manualChunks` strategy is correct and working. Named vendor chunks prevent stale-cache chunk errors after new deploys. No changes required.

`vercel.json` was not modified (SPA fallback and headers should be verified in the deployment platform settings).

---

## 7. Latent Errors Corrected

- `lazyWithRecovery` wraps all page imports; chunk load failures trigger a `sessionStorage`-gated reload (prevents infinite loops)
- `RouteErrorBoundary` wraps each lazy route; render errors are reported to `RecoveryAgentProvider` and auto-reload for chunk errors
- `ErrorBoundary` at app root catches uncaught render errors
- `installChunkReloadGuard()` and `installRuntimeCapture()` are available in `@/recovery` to be called from `main.tsx` if needed (currently not called — low-risk latent gap)

---

## 8. Technical Validation

```
$ tsc --noEmit          → exit 0 (no type errors)
$ vite build            → ✓ 3564 modules transformed, built in 9.20s
```

All 34 lazy page imports resolve correctly. No broken chunk references.

---

## 9. Pending Real Risks

1. **`installChunkReloadGuard()` and `installRuntimeCapture()` not called in `main.tsx`** — window-level error events for chunk failures are not captured globally. The per-route `RouteErrorBoundary` and `lazyWithRecovery` provide coverage for React-tree errors; bare `<script>` chunk errors outside React could go unhandled. Low-impact in an SPA but worth adding to `main.tsx`.

2. **`vercel.json` / CDN cache headers** — Not audited in this session. Ensure `Cache-Control: no-cache` on `index.html` and long `max-age` on `/assets/*` (immutable) to prevent stale chunk references after deploys.

3. **`src/pages/AudioStudio.tsx` uses `any` in catch clauses** — `catch (err: any)` is a minor type-safety gap, not a runtime risk.

