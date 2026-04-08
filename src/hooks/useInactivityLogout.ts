/**
 * useInactivityLogout — DISABLED
 *
 * The artificial frontend idle timer was removed because it interrupted active
 * user operations (AI generation, save, apply-changes) causing data loss (QA-001).
 *
 * Session lifecycle is now handled exclusively by Supabase's native token refresh
 * (autoRefreshToken: true in the client config). This is the correct layer for
 * session management — the frontend should never force logout during active use.
 *
 * If idle logout is re-introduced in the future, requirements are:
 *   - Minimum timeout: 30 minutes (not 2 minutes)
 *   - Must check pendingRequestsCount > 0 before executing logout
 *   - Must check isProcessing flag set by critical flows (AI, save, publish)
 *   - Must reset timer on any Supabase query/mutation, not just DOM events
 *   - Must show a cancellable countdown of at least 60 seconds before acting
 */
export function useInactivityLogout(): void {
  // No-op: session management delegated to Supabase native refresh.
}
