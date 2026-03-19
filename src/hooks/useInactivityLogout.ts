import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { isProductionLocked } from "./useProductionLock";

const TIMEOUT_MS = 2 * 60 * 1000;       // 2 min → sign out
const WARNING_MS = TIMEOUT_MS - 20_000; // 1:40 → warn user

const ACTIVITY_EVENTS = [
  "mousemove", "mousedown", "keydown",
  "touchstart", "scroll", "visibilitychange",
] as const;

export function useInactivityLogout() {
  const navigate = useNavigate();
  const logoutTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warnTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warnToastId = useRef<string | number | null>(null);

  useEffect(() => {
    const clearTimers = () => {
      if (logoutTimer.current) clearTimeout(logoutTimer.current);
      if (warnTimer.current) clearTimeout(warnTimer.current);
    };

    const dismissWarning = () => {
      if (warnToastId.current !== null) {
        toast.dismiss(warnToastId.current);
        warnToastId.current = null;
      }
    };

    const scheduleLogout = () => {
      clearTimers();
      dismissWarning();

      warnTimer.current = setTimeout(() => {
        warnToastId.current = toast.warning(
          "Cerrando sesión en 20 segundos por inactividad",
          { duration: 20_000 },
        );
      }, WARNING_MS);

      logoutTimer.current = setTimeout(async () => {
        if (isProductionLocked()) {
          // Production in progress — reschedule instead of signing out
          scheduleLogout();
          return;
        }
        dismissWarning();
        await supabase.auth.signOut();
        navigate("/auth", { replace: true });
        toast.info("Sesión cerrada por inactividad");
      }, TIMEOUT_MS);
    };

    const onActivity = () => scheduleLogout();

    // Start on mount
    scheduleLogout();

    for (const ev of ACTIVITY_EVENTS) {
      window.addEventListener(ev, onActivity, { passive: true });
    }

    return () => {
      clearTimers();
      dismissWarning();
      for (const ev of ACTIVITY_EVENTS) {
        window.removeEventListener(ev, onActivity);
      }
    };
  }, [navigate]);
}
