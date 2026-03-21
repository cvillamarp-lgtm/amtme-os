import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type {
  VisualPieceRow, CopyBlock, PieceStatus, PieceVersion, ExportRecord, ChangeLogEntry,
} from "@/lib/visual-os/types";
import { buildFileName } from "@/lib/visual-os/palette";
import type { VOSValidationResult } from "@/lib/visual-os/validator";
import { seedCopyBlock, type EpisodeContext } from "@/lib/visual-os/copySeeder";

// ─── Pieces for an episode ────────────────────────────────────────────────────

export function useEpisodePieces(episodeId: string | undefined) {
  return useQuery({
    queryKey: ["vos_pieces", episodeId],
    enabled:  !!episodeId,
    queryFn:  async () => {
      const { data, error } = await supabase
        .from("visual_pieces")
        .select(`
          *,
          template:visual_templates(*)
        `)
        .eq("episode_id", episodeId!)
        .order("created_at");
      if (error) throw error;
      return (data ?? []) as VisualPieceRow[];
    },
  });
}

// ─── Single piece + copy blocks ───────────────────────────────────────────────

export function useVisualPiece(pieceId: string | undefined) {
  return useQuery({
    queryKey: ["vos_piece", pieceId],
    enabled:  !!pieceId,
    queryFn:  async () => {
      const { data, error } = await supabase
        .from("visual_pieces")
        .select(`*, template:visual_templates(*)`)
        .eq("id", pieceId!)
        .single();
      if (error) throw error;
      return data as VisualPieceRow;
    },
  });
}

export function usePieceCopyBlocks(pieceId: string | undefined) {
  return useQuery({
    queryKey: ["vos_copy", pieceId],
    enabled:  !!pieceId,
    queryFn:  async () => {
      const { data, error } = await supabase
        .from("piece_copy_blocks")
        .select("*")
        .eq("piece_id", pieceId!)
        .order("order_index");
      if (error) throw error;
      return (data ?? []) as CopyBlock[];
    },
  });
}

// ─── Versions ─────────────────────────────────────────────────────────────────

export function usePieceVersions(pieceId: string | undefined) {
  return useQuery({
    queryKey: ["vos_versions", pieceId],
    enabled:  !!pieceId,
    queryFn:  async () => {
      const { data, error } = await supabase
        .from("piece_versions")
        .select("*")
        .eq("piece_id", pieceId!)
        .order("version_number", { ascending: false });
      if (error) throw error;
      return (data ?? []) as PieceVersion[];
    },
  });
}

// ─── Exports ──────────────────────────────────────────────────────────────────

export function usePieceExports(pieceId: string | undefined) {
  return useQuery({
    queryKey: ["vos_exports", pieceId],
    enabled:  !!pieceId,
    queryFn:  async () => {
      // join piece_versions → exports
      const { data: versions } = await supabase
        .from("piece_versions")
        .select("id")
        .eq("piece_id", pieceId!);
      const versionIds = (versions ?? []).map(v => v.id);
      if (!versionIds.length) return [];
      const { data, error } = await supabase
        .from("exports")
        .select("*")
        .in("piece_version_id", versionIds)
        .order("exported_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ExportRecord[];
    },
  });
}

// ─── Change log ───────────────────────────────────────────────────────────────

export function usePieceChangeLog(pieceId: string | undefined) {
  return useQuery({
    queryKey: ["vos_changelog", pieceId],
    enabled:  !!pieceId,
    queryFn:  async () => {
      const { data, error } = await supabase
        .from("change_log")
        .select("*")
        .eq("entity_type", "visual_piece")
        .eq("entity_id", pieceId!)
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data ?? []) as ChangeLogEntry[];
    },
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

/** Initialize all 15 pieces for an episode from the templates, pre-filling copy with episode data. */
export function useInitEpisodePieces() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      episodeId,
      templates,
      episodeCtx,
    }: {
      episodeId:   string;
      templates:   { id: string; piece_code: string }[];
      episodeCtx?: EpisodeContext;
    }) => {
      // Check existing
      const { data: existing } = await supabase
        .from("visual_pieces")
        .select("template_id")
        .eq("episode_id", episodeId);
      const existingTemplateIds = new Set((existing ?? []).map(p => p.template_id));

      const toCreate = templates.filter(t => !existingTemplateIds.has(t.id));
      if (!toCreate.length) return;

      const { data: pieces, error } = await supabase
        .from("visual_pieces")
        .insert(toCreate.map(t => ({
          episode_id:  episodeId,
          template_id: t.id,
          piece_status: "borrador",
        })))
        .select();
      if (error) throw error;

      // For each piece, initialize copy blocks — pre-filled from episode context
      for (const piece of (pieces ?? [])) {
        const tpl = toCreate.find(t => t.id === piece.template_id);
        const { data: rules } = await supabase
          .from("visual_template_rules")
          .select("*")
          .eq("template_id", piece.template_id)
          .eq("rule_type", "copy_block")
          .order("order_index");
        if (!rules?.length) continue;

        const copyRows = (rules ?? []).map(r => ({
          piece_id:    piece.id,
          block_name:  r.rule_key,
          // Seed from episode data if available, else fall back to template default
          block_value: episodeCtx
            ? (seedCopyBlock(r.rule_key, tpl?.piece_code ?? "", episodeCtx)
               || (r.rule_value_json as any)?.default
               || "")
            : ((r.rule_value_json as any)?.default ?? ""),
          is_fixed:    false,
          order_index: r.order_index,
        }));
        await supabase.from("piece_copy_blocks").insert(copyRows);
      }
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["vos_pieces", vars.episodeId] });
    },
  });
}

/**
 * Re-seed copy blocks for an already-initialized piece using fresh episode data.
 * Useful when the episode's thesis or key phrases are edited after initialization.
 */
export function useReseedPieceCopy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      pieceId,
      pieceCode,
      episodeCtx,
    }: {
      pieceId:    string;
      pieceCode:  string;
      episodeCtx: EpisodeContext;
    }) => {
      // Load existing blocks
      const { data: blocks } = await supabase
        .from("piece_copy_blocks")
        .select("id, block_name")
        .eq("piece_id", pieceId);
      if (!blocks?.length) return;

      // Update each block with seeded value (skip if seeder returns "")
      for (const b of blocks) {
        const seeded = seedCopyBlock(b.block_name, pieceCode, episodeCtx);
        if (!seeded) continue;
        await supabase
          .from("piece_copy_blocks")
          .update({ block_value: seeded, updated_at: new Date().toISOString() })
          .eq("id", b.id);
      }
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["vos_copy", vars.pieceId] });
    },
  });
}

/** Save copy block changes + create a new version snapshot. */
export function useSavePieceCopy() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      pieceId,
      blocks,
      changeReason,
      validationResult,
    }: {
      pieceId:          string;
      blocks:           Pick<CopyBlock, "id" | "block_name" | "block_value">[];
      changeReason?:    string;
      validationResult?: VOSValidationResult;
    }) => {
      // 1. Upsert copy blocks
      for (const b of blocks) {
        await supabase
          .from("piece_copy_blocks")
          .update({ block_value: b.block_value, updated_at: new Date().toISOString() })
          .eq("id", b.id);
      }

      // 2. Get next version number
      const { data: existing } = await supabase
        .from("piece_versions")
        .select("version_number")
        .eq("piece_id", pieceId)
        .order("version_number", { ascending: false })
        .limit(1);
      const nextVersion = ((existing?.[0]?.version_number) ?? 0) + 1;

      // 3. Create version snapshot
      const payload: Record<string, string> = {};
      for (const b of blocks) payload[b.block_name] = b.block_value;

      const { data: version, error } = await supabase
        .from("piece_versions")
        .insert({
          piece_id:         pieceId,
          version_number:   nextVersion,
          payload_json:     payload,
          validation_score: validationResult?.score ?? 0,
          change_reason:    changeReason ?? null,
          created_by:       user?.id ?? null,
        })
        .select()
        .single();
      if (error) throw error;

      // 4. Update piece with current_version_id + score
      await supabase
        .from("visual_pieces")
        .update({
          current_version_id: version.id,
          validation_score:   validationResult?.score ?? 0,
          updated_at:         new Date().toISOString(),
        })
        .eq("id", pieceId);

      // 5. Log change
      await supabase.from("change_log").insert({
        entity_type:    "visual_piece",
        entity_id:      pieceId,
        action_type:    "update",
        changed_by:     user?.id ?? null,
        change_summary: changeReason ?? `Versión ${nextVersion} guardada`,
      });

      return version;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["vos_copy",     vars.pieceId] });
      qc.invalidateQueries({ queryKey: ["vos_versions", vars.pieceId] });
      qc.invalidateQueries({ queryKey: ["vos_piece",    vars.pieceId] });
    },
  });
}

/** Update piece status (approval workflow). */
export function useUpdatePieceStatus() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      pieceId, episodeId: _episodeId, status,
    }: { pieceId: string; episodeId: string; status: PieceStatus }) => {
      const update: Record<string, unknown> = {
        piece_status: status,
        updated_at:   new Date().toISOString(),
      };
      if (status === "aprobado") update.approved_by = user?.id ?? null;

      await supabase.from("visual_pieces").update(update).eq("id", pieceId);
      await supabase.from("change_log").insert({
        entity_type:    "visual_piece",
        entity_id:      pieceId,
        action_type:    "status_change",
        changed_by:     user?.id ?? null,
        change_summary: `Estado cambiado a: ${status}`,
      });
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["vos_piece",   vars.pieceId] });
      qc.invalidateQueries({ queryKey: ["vos_pieces",  vars.episodeId] });
      qc.invalidateQueries({ queryKey: ["vos_changelog",vars.pieceId] });
    },
  });
}

/** Record an export. */
export function useRecordExport() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      pieceId, versionId, episodeNumber, pieceCode, exportType, isFinal,
    }: {
      pieceId:       string;
      versionId:     string;
      episodeNumber: string;
      pieceCode:     string;
      exportType:    "png" | "jpg" | "json";
      isFinal:       boolean;
    }) => {
      const fileName = buildFileName(episodeNumber, pieceCode, exportType);
      await supabase.from("exports").insert({
        piece_version_id: versionId,
        export_type:      exportType,
        file_name:        fileName,
        is_final:         isFinal,
        exported_by:      user?.id ?? null,
      });
      if (isFinal) {
        await supabase
          .from("visual_pieces")
          .update({ piece_status: "exportado", updated_at: new Date().toISOString() })
          .eq("id", pieceId);
      }
      await supabase.from("change_log").insert({
        entity_type:    "visual_piece",
        entity_id:      pieceId,
        action_type:    "export",
        changed_by:     user?.id ?? null,
        change_summary: `Exportado: ${fileName}`,
      });
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["vos_exports",   vars.pieceId] });
      qc.invalidateQueries({ queryKey: ["vos_piece",     vars.pieceId] });
      qc.invalidateQueries({ queryKey: ["vos_changelog", vars.pieceId] });
    },
  });
}

/** Restore a previous version. */
export function useRestoreVersion() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      pieceId, version,
    }: { pieceId: string; version: PieceVersion }) => {
      // Update each copy block from the snapshot
      const payload = version.payload_json as Record<string, string>;
      for (const [blockName, value] of Object.entries(payload)) {
        await supabase
          .from("piece_copy_blocks")
          .update({ block_value: value, updated_at: new Date().toISOString() })
          .eq("piece_id", pieceId)
          .eq("block_name", blockName);
      }
      // Mark version as current
      await supabase
        .from("visual_pieces")
        .update({ current_version_id: version.id, updated_at: new Date().toISOString() })
        .eq("id", pieceId);
      // Log
      await supabase.from("change_log").insert({
        entity_type:    "visual_piece",
        entity_id:      pieceId,
        action_type:    "restore",
        changed_by:     user?.id ?? null,
        change_summary: `Restaurado a versión ${version.version_number}`,
      });
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["vos_copy",      vars.pieceId] });
      qc.invalidateQueries({ queryKey: ["vos_piece",     vars.pieceId] });
      qc.invalidateQueries({ queryKey: ["vos_changelog", vars.pieceId] });
    },
  });
}
