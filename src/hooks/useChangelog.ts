/**
 * useChangelog — Audit trail for all record changes.
 *
 * Records every meaningful change to the `change_history` table with:
 * - who changed it (user_id from auth session)
 * - which table + record
 * - which field
 * - old value / new value
 * - origin: 'manual' | 'ai' | 'system' | 'import'
 *
 * Usage:
 *   const { logChange, logChanges } = useChangelog();
 *   await logChange({ tableName: "episodes", recordId: ep.id, fieldName: "hook",
 *                     oldValue: ep.hook, newValue: newHook, origin: "manual" });
 */

import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ChangeOrigin = "manual" | "ai" | "system" | "import";

export interface ChangeEntry {
  tableName: string;
  recordId: string;
  fieldName: string;
  oldValue?: string | null | undefined;
  newValue?: string | null | undefined;
  origin?: ChangeOrigin;
}

export function useChangelog() {
  /**
   * Log a single field change.
   * Silently skips if old === new (no actual change).
   */
  const logChange = useCallback(async (entry: ChangeEntry) => {
    const oldStr = entry.oldValue == null ? null : String(entry.oldValue);
    const newStr = entry.newValue == null ? null : String(entry.newValue);

    // Skip if no real change
    if (oldStr === newStr) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return;

      await supabase.from("change_history").insert({
        user_id: session.user.id,
        table_name: entry.tableName,
        record_id: entry.recordId,
        field_name: entry.fieldName,
        old_value: oldStr,
        new_value: newStr,
        change_origin: entry.origin ?? "manual",
      });
    } catch {
      // Non-blocking: audit failures must never break the main flow
    }
  }, []);

  /**
   * Log multiple field changes from an update object.
   * Compares updates against the existing record and logs only real diffs.
   *
   * @param tableName - DB table name
   * @param recordId  - UUID of the record
   * @param existing  - current record (before update)
   * @param updates   - fields being updated
   * @param origin    - change origin
   */
  const logChanges = useCallback(
    async (
      tableName: string,
      recordId: string,
      existing: Record<string, unknown>,
      updates: Record<string, unknown>,
      origin: ChangeOrigin = "manual"
    ) => {
      const entries: ChangeEntry[] = [];

      for (const [field, newVal] of Object.entries(updates)) {
        const oldVal = existing[field];
        const oldStr = oldVal == null ? null : String(oldVal);
        const newStr = newVal == null ? null : String(newVal);
        if (oldStr !== newStr) {
          entries.push({ tableName, recordId, fieldName: field, oldValue: oldStr, newValue: newStr, origin });
        }
      }

      if (entries.length === 0) return;

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.id) return;

        await supabase.from("change_history").insert(
          entries.map((e) => ({
            user_id: session.user.id,
            table_name: e.tableName,
            record_id: e.recordId,
            field_name: e.fieldName,
            old_value: e.oldValue ?? null,
            new_value: e.newValue ?? null,
            change_origin: e.origin ?? "manual",
          }))
        );
      } catch {
        // Non-blocking
      }
    },
    []
  );

  /**
   * Fetch change history for a specific record.
   */
  const getHistory = useCallback(
    async (tableName: string, recordId: string, limit = 50) => {
      const { data } = await supabase
        .from("change_history")
        .select("*")
        .eq("table_name", tableName)
        .eq("record_id", recordId)
        .order("changed_at", { ascending: false })
        .limit(limit);
      return data ?? [];
    },
    []
  );

  return { logChange, logChanges, getHistory };
}
