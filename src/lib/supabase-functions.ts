// ─── Backward-compat re-export ───────────────────────────────────────────────
// Canonical source of truth moved to:
//   src/services/functions/invokeEdgeFunction.ts
//
// All new code must import from the canonical path.
// This shim exists only to keep old imports alive during the migration window.
// ─────────────────────────────────────────────────────────────────────────────
export { invokeEdgeFunction as invokeFunction } from "@/services/functions/invokeEdgeFunction";
