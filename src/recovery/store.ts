import type { RecoveryIncident } from "./types";

type Listener = () => void;

class RecoveryStore {
  private incidents: RecoveryIncident[] = [];
  private listeners = new Set<Listener>();
  private isOpen = false;

  subscribe = (listener: Listener) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getState = () => ({
    incidents: this.incidents,
    isOpen: this.isOpen,
  });

  setOpen = (value: boolean) => {
    this.isOpen = value;
    this.emit();
  };

  addIncident = (incident: RecoveryIncident) => {
    const existing = this.incidents.find((x) => x.fingerprint === incident.fingerprint);
    if (existing) {
      existing.updatedAt = new Date().toISOString();
      if (existing.status === "fixed" || existing.status === "ignored") {
        existing.status = "detected";
      }
      this.emit();
      return existing;
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
    this.listeners.forEach((listener) => listener());
  }
}

export const recoveryStore = new RecoveryStore();
