import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Reusable hook to get the current user ID.
 * Throws if not authenticated (for use inside mutations).
 */
export async function requireUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  return user.id;
}

/**
 * Reusable mutation hook with automatic user_id injection,
 * cache invalidation, dialog close, and toast feedback.
 */
export function useInsertMutation<T extends Record<string, unknown>>(
  table: string,
  queryKey: string[],
  options?: {
    onSuccessMessage?: string;
    onClose?: () => void;
  }
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: T) => {
      const userId = await requireUserId();
      const { error } = await supabase
        .from(table as any)
        .insert({ ...data, user_id: userId } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      options?.onClose?.();
      toast.success(options?.onSuccessMessage ?? "Guardado");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
