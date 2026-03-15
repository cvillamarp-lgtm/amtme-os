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

import { useState, useCallback, useRef } from "react";
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
  conflict_options_json: { conflicto_central: ConflictOption[]; intencion: ConflictOption[] } | null;
  selected_conflicto: ConflictOption | null;
  selected_intencion: ConflictOption | null;
  step: 1 | 2;
}

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
      const { data: { session } } = await supabase.auth.getSession();
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

      const loaded: DraftState = {
        id: data.id,
        idea_principal: data.idea_principal ?? "",
        tono: data.tono ?? "",
        restricciones: data.restricciones ?? "",
        release_date: data.release_date ?? "",
        conflict_options_json: (data.conflict_options_json as any) ?? null,
        selected_conflicto: (data.selected_conflicto as any) ?? null,
        selected_intencion: (data.selected_intencion as any) ?? null,
        step: (data.step as 1 | 2) ?? 1,
      };
      setDraft(loaded);
      return loaded;
    } catch {
      return EMPTY_DRAFT;
    }
  }, []);

  /** Upsert draft to DB. Debounced 800ms for text fields. */
  const saveDraft = useCallback(
    async (
      updates: Partial<Omit<DraftState, "id">>,
      options: { immediate?: boolean } = {}
    ) => {
      setDraft((prev) => {
        const next = { ...prev, ...updates };

        const persist = async () => {
          try {
            const { data: { session } } = await supabase.auth.getSession();
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
              await supabase
                .from("episode_drafts")
                .update(payload)
                .eq("id", next.id);
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
          persist();
        } else {
          if (saveTimer.current) clearTimeout(saveTimer.current);
          saveTimer.current = setTimeout(persist, 800);
        }

        return next;
      });
    },
    []
  );

  /** Mark draft as converted after episode is created. Clears active draft. */
  const markConverted = useCallback(async (episodeId: string) => {
    setDraft((prev) => {
      if (prev.id) {
        supabase
          .from("episode_drafts")
          .update({ converted_to_episode_id: episodeId, updated_at: new Date().toISOString() })
          .eq("id", prev.id)
          .then(() => {});
      }
      return EMPTY_DRAFT;
    });
  }, []);

  /** Clear the current draft (user dismissed the wizard). */
  const clearDraft = useCallback(async () => {
    setDraft((prev) => {
      if (prev.id) {
        // Delete instead of keeping the abandoned draft
        supabase.from("episode_drafts").delete().eq("id", prev.id).then(() => {});
      }
      return EMPTY_DRAFT;
    });
  }, []);

  return { draft, saveDraft, loadActiveDraft, markConverted, clearDraft };
}
