import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { EpisodeWithVisual, KeyPhrase, VisualStatus } from "@/lib/visual-os/types";

// ─── Episode list with piece progress ────────────────────────────────────────

export function useVisualEpisodes() {
  return useQuery({
    queryKey: ["vos_episodes"],
    queryFn:  async () => {
      const { data, error } = await supabase
        .from("episodes")
        .select(`
          id, number, title, thesis_central, visual_notes,
          visual_status, status, release_date, created_at, updated_at
        `)
        .order("number", { ascending: false });
      if (error) throw error;

      // For each episode, count pieces
      const eps = (data ?? []) as EpisodeWithVisual[];
      if (eps.length === 0) return eps;

      const ids = eps.map(e => e.id);
      const { data: pieceCounts } = await supabase
        .from("visual_pieces")
        .select("episode_id, piece_status")
        .in("episode_id", ids);

      const countsMap: Record<string, { total: number; done: number }> = {};
      for (const p of pieceCounts ?? []) {
        if (!countsMap[p.episode_id]) countsMap[p.episode_id] = { total: 0, done: 0 };
        countsMap[p.episode_id].total++;
        if (["aprobado","exportado","publicado"].includes(p.piece_status)) {
          countsMap[p.episode_id].done++;
        }
      }
      return eps.map(e => ({
        ...e,
        pieces_total: countsMap[e.id]?.total ?? 0,
        pieces_done:  countsMap[e.id]?.done  ?? 0,
      }));
    },
  });
}

// ─── Single episode ───────────────────────────────────────────────────────────

export function useVisualEpisode(id: string | undefined) {
  return useQuery({
    queryKey: ["vos_episode", id],
    enabled:  !!id,
    queryFn:  async () => {
      const { data, error } = await supabase
        .from("episodes")
        .select(`
          id, number, title, thesis_central, visual_notes,
          visual_status, status, release_date, created_at, updated_at
        `)
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data as EpisodeWithVisual;
    },
  });
}

// ─── Key phrases ──────────────────────────────────────────────────────────────

export function useKeyPhrases(episodeId: string | undefined) {
  return useQuery({
    queryKey: ["vos_keyphrases", episodeId],
    enabled:  !!episodeId,
    queryFn:  async () => {
      const { data, error } = await supabase
        .from("episode_key_phrases")
        .select("*")
        .eq("episode_id", episodeId!)
        .order("order_index");
      if (error) throw error;
      return (data ?? []) as KeyPhrase[];
    },
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useUpdateEpisodeVisual() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      id:             string;
      thesis_central?: string;
      visual_notes?:   string;
      visual_status?:  VisualStatus;
    }) => {
      const { id, ...rest } = payload;
      const { error } = await supabase
        .from("episodes")
        .update({ ...rest, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["vos_episodes"] });
      qc.invalidateQueries({ queryKey: ["vos_episode", vars.id] });
    },
  });
}

export function useSaveKeyPhrases() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      episodeId, phrases,
    }: { episodeId: string; phrases: string[] }) => {
      // Replace all phrases for this episode
      await supabase.from("episode_key_phrases").delete().eq("episode_id", episodeId);
      if (phrases.filter(p => p.trim()).length > 0) {
        const rows = phrases
          .filter(p => p.trim())
          .map((phrase, i) => ({ episode_id: episodeId, phrase, order_index: i }));
        const { error } = await supabase.from("episode_key_phrases").insert(rows);
        if (error) throw error;
      }
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["vos_keyphrases", vars.episodeId] });
    },
  });
}
