import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { isAuthError, showEdgeFunctionError } from "@/services/functions/edgeFunctionErrors";

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
      const tableClient = supabase.from(table as never) as unknown as {
        insert: (values: T & { user_id: string }) => Promise<{ error: { message: string } | null }>;
      };
      const { error } = await tableClient.insert({ ...data, user_id: userId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      options?.onClose?.();
      toast.success(options?.onSuccessMessage ?? "Guardado");
    },
    onError: (e: Error) => {
      if (isAuthError(e)) {
        showEdgeFunctionError(e);
        return;
      }
      toast.error(e.message);
    },
  });
}
