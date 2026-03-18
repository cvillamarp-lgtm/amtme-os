/**
 * Import Distribution Engine
 * Distributes parsed blocks to their correct tables in the database.
 */

import { supabase } from "@/integrations/supabase/client";
import type { ParsedBlock } from "./document-parser";

export interface ImportResult {
  blockId: string;
  title: string;
  destination: string;
  action: "inserted" | "merged" | "skipped" | "error";
  targetTable?: string;
  targetRecordId?: string;
  error?: string;
}

export interface ImportSummary {
  total: number;
  inserted: number;
  merged: number;
  skipped: number;
  errors: number;
  results: ImportResult[];
}

async function getUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  return user.id;
}

// Check if a knowledge block with this hash already exists
async function checkExisting(userId: string, sourceHash: string): Promise<string | null> {
  const { data } = await supabase
    .from("knowledge_blocks")
    .select("id")
    .eq("user_id", userId)
    .eq("source_hash", sourceHash)
    .maybeSingle();
  return data?.id || null;
}

// Insert or update knowledge block
async function upsertKnowledgeBlock(userId: string, block: ParsedBlock): Promise<{ id: string; action: "inserted" | "merged" }> {
  const existingId = await checkExisting(userId, block.sourceHash);

  if (existingId) {
    await supabase
      .from("knowledge_blocks")
      .update({
        content: block.content,
        structured_data: block.structuredData,
        last_synced_at: new Date().toISOString(),
        import_status: "imported",
      })
      .eq("id", existingId);
    return { id: existingId, action: "merged" };
  }

  const { data, error } = await supabase
    .from("knowledge_blocks")
    .insert({
      user_id: userId,
      source_document: "AMTME_Documento_Consolidado_2026-03-05",
      source_section: block.sourceSection,
      source_subsection: block.sourceSubsection,
      content_type: block.contentType,
      destination_module: block.destinationModule,
      title: block.title,
      content: block.content,
      structured_data: block.structuredData,
      import_status: "imported",
      source_hash: block.sourceHash,
      imported_at: new Date().toISOString(),
      last_synced_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) throw error;
  return { id: data.id, action: "inserted" };
}

// Distribute to brand_assets
async function distributeToBrand(userId: string, block: ParsedBlock): Promise<{ table: string; recordId: string }> {
  const { data, error } = await supabase
    .from("brand_assets")
    .insert({
      user_id: userId,
      type: block.contentType,
      label: block.title.substring(0, 100),
      value: block.content.substring(0, 10000),
    })
    .select("id")
    .single();

  if (error) throw error;
  return { table: "brand_assets", recordId: data.id };
}

// Distribute to resources
async function distributeToResources(userId: string, block: ParsedBlock, type: string): Promise<{ table: string; recordId: string }> {
  const { data, error } = await supabase
    .from("resources")
    .insert({
      user_id: userId,
      title: block.title.substring(0, 200),
      type,
      description: block.content.substring(0, 5000),
      status: "active",
    })
    .select("id")
    .single();

  if (error) throw error;
  return { table: "resources", recordId: data.id };
}

// Distribute pending tasks
async function distributeToTasks(userId: string, block: ParsedBlock): Promise<{ table: string; recordIds: string[] }> {
  // Extract individual tasks from the content (lines starting with • or -)
  const taskLines = block.content
    .split("\n")
    .map(l => l.trim())
    .filter(l => /^[•\-*]\s+/.test(l))
    .map(l => l.replace(/^[•\-*]\s+/, "").replace(/^\[[ x]\]\s*/i, "").trim())
    .filter(l => l.length > 5);

  const ids: string[] = [];
  for (const taskTitle of taskLines.slice(0, 20)) { // Max 20 tasks per block
    const isCompleted = block.content.includes(`[x] ${taskTitle.substring(0, 20)}`);
    const { data, error } = await supabase
      .from("tasks")
      .insert({
        user_id: userId,
        title: taskTitle.substring(0, 200),
        description: `Importado desde: ${block.sourceSection} > ${block.sourceSubsection}`,
        status: isCompleted ? "done" : "todo",
        category: "imported",
        task_type: "system",
        priority: block.contentType.includes("critico") ? "high" : "medium",
      })
      .select("id")
      .single();

    if (!error && data) ids.push(data.id);
  }

  return { table: "tasks", recordIds: ids };
}

// Main import function for a single block
async function importBlock(userId: string, block: ParsedBlock): Promise<ImportResult> {
  try {
    // Always store in knowledge_blocks for traceability
    const kb = await upsertKnowledgeBlock(userId, block);

    let targetTable: string | undefined;
    let targetRecordId: string | undefined;

    // Distribute to operational tables based on destination
    switch (block.destinationModule) {
      case "sistema_brand": {
        const result = await distributeToBrand(userId, block);
        targetTable = result.table;
        targetRecordId = result.recordId;
        break;
      }
      case "sistema_design": {
        const result = await distributeToBrand(userId, block);
        targetTable = result.table;
        targetRecordId = result.recordId;
        break;
      }
      case "resources_sop": {
        const result = await distributeToResources(userId, block, "SOP");
        targetTable = result.table;
        targetRecordId = result.recordId;
        break;
      }
      case "resources_strategy": {
        const result = await distributeToResources(userId, block, "Estrategia");
        targetTable = result.table;
        targetRecordId = result.recordId;
        break;
      }
      case "tasks": {
        const result = await distributeToTasks(userId, block);
        targetTable = result.table;
        targetRecordId = result.recordIds[0];
        break;
      }
      case "templates": {
        // Store as resource with type "Template"
        const result = await distributeToResources(userId, block, "Template");
        targetTable = result.table;
        targetRecordId = result.recordId;
        break;
      }
      case "metrics":
      case "dashboard": {
        // Store as resource with type "Métrica" — metrics table has different schema
        const result = await distributeToResources(userId, block, "Métrica");
        targetTable = result.table;
        targetRecordId = result.recordId;
        break;
      }
      // episodes handled separately via importEpisodes
      // knowledge_base stays only in knowledge_blocks
    }

    // Update knowledge block with target reference
    if (targetTable && targetRecordId) {
      await supabase
        .from("knowledge_blocks")
        .update({ target_record_id: targetRecordId, target_table: targetTable })
        .eq("id", kb.id);
    }

    return {
      blockId: block.id,
      title: block.title,
      destination: block.destinationModule,
      action: kb.action,
      targetTable,
      targetRecordId,
    };
  } catch (error) {
    return {
      blockId: block.id,
      title: block.title,
      destination: block.destinationModule,
      action: "error",
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}

// Import episodes from catalog data
export async function importEpisodes(episodes: Array<{
  number: string;
  title: string;
  titleOriginal?: string;
  releaseDate?: string;
  streams?: number;
  level?: string;
  topics?: string;
}>): Promise<ImportResult[]> {
  const userId = await getUserId();
  const results: ImportResult[] = [];

  for (const ep of episodes) {
    try {
      // Check if episode with this number already exists
      const { data: existing } = await supabase
        .from("episodes")
        .select("id, title")
        .eq("user_id", userId)
        .eq("number", ep.number)
        .maybeSingle();

      if (existing) {
        // Update existing episode with catalog data
        await supabase
          .from("episodes")
          .update({
            titulo_original: ep.titleOriginal || null,
            release_date: ep.releaseDate || null,
            streams_total: ep.streams || 0,
            nivel_completitud: ep.level || null,
            generation_metadata: {
              source_type: "imported",
              source_module: "master_document",
              imported_at: new Date().toISOString(),
            },
          })
          .eq("id", existing.id);

        results.push({
          blockId: `ep-${ep.number}`,
          title: `Ep. ${ep.number} — ${ep.title}`,
          destination: "episodes",
          action: "merged",
          targetTable: "episodes",
          targetRecordId: existing.id,
        });
      } else {
        // Create new episode
        const { data, error } = await supabase
          .from("episodes")
          .insert({
            user_id: userId,
            title: ep.title,
            number: ep.number,
            working_title: `Ep. ${ep.number} — ${ep.title}`,
            titulo_original: ep.titleOriginal || null,
            release_date: ep.releaseDate || null,
            streams_total: ep.streams || 0,
            nivel_completitud: ep.level || null,
            status: "draft",
            estado_produccion: "imported",
            generation_metadata: {
              source_type: "imported",
              source_module: "master_document",
              imported_at: new Date().toISOString(),
            },
          })
          .select("id")
          .single();

        if (error) throw error;

        results.push({
          blockId: `ep-${ep.number}`,
          title: `Ep. ${ep.number} — ${ep.title}`,
          destination: "episodes",
          action: "inserted",
          targetTable: "episodes",
          targetRecordId: data.id,
        });
      }
    } catch (error) {
      results.push({
        blockId: `ep-${ep.number}`,
        title: `Ep. ${ep.number} — ${ep.title}`,
        destination: "episodes",
        action: "error",
        error: error instanceof Error ? error.message : "Error desconocido",
      });
    }
  }

  return results;
}

// Main import function
export async function executeImport(
  blocks: ParsedBlock[],
  onProgress?: (current: number, total: number) => void
): Promise<ImportSummary> {
  const userId = await getUserId();

  // Filter out episode blocks (they're handled separately)
  const nonEpisodeBlocks = blocks.filter(b => b.destinationModule !== "episodes" || !b.contentType.includes("catalog"));

  const results: ImportResult[] = [];
  const total = nonEpisodeBlocks.length;

  for (let i = 0; i < nonEpisodeBlocks.length; i++) {
    const result = await importBlock(userId, nonEpisodeBlocks[i]);
    results.push(result);
    onProgress?.(i + 1, total);
  }

  return {
    total: results.length,
    inserted: results.filter(r => r.action === "inserted").length,
    merged: results.filter(r => r.action === "merged").length,
    skipped: results.filter(r => r.action === "skipped").length,
    errors: results.filter(r => r.action === "error").length,
    results,
  };
}
