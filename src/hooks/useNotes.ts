import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Note {
  id: string;
  user_id: string;
  title: string;
  body: string;
  pinned: boolean;
  tags: string[];
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export type NotePreview = Pick<Note, "id" | "title" | "body" | "pinned" | "updated_at" | "created_at">;

const QUERY_KEY = "notes";

export function useNotes(search?: string) {
  return useQuery({
    queryKey: [QUERY_KEY, search ?? ""],
    queryFn: async () => {
      let q = supabase
        .from("notes")
        .select("id, title, body, pinned, updated_at, created_at")
        .is("archived_at", null)
        .order("pinned", { ascending: false })
        .order("updated_at", { ascending: false });

      if (search?.trim()) {
        q = q.or(`title.ilike.%${search.trim()}%,body.ilike.%${search.trim()}%`);
      }

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as NotePreview[];
    },
    staleTime: 30_000,
  });
}

export function useCreateNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<Note> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");
      const { data, error } = await supabase
        .from("notes")
        .insert({ user_id: user.id, title: "", body: "" })
        .select()
        .single();
      if (error) throw error;
      return data as Note;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }),
  });
}

export function useUpdateNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, title, body }: { id: string; title: string; body: string }) => {
      const { error } = await supabase
        .from("notes")
        .update({ title, body })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }),
  });
}

export function useDeleteNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("notes")
        .update({ archived_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }),
  });
}

export function usePinNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, pinned }: { id: string; pinned: boolean }) => {
      const { error } = await supabase.from("notes").update({ pinned }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }),
  });
}
