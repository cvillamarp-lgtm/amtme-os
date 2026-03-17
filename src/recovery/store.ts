import type { RecoveryIncident } from "./types";

type Listener = () => void;

class RecoveryStore {
  private incidents: RecoveryIncident[] = [];
  private listeners = new Set<Listener>();
  private isOpen = false;
  private _snapshot = { incidents: this.incidents, isOpen: this.isOpen };

  subscribe = (listener: Listener) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getState = () => this._snapshot;

  setOpen = (value: boolean) => {
    this.isOpen = value;
    this.emit();
  };

  addIncident = (incident: RecoveryIncident) => {
    const existingIdx = this.incidents.findIndex((x) => x.fingerprint === incident.fingerprint);
    if (existingIdx !== -1) {
      const existing = this.incidents[existingIdx];
      const updated = {
        ...existing,
        updatedAt: new Date().toISOString(),
        status: (existing.status === "fixed" || existing.status === "ignored")
          ? ("detected" as const)
          : existing.status,
      };
      this.incidents = [...this.incidents];
      this.incidents[existingIdx] = updated;
      this.emit();
      return updated;
    }

    this.incidents = [incident, ...this.incidents].slice(0, 50);
    this.emit();
    return incident;
  };

  updateIncident = (id: string, patch: Partial<RecoveryIncident>) => {
    this.incidents = this.incidents.map((x) =>
      x.id === id ? { ...x, ...patch, updatedAt: new Date().toISOString() } : x
    );
    this.emit();
  };

  appendAction = (id: string, action: RecoveryIncident["executedActions"][number]) => {
    this.incidents = this.incidents.map((x) =>
      x.id === id
        ? {
            ...x,
            executedActions: [...x.executedActions, action],
            updatedAt: new Date().toISOString(),
          }
        : x
    );
    this.emit();
  };

  dismissIncident = (id: string) => {
    this.updateIncident(id, { status: "ignored" });
  };

  clearFixed = () => {
    this.incidents = this.incidents.filter((x) => x.status !== "fixed" && x.status !== "ignored");
    this.emit();
  };

  private emit() {
    this._snapshot = { incidents: this.incidents, isOpen: this.isOpen };
    this.listeners.forEach((listener) => listener());
  }
}

export const recoveryStore = new RecoveryStore();
