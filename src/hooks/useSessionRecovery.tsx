import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface PendingAction {
  name: string;
  execute: () => Promise<unknown>;
  onError?: (error: Error) => void;
}

// Session recovery context hook for modal state persistence during auth errors

export function useSessionRecovery() {
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [recovering, setRecovering] = useState(false);
  const [showLoginRequired, setShowLoginRequired] = useState(false);

  const handleAuthError = async (action: PendingAction) => {
    setPending(action);
    setRecovering(true);

    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error || !data.session) {
        setShowLoginRequired(true);
        return;
      }

      await action.execute();
      setPending(null);
      setRecovering(false);
    } catch (e) {
      setShowLoginRequired(true);
      action.onError?.(e as Error);
    }
  };

  const retryAfterLogin = async () => {
    if (!pending) return;
    try {
      await pending.execute();
      setPending(null);
      setShowLoginRequired(false);
    } catch (e) {
      pending.onError?.(e as Error);
    }
  };

  const clearRecoveryState = () => {
    setPending(null);
    setRecovering(false);
    setShowLoginRequired(false);
  };

  return {
    pending,
    recovering,
    showLoginRequired,
    handleAuthError,
    retryAfterLogin,
    clearRecoveryState,
  };
}
