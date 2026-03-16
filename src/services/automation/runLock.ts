/**
 * In-memory run lock for automation double-fire protection.
 *
 * Prevents the same automation event from running concurrently
 * for the same entity (e.g. two rapid saves both triggering onScriptSaved).
 *
 * Key format: "${eventType}-${entityId}"
 *
 * Scope: module-level singleton — survives across React re-renders but
 * resets on page reload (intentional: stale locks should not persist).
 */

const activeLocks = new Set<string>();

/** Returns true if the lock was acquired (caller should proceed). */
export function acquireLock(eventType: string, entityId: string): boolean {
  const key = `${eventType}-${entityId}`;
  if (activeLocks.has(key)) return false;
  activeLocks.add(key);
  return true;
}

/** Release the lock after the run completes (success or error). */
export function releaseLock(eventType: string, entityId: string): void {
  activeLocks.delete(`${eventType}-${entityId}`);
}
