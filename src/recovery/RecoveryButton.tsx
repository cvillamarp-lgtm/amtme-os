import React from "react";
import { useRecoveryAgent } from "./useRecoveryAgent";

export function RecoveryButton() {
  const { incidents, isOpen, setOpen } = useRecoveryAgent();
  const activeCount = incidents.filter((x) => x.status !== "fixed" && x.status !== "ignored").length;

  return (
    <button
      type="button"
      onClick={() => setOpen(!isOpen)}
      style={{
        position: "fixed",
        right: 20,
        bottom: 20,
        width: 56,
        height: 56,
        borderRadius: 999,
        border: "none",
        cursor: "pointer",
        background: activeCount > 0 ? "#D4634A" : "#0D29C9",
        color: "white",
        zIndex: 9999,
        boxShadow: "0 12px 30px rgba(0,0,0,0.2)",
        fontWeight: 700,
        fontSize: 14,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      aria-label="Abrir Recovery Agent"
      title="Recovery Agent"
    >
      {activeCount > 0 ? activeCount : "AI"}
    </button>
  );
}
