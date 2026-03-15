import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useKnowledgeDocs(docType?: string) {
  return useQuery({
    queryKey: ["knowledge-docs", docType ?? "all"],
    queryFn: async () => {
      let q = (supabase as any)
        .from("knowledge_docs")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false });
      if (docType) q = q.eq("doc_type", docType);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });
}

export function useCreateKnowledgeDoc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data, error } = await supabase
        .from("knowledge_docs" as any)
        .insert(payload)
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["knowledge-docs"] }),
  });
}

export function useUpdateKnowledgeDoc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { error } = await supabase
        .from("knowledge_docs" as any)
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["knowledge-docs"] }),
  });
}

export function useArchiveKnowledgeDoc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("knowledge_docs" as any)
        .update({ status: "archived", updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["knowledge-docs"] }),
  });
}
