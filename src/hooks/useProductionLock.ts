/**
 * Global flag to pause inactivity logout during active production.
 * Set to true while generating images to prevent session expiry mid-job.
 */
let _producing = false;

export function setProductionLock(active: boolean) {
  _producing = active;
}

export function isProductionLocked(): boolean {
  return _producing;
}
