/**
 * Modal Recovery Hook
 * FASE 4: Skill - Modal State Persistence & Recovery
 *
 * Persists modal state (form data, UI state) to localStorage.
 * Automatically restores on session recovery or page reload.
 */

import { useEffect, useCallback } from 'react';

export interface ModalState {
  isOpen: boolean;
  formData: Record<string, any>;
  uiState: {
    activeStep?: number;
    expandedSections?: string[];
    generatingOptions?: boolean;
    advancedOpen?: boolean;
    manualMode?: boolean;
  };
  lastModified: string;
}

export function useModalRecovery(
  modalKey: string,
  onRestore?: (state: ModalState) => void,
) {
  const storageKey = `modal_state_${modalKey}`;

  const saveState = useCallback(
    (state: Partial<ModalState>) => {
      const current = loadState();
      const updated: ModalState = {
        isOpen: current?.isOpen ?? state.isOpen ?? false,
        formData: { ...current?.formData, ...state.formData },
        uiState: { ...current?.uiState, ...state.uiState },
        lastModified: new Date().toISOString(),
      };
      localStorage.setItem(storageKey, JSON.stringify(updated));
      return updated;
    },
    [storageKey],
  );

  const loadState = (): ModalState | null => {
    const stored = localStorage.getItem(storageKey);
    if (!stored) return null;

    try {
      return JSON.parse(stored) as ModalState;
    } catch {
      return null;
    }
  };

  const clearState = useCallback(() => {
    localStorage.removeItem(storageKey);
  }, [storageKey]);

  // Auto-restore on mount
  useEffect(() => {
    const saved = loadState();
    if (saved && saved.isOpen) {
      onRestore?.(saved);
    }
  }, [onRestore, storageKey]);

  return {
    saveState,
    loadState,
    clearState,
  };
}
