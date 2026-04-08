/**
 * useEpisodeDraft — Persists episode creation wizard state to DB.
 *
 * Every step of the 2-step episode creation wizard is auto-saved to
 * `episode_drafts` so that data survives page refreshes and re-logins.
 *
 * Flow:
 *   1. Component mounts → loadActiveDraft() → restore last unfinished wizard
 *   2. User types idea_principal → saveDraft({ idea_principal })
 *   3. AI generates options → saveDraft({ conflict_options_json, step: 2 })
 *   4. User picks options → saveDraft({ selected_conflicto, selected_intencion })
 *   5. Episode created → markConverted(episodeId) → clears active draft
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ConflictOption {
  tipo: string;
  label: string;
  texto: string;
  ayuda: string;
}

export interface DraftState {
  id: string | null;
  idea_principal: string;
  tono: string;
  restricciones: string;
  release_date: string;
  conflict_options_json: {
    conflicto_central: ConflictOption[];
    intencion: ConflictOption[];
  } | null;
  selected_conflicto: ConflictOption | null;
  selected_intencion: ConflictOption | null;
  step: 1 | 2;
}

// Type guard for GeneratedOptions shape
const isGeneratedOptions = (
  value: unknown
): value is { conflicto_central: ConflictOption[]; intencion: ConflictOption[] } => {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    Array.isArray(obj.conflicto_central) &&
    Array.isArray(obj.intencion) &&
    (obj.conflicto_central as unknown[]).every(
      (opt) =>
        typeof opt === "object" &&
        opt !== null &&
        "tipo" in opt &&
        "label" in opt &&
        "texto" in opt &&
        "ayuda" in opt
    ) &&
    (obj.intencion as unknown[]).every(
      (opt) =>
        typeof opt === "object" &&
        opt !== null &&
        "tipo" in opt &&
        "label" in opt &&
        "texto" in opt &&
        "ayuda" in opt
    )
  );
};

const EMPTY_DRAFT: DraftState = {
  id: null,
  idea_principal: "",
  tono: "",
  restricciones: "",
  release_date: "",
  conflict_options_json: null,
  selected_conflicto: null,
  selected_intencion: null,
  step: 1,
};

export function useEpisodeDraft() {
  const [draft, setDraft] = useState<DraftState>(EMPTY_DRAFT);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Load the most recent unfinished draft from DB (restores wizard on re-open). */
  const loadActiveDraft = useCallback(async (): Promise<DraftState> => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user?.id) return EMPTY_DRAFT;

      const { data } = await supabase
        .from("episode_drafts")
        .select("*")
        .is("converted_to_episode_id", null)
        .eq("user_id", session.user.id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!data) return EMPTY_DRAFT;

      // Type guard for conflict option shape
      const isConflictOption = (value: unknown): value is ConflictOption => {
        return (
          typeof value === "object" &&
          value !== null &&
          "tipo" in value &&
          "label" in value &&
          "texto" in value &&
          "ayuda" in value
        );
      };

      const loaded: DraftState = {
        id: data.id,
        idea_principal: data.idea_principal ?? "",
        tono: data.tono ?? "",
        restricciones: data.restricciones ?? "",
        release_date: data.release_date ?? "",
        conflict_options_json: isGeneratedOptions(data.conflict_options_json)
          ? data.conflict_options_json
          : null,
        selected_conflicto: isConflictOption(data.selected_conflicto)
          ? data.selected_conflicto
          : null,
        selected_intencion: isConflictOption(data.selected_intencion)
          ? data.selected_intencion
          : null,
        step: data.step === 1 || data.step === 2 ? data.step : 1,
      };
      setDraft(loaded);
      return loaded;
    } catch {
      return EMPTY_DRAFT;
    }
  }, []);

  /** Upsert draft to DB. Debounced 800ms for text fields. */
  const saveDraft = useCallback(
    async (updates: Partial<Omit<DraftState, "id">>, options: { immediate?: boolean } = {}) => {
      const next = { ...draft, ...updates };
      setDraft(next);

      const persist = async () => {
        try {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          if (!session?.user?.id) return;

          const payload = {
            user_id: session.user.id,
            idea_principal: next.idea_principal || null,
            tono: next.tono || null,
            restricciones: next.restricciones || null,
            release_date: next.release_date || null,
            conflict_options_json: next.conflict_options_json ?? null,
            selected_conflicto: next.selected_conflicto ?? null,
            selected_intencion: next.selected_intencion ?? null,
            step: next.step,
            updated_at: new Date().toISOString(),
          };

          if (next.id) {
            await supabase.from("episode_drafts").update(payload).eq("id", next.id);
          } else {
            const { data } = await supabase
              .from("episode_drafts")
              .insert({ ...payload })
              .select("id")
              .single();
            if (data?.id) {
              setDraft((d) => ({ ...d, id: data.id }));
            }
          }
        } catch {
          // Non-blocking
        }
      };

      if (options.immediate) {
        await persist();
      } else {
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(persist, 800);
      }
    },
    [draft]
  );

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  /** Mark draft as converted after episode is created. Clears active draft. */
  const markConverted = useCallback(async (episodeId: string) => {
    setDraft((prev) => {
      if (prev.id) {
        supabase
          .from("episode_drafts")
          .update({ converted_to_episode_id: episodeId, updated_at: new Date().toISOString() })
          .eq("id", prev.id)
          .then(() => {})
          .catch(() => {});
      }
      return EMPTY_DRAFT;
    });
  }, []);

  /** Clear the current draft (user dismissed the wizard). */
  const clearDraft = useCallback(async () => {
    setDraft((prev) => {
      if (prev.id) {
        // Delete instead of keeping the abandoned draft
        supabase
          .from("episode_drafts")
          .delete()
          .eq("id", prev.id)
          .then(() => {})
          .catch(() => {});
      }
      return EMPTY_DRAFT;
    });
  }, []);

  return { draft, saveDraft, loadActiveDraft, markConverted, clearDraft };
}

/**
 * Modal UI State Persistence — Session Recovery Support
 *
 * Saves/restores modal UI state (generatingOptions, advancedOpen, manualMode)
 * to localStorage for recovery after session expiration.
 */

export interface ModalUIState {
  generatingOptions: boolean;
  advancedOpen: boolean;
  manualMode: boolean;
  manualConflicto?: string;
  manualIntencion?: string;
}

const MODAL_UI_STATE_KEY = "episode_modal_ui_state";

export function saveModalUIState(state: ModalUIState): void {
  try {
    localStorage.setItem(MODAL_UI_STATE_KEY, JSON.stringify(state));
  } catch {
    // Storage quota exceeded or disabled
  }
}

export function loadModalUIState(): ModalUIState | null {
  try {
    const saved = localStorage.getItem(MODAL_UI_STATE_KEY);
    if (!saved) return null;

    const parsed = JSON.parse(saved) as unknown;

    // Validate shape before returning
    if (typeof parsed !== "object" || parsed === null) return null;
    const obj = parsed as Record<string, unknown>;

    if (
      typeof obj.generatingOptions === "boolean" &&
      typeof obj.advancedOpen === "boolean" &&
      typeof obj.manualMode === "boolean"
    ) {
      return {
        generatingOptions: obj.generatingOptions,
        advancedOpen: obj.advancedOpen,
        manualMode: obj.manualMode,
        manualConflicto: typeof obj.manualConflicto === "string" ? obj.manualConflicto : undefined,
        manualIntencion: typeof obj.manualIntencion === "string" ? obj.manualIntencion : undefined,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function clearModalUIState(): void {
  try {
    localStorage.removeItem(MODAL_UI_STATE_KEY);
  } catch {
    // Storage access disabled
  }
}
