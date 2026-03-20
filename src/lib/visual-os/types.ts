/**
 * AMTME Visual OS — TypeScript types
 * Mirrors the Supabase schema created in 20260319000002_visual_os_schema.sql
 */

// ─── Brand / System ───────────────────────────────────────────────────────────

export interface BrandToken {
  id:         string;
  token_type: "color" | "typography" | "rule";
  token_name: string;
  token_value: string;
  label?:     string;
  is_active:  boolean;
}

export interface HostAsset {
  id:         string;
  label:      string;
  asset_url:  string;
  asset_type: "photo" | "illustration" | "logo";
  is_primary: boolean;
}

// ─── Template ─────────────────────────────────────────────────────────────────

export type PieceFormat = "1:1" | "4:5" | "9:16";

export type PieceCode =
  "P01"|"P02"|"P03"|"P04"|"P05"|"P06"|"P07"|"P08"
 |"P09"|"P10"|"P11"|"P12"|"P13"|"P14"|"P15";

export interface VisualTemplate {
  id:                string;
  piece_code:        PieceCode;
  piece_name:        string;
  width_px:          number;
  height_px:         number;
  format:            PieceFormat;
  safe_zone_top:     number;
  safe_zone_right:   number;
  safe_zone_bottom:  number;
  safe_zone_left:    number;
  production_order:  number;
  background_color:  string;
  composition_notes: string | null;
  is_active:         boolean;
}

export interface TemplateCopyBlockDef {
  rule_key:        string;   // block_name
  label:           string;
  default_value:   string;
  max_chars:       number;
  is_required:     boolean;
  order_index:     number;
}

// ─── Episode ──────────────────────────────────────────────────────────────────

export type VisualStatus = "sin_iniciar" | "en_produccion" | "en_revision" | "completado";

export interface EpisodeWithVisual {
  id:             string;
  number:         string | null;
  title:          string;
  thesis_central: string | null;
  visual_notes:   string | null;
  visual_status:  VisualStatus | null;
  status:         string | null;
  release_date:   string | null;
  created_at:     string;
  updated_at:     string;
  // Joined aggregates (computed on select)
  pieces_total?:  number;
  pieces_done?:   number;
}

export interface KeyPhrase {
  id:          string;
  episode_id:  string;
  phrase:      string;
  order_index: number;
}

// ─── Piece ────────────────────────────────────────────────────────────────────

export type PieceStatus =
  "borrador" | "en_revision" | "corregir" | "aprobado" | "exportado" | "publicado";

export interface VisualPieceRow {
  id:                 string;
  episode_id:         string;
  template_id:        string;
  piece_status:       PieceStatus;
  assigned_to:        string | null;
  approved_by:        string | null;
  current_version_id: string | null;
  validation_score:   number;
  preview_data_url:   string | null;
  created_at:         string;
  updated_at:         string;
  // Joined
  template?:          VisualTemplate;
}

export interface CopyBlock {
  id:          string;
  piece_id:    string;
  block_name:  string;
  block_value: string;
  is_fixed:    boolean;
  order_index: number;
}

// ─── Versions ─────────────────────────────────────────────────────────────────

export interface PieceVersion {
  id:               string;
  piece_id:         string;
  version_number:   number;
  payload_json:     Record<string, string>;  // { block_name: value }
  preview_url:      string | null;
  export_url:       string | null;
  validation_score: number;
  change_reason:    string | null;
  created_by:       string | null;
  created_at:       string;
}

// ─── Approval / Export ────────────────────────────────────────────────────────

export interface ApprovalCheck {
  id:               string;
  piece_version_id: string;
  check_id:         string;
  check_name:       string;
  severity:         "critico" | "advertencia";
  check_result:     boolean;
  details:          string | null;
  rule_ref:         string | null;
}

export interface ExportRecord {
  id:               string;
  piece_version_id: string;
  export_type:      "png" | "jpg" | "json";
  file_url:         string | null;
  file_name:        string;
  is_final:         boolean;
  exported_at:      string;
}

// ─── ChangeLog ────────────────────────────────────────────────────────────────

export type ChangeAction =
  "create" | "update" | "approve" | "export" | "restore" | "status_change";

export interface ChangeLogEntry {
  id:             string;
  entity_type:    string;
  entity_id:      string;
  action_type:    ChangeAction;
  changed_by:     string | null;
  change_summary: string | null;
  created_at:     string;
}

// ─── UI helpers ───────────────────────────────────────────────────────────────

/** Maps a VisualTemplate row to the shape buildLocalComposite() expects */
export interface CanvasPieceAdapter {
  id:                number;
  name:              string;
  shortName:         string;
  format:            PieceFormat;
  width:             number;
  height:            number;
  backgroundVersion: "cobalt" | "negro";
  hostReference:     string;
  copyTemplate:      string[];
}

export function toCanvasPiece(
  tpl: VisualTemplate,
  copyBlocks: CopyBlock[],
): CanvasPieceAdapter {
  const sorted = [...copyBlocks].sort((a, b) => a.order_index - b.order_index);
  const isNegro = tpl.background_color.toLowerCase() === "#282828";
  return {
    id:                parseInt(tpl.piece_code.replace("P",""), 10),
    name:              tpl.piece_name,
    shortName:         tpl.piece_code,
    format:            tpl.format,
    width:             tpl.width_px,
    height:            tpl.height_px,
    backgroundVersion: isNegro ? "negro" : "cobalt",
    hostReference:     "host-imagen01.png",
    copyTemplate:      sorted.map(b => b.block_value || b.block_name),
  };
}

/** Status display helpers */
export const STATUS_LABELS: Record<PieceStatus, string> = {
  borrador:    "Borrador",
  en_revision: "En revisión",
  corregir:    "Corregir",
  aprobado:    "Aprobado",
  exportado:   "Exportado",
  publicado:   "Publicado",
};

export const VISUAL_STATUS_LABELS: Record<VisualStatus, string> = {
  sin_iniciar:  "Sin iniciar",
  en_produccion:"En producción",
  en_revision:  "En revisión",
  completado:   "Completado",
};

export const STATUS_FLOW: PieceStatus[] = [
  "borrador","en_revision","corregir","aprobado","exportado","publicado",
];

export function nextStatus(s: PieceStatus): PieceStatus | null {
  const i = STATUS_FLOW.indexOf(s);
  return i < STATUS_FLOW.length - 1 ? STATUS_FLOW[i + 1] : null;
}
