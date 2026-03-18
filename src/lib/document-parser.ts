/**
 * AMTME Master Document Parser
 * Deterministic parser that splits the consolidated document into semantic blocks
 * and maps each block to its correct destination module.
 */

export interface ParsedBlock {
  id: string;
  title: string;
  content: string;
  sourceSection: string;
  sourceSubsection: string;
  contentType: string;
  destinationModule: string;
  destinationLabel: string;
  sourceHash: string;
  structuredData: Record<string, any>;
  lineStart: number;
  lineEnd: number;
  status: "new" | "update" | "skip" | "conflict";
  conflictReason?: string;
}

export interface ParsedEpisode {
  number: string;
  title: string;
  titleOriginal: string;
  releaseDate: string;
  streams: number;
  level: string;
  topics: string;
}

// ---------- SECTION MAPPING ----------

interface SectionMapping {
  contentType: string;
  destination: string;
  label: string;
}

const SECTION_KEYWORDS: [RegExp, SectionMapping][] = [
  // OS 1.0
  [/MAPA DE ESTRUCTURA/i, { contentType: "operational_structure", destination: "sistema_operacion", label: "Sistema > Operación" }],
  [/RESUMEN DE MOVIMIENTOS/i, { contentType: "operational_audit", destination: "sistema_operacion", label: "Sistema > Operación" }],
  [/DOCUMENTOS MASTER CREADOS/i, { contentType: "operational_audit", destination: "resources_sop", label: "Recursos > SOPs" }],
  [/LOG DE DEDUPLICACION/i, { contentType: "operational_audit", destination: "sistema_operacion", label: "Sistema > Operación" }],
  [/PENDIENTES.*CRITICOS|PENDIENTES.*IMPORTANTES|PENDIENTES.*OPCIONALES|PENDIENTES Y HUECOS/i, { contentType: "pending_task", destination: "tasks", label: "Tareas" }],
  [/REGLAS OPERATIVAS/i, { contentType: "operational_rule", destination: "sistema_operacion", label: "Sistema > Operación" }],
  [/AUDITORIA|AUDITORÍA/i, { contentType: "operational_audit", destination: "sistema_operacion", label: "Sistema > Operación" }],

  // Brand
  [/IDENTIDAD DE MARCA/i, { contentType: "brand_identity", destination: "sistema_brand", label: "Sistema > Brand" }],
  [/DECLARACI[OÓ]N DE POSICIONAMIENTO/i, { contentType: "brand_positioning", destination: "sistema_brand", label: "Sistema > Brand" }],
  [/DATOS DE IDENTIDAD/i, { contentType: "brand_identity", destination: "sistema_brand", label: "Sistema > Brand" }],
  [/VALORES DE MARCA/i, { contentType: "brand_values", destination: "sistema_brand", label: "Sistema > Brand" }],
  [/MISI[OÓ]N.*VISI[OÓ]N|MISI[OÓ]N|VISI[OÓ]N|PROP[OÓ]SITO/i, { contentType: "brand_purpose", destination: "sistema_brand", label: "Sistema > Brand" }],
  [/HISTORIA DE ORIGEN/i, { contentType: "brand_origin", destination: "sistema_brand", label: "Sistema > Brand" }],
  [/CHRISTIAN VILLAMAR|QUI[EÉ]N HAY DETR[AÁ]S/i, { contentType: "brand_host", destination: "sistema_brand", label: "Sistema > Brand" }],
  [/ROL DEL TAROT/i, { contentType: "brand_tarot", destination: "sistema_brand", label: "Sistema > Brand" }],
  [/PARA QUI[EÉ]N ES.*PARA QUI[EÉ]N|PARA QUI[EÉ]N DEFINITIVAMENTE/i, { contentType: "brand_audience_def", destination: "sistema_brand", label: "Sistema > Brand" }],
  [/NICHO [UÚ]NICO/i, { contentType: "brand_niche", destination: "sistema_brand", label: "Sistema > Brand" }],
  [/VOZ Y TONO|C[OÓ]MO HABLAMOS/i, { contentType: "brand_voice", destination: "sistema_brand", label: "Sistema > Brand" }],
  [/TONO POR CANAL/i, { contentType: "brand_voice_channel", destination: "sistema_brand", label: "Sistema > Brand" }],
  [/GU[IÍ]A DE CRISIS/i, { contentType: "brand_crisis", destination: "sistema_brand", label: "Sistema > Brand" }],
  [/BIOS OFICIALES|BIO INSTAGRAM|BIO SPOTIFY|BIO CORTA|PRESENTACI[OÓ]N ORAL|DESCRIPCI[OÓ]N LARGA/i, { contentType: "brand_bio", destination: "sistema_brand", label: "Sistema > Brand" }],

  // Visual
  [/IDENTIDAD VISUAL.*PALETA|PALETA BARRA DE NAVIDAD/i, { contentType: "visual_palette_brand", destination: "sistema_design", label: "Sistema > Design" }],
  [/SISTEMA VISUAL SB-01|PALETA SB-01/i, { contentType: "visual_system_sb01", destination: "sistema_design", label: "Sistema > Design" }],
  [/COLORWAYS DEL SISTEMA/i, { contentType: "visual_colorway", destination: "sistema_design", label: "Sistema > Design" }],
  [/TIPOGRAF[IÍ]A DEL SISTEMA/i, { contentType: "visual_typography", destination: "sistema_design", label: "Sistema > Design" }],

  // Episode catalog
  [/CAT[AÁ]LOGO COMPLETO|TABLA DE REFERENCIA R[AÁ]PIDA/i, { contentType: "episode_catalog", destination: "episodes", label: "Episodios" }],
  [/EPISODIOS DE MAYOR PERFORMANCE/i, { contentType: "episode_performance", destination: "episodes", label: "Episodios" }],
  [/28 EPISODIOS.*RENUMERADOS|LOS 28 EPISODIOS/i, { contentType: "episode_catalog_v2", destination: "episodes", label: "Episodios" }],

  // Content system
  [/CARRUSEL DE AUTOR/i, { contentType: "content_carousel", destination: "templates", label: "Templates" }],
  [/CALENDARIO DE PUBLICACI[OÓ]N/i, { contentType: "content_calendar", destination: "templates", label: "Templates" }],
  [/CONVERSI[OÓ]N IG.*SPOTIFY/i, { contentType: "content_conversion", destination: "templates", label: "Templates" }],
  [/BANCO DE HOOKS|HOOKS.*REELS/i, { contentType: "content_hook", destination: "templates", label: "Templates" }],
  [/SISTEMA DE CONTENIDO INSTAGRAM/i, { contentType: "content_system_ig", destination: "templates", label: "Templates" }],

  // Canva templates
  [/KIT DE PLANTILLAS CANVA/i, { contentType: "canva_template", destination: "templates", label: "Templates" }],
  [/FLUJO DE TRABAJO EN CANVA/i, { contentType: "canva_workflow", destination: "resources_sop", label: "Recursos > SOPs" }],
  [/CHECKLIST QA/i, { contentType: "qa_checklist", destination: "templates", label: "Templates" }],

  // Production
  [/FLUJO DE PRODUCCI[OÓ]N|PIPELINE COMPLETO/i, { contentType: "production_flow", destination: "resources_sop", label: "Recursos > SOPs" }],
  [/SPECS T[EÉ]CNICAS DE AUDIO/i, { contentType: "audio_spec", destination: "resources_sop", label: "Recursos > SOPs" }],
  [/ESTRUCTURA DEL EPISODIO.*8 BLOQUES/i, { contentType: "episode_structure", destination: "templates", label: "Templates" }],
  [/RELEASE PROTOCOL/i, { contentType: "release_protocol", destination: "resources_sop", label: "Recursos > SOPs" }],
  [/INTRO EST[AÁ]NDAR/i, { contentType: "episode_intro", destination: "templates", label: "Templates" }],
  [/PLANTILLA DE DESCRIPCI[OÓ]N/i, { contentType: "episode_description_template", destination: "templates", label: "Templates" }],

  // Metrics
  [/KPIs? PRIMARIOS/i, { contentType: "metric_kpi_primary", destination: "metrics", label: "Métricas" }],
  [/KPIs? SECUNDARIOS/i, { contentType: "metric_kpi_secondary", destination: "metrics", label: "Métricas" }],
  [/NIVELES DE PERFORMANCE/i, { contentType: "metric_performance_levels", destination: "metrics", label: "Métricas" }],
  [/MODELO DE DATOS.*REGISTRO SEMANAL/i, { contentType: "metric_data_model", destination: "metrics", label: "Métricas" }],
  [/M[EÉ]TRICAS Y KPI/i, { contentType: "metric_kpi", destination: "metrics", label: "Métricas" }],
  [/RETENCI[OÓ]N POR EPISODIO/i, { contentType: "metric_retention", destination: "metrics", label: "Métricas" }],
  [/PATRONES DE COMPORTAMIENTO/i, { contentType: "metric_patterns", destination: "metrics", label: "Métricas" }],
  [/FUENTES DE DESCUBRIMIENTO/i, { contentType: "metric_discovery", destination: "metrics", label: "Métricas" }],
  [/DIAGN[OÓ]STICO CRUZADO/i, { contentType: "metric_diagnostic", destination: "metrics", label: "Métricas" }],
  [/AN[AÁ]LISIS FODA|FODA/i, { contentType: "analysis_swot", destination: "metrics", label: "Métricas" }],
  [/PROYECCI[OÓ]N 90 D[IÍ]AS/i, { contentType: "analysis_projection", destination: "metrics", label: "Métricas" }],
  [/PLAN DE ACCI[OÓ]N/i, { contentType: "strategy_action_plan", destination: "resources_strategy", label: "Recursos > Estrategia" }],
  [/INSTAGRAM.*AUDIENCIA|G[EÉ]NERO Y EDAD|GEOGRAF[IÍ]A|HORARIOS/i, { contentType: "metric_ig_audience", destination: "metrics", label: "Métricas" }],
  [/INSTAGRAM.*CONTENIDO|TOP CONTENIDOS|M[EÉ]TRICAS DE CONVERSI[OÓ]N/i, { contentType: "metric_ig_content", destination: "metrics", label: "Métricas" }],
  [/SPOTIFY.*RESUMEN|M[EÉ]TRICAS GLOBALES|DEMOGRAF[IÍ]A SPOTIFY/i, { contentType: "metric_spotify", destination: "metrics", label: "Métricas" }],
  [/DASHBOARD EJECUTIVO/i, { contentType: "dashboard_executive", destination: "dashboard", label: "Dashboard" }],
  [/DIAGN[OÓ]STICO CON DATOS REALES/i, { contentType: "metric_diagnostic_real", destination: "metrics", label: "Métricas" }],
  [/7 INSIGHTS CR[IÍ]TICOS/i, { contentType: "metric_insights", destination: "metrics", label: "Métricas" }],

  // Strategy
  [/MONETIZACI[OÓ]N/i, { contentType: "strategy_monetization", destination: "resources_strategy", label: "Recursos > Estrategia" }],
  [/POSICIONAMIENTO COMPETITIVO/i, { contentType: "strategy_competitive", destination: "resources_strategy", label: "Recursos > Estrategia" }],
  [/ANTI-REFERENTE/i, { contentType: "strategy_anti_reference", destination: "resources_strategy", label: "Recursos > Estrategia" }],
  [/MAPA COMPETITIVO/i, { contentType: "strategy_competitive_map", destination: "resources_strategy", label: "Recursos > Estrategia" }],
  [/ROADMAP/i, { contentType: "strategy_roadmap", destination: "resources_strategy", label: "Recursos > Estrategia" }],
  [/SPOTIFY PARTNER/i, { contentType: "strategy_monetization", destination: "resources_strategy", label: "Recursos > Estrategia" }],
  [/COLABORACIONES|CRITERIOS PARA ACEPTAR/i, { contentType: "strategy_collaborations", destination: "resources_strategy", label: "Recursos > Estrategia" }],

  // Decisions
  [/DECISIONES.*CONFLICTOS|CONFLICTOS RESUELTOS/i, { contentType: "conflict_resolution", destination: "sistema_operacion", label: "Sistema > Operación" }],
  [/REGLAS DE OVERRIDE/i, { contentType: "conflict_rules", destination: "sistema_operacion", label: "Sistema > Operación" }],

  // Plan maestro
  [/PLAN ESTRAT[EÉ]GICO MAESTRO|PLAN MAESTRO|DECISIONES DE MARCA/i, { contentType: "strategy_master_plan", destination: "resources_strategy", label: "Recursos > Estrategia" }],
  [/PLAN DE CONTENIDO.*30 D[IÍ]AS/i, { contentType: "content_plan_30d", destination: "templates", label: "Templates" }],
  [/EP\.\s*29|GRABAR HOY/i, { contentType: "episode_next", destination: "episodes", label: "Episodios" }],
  [/FORMATO.*T[IÍ]TULO|HANDLE/i, { contentType: "brand_format_rules", destination: "sistema_brand", label: "Sistema > Brand" }],

  // Appendix / History
  [/AP[EÉ]NDICE|HISTORIAL|ARCHIVADOS|RENOMBRES/i, { contentType: "archive_history", destination: "sistema_operacion", label: "Sistema > Operación" }],
];

// ---------- HASH ----------

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

// ---------- HEADING DETECTION ----------

interface HeadingInfo {
  level: number;
  text: string;
  lineIndex: number;
}

function detectHeading(line: string): HeadingInfo | null {
  // Markdown headings
  const mdMatch = line.match(/^(#{1,4})\s+(.+)/);
  if (mdMatch) return { level: mdMatch[1].length, text: mdMatch[2].trim(), lineIndex: 0 };

  // Roman numeral sections: "I · IDENTIDAD"
  const romanMatch = line.match(/^([IVXLC]+)\s*[·.]\s*(.+)/);
  if (romanMatch) return { level: 2, text: romanMatch[2].trim(), lineIndex: 0 };

  // "XII.1 Carrusel" sub-sections
  const romanSubMatch = line.match(/^([IVXLC]+\.\d+)\s+(.+)/);
  if (romanSubMatch) return { level: 3, text: romanSubMatch[2].trim(), lineIndex: 0 };

  // SECCIÓN N — Title
  const secMatch = line.match(/^SECCI[OÓ]N\s+(\d+)\s*[—–-]\s*(.+)/i);
  if (secMatch) return { level: 1, text: secMatch[2].trim(), lineIndex: 0 };

  // Numbered sections: "1. MAPA DE ESTRUCTURA"
  const numMatch = line.match(/^\d+\.\s+([A-ZÁÉÍÓÚ][A-ZÁÉÍÓÚ\s—–-]+)/);
  if (numMatch && numMatch[1].length > 5) return { level: 2, text: numMatch[1].trim(), lineIndex: 0 };

  // ALL CAPS lines (>10 chars, no lowercase)
  if (line.length > 10 && line === line.toUpperCase() && /[A-ZÁÉÍÓÚ]/.test(line) && !/^\d/.test(line) && !line.includes("|")) {
    return { level: 2, text: line.trim(), lineIndex: 0 };
  }

  return null;
}

// ---------- CLASSIFY ----------

function classifyBlock(title: string, parentSection: string): SectionMapping {
  const combined = `${parentSection} ${title}`.toUpperCase();

  for (const [regex, mapping] of SECTION_KEYWORDS) {
    if (regex.test(combined) || regex.test(title)) {
      return mapping;
    }
  }

  // Fallback based on parent section
  if (/OS\s*1\.0|INFORME FINAL/i.test(parentSection)) {
    return { contentType: "operational_misc", destination: "sistema_operacion", label: "Sistema > Operación" };
  }
  if (/MAESTRO CONSOLIDADO|MARCA/i.test(parentSection)) {
    return { contentType: "brand_misc", destination: "sistema_brand", label: "Sistema > Brand" };
  }
  if (/PLAN MAESTRO|ESTRATEG/i.test(parentSection)) {
    return { contentType: "strategy_misc", destination: "resources_strategy", label: "Recursos > Estrategia" };
  }
  if (/CAT[AÁ]LOGO|SHOW/i.test(parentSection)) {
    return { contentType: "episode_misc", destination: "episodes", label: "Episodios" };
  }
  if (/RECURSOS OPERATIVOS/i.test(parentSection)) {
    return { contentType: "metric_misc", destination: "metrics", label: "Métricas" };
  }

  return { contentType: "unclassified", destination: "knowledge_base", label: "Base de conocimiento" };
}

// ---------- EPISODE PARSER ----------

export function parseEpisodeTable(content: string): ParsedEpisode[] {
  const episodes: ParsedEpisode[] = [];

  // Match the renumbered table format: "Ep. N  Title  Original  Plays  Date"
  const lines = content.split("\n");
  let currentEp: Partial<ParsedEpisode> | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Detect "Ep. N" pattern
    const epMatch = line.match(/^Ep\.\s*(\d+)\s+(.+)/);
    if (epMatch) {
      if (currentEp?.number) {
        episodes.push(currentEp as ParsedEpisode);
      }
      currentEp = {
        number: epMatch[1],
        title: epMatch[2].trim(),
        titleOriginal: "",
        releaseDate: "",
        streams: 0,
        level: "C",
        topics: "",
      };
      continue;
    }

    // Try to extract data from surrounding lines if we have a current episode
    if (currentEp) {
      // Date pattern
      const dateMatch = line.match(/(\d{1,2}\s+\w+\s+\d{4})/);
      if (dateMatch) {
        currentEp.releaseDate = dateMatch[1];
      }

      // Streams (standalone number)
      const streamMatch = line.match(/^(\d{2,4})$/);
      if (streamMatch) {
        currentEp.streams = parseInt(streamMatch[1]);
      }

      // Level
      if (/^[ABC]$/.test(line)) {
        currentEp.level = line;
      }
    }
  }

  if (currentEp?.number) {
    episodes.push(currentEp as ParsedEpisode);
  }

  return episodes;
}

// Parse the Plan Maestro episode table (more structured)
export function parseRenumberedEpisodes(content: string): ParsedEpisode[] {
  const episodes: ParsedEpisode[] = [];
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Pattern: "Ep. N  New Title"
    const epMatch = line.match(/^Ep\.\s*(\d+)\s+(.+)/);
    if (epMatch) {
      const ep: ParsedEpisode = {
        number: epMatch[1],
        title: epMatch[2].trim(),
        titleOriginal: "",
        releaseDate: "",
        streams: 0,
        level: "C",
        topics: "",
      };

      // Look ahead for original title, plays, date
      for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
        const nextLine = lines[j].trim();
        if (!nextLine) continue;

        // If next episode starts, break
        if (/^Ep\.\s*\d+/.test(nextLine)) break;

        // Date: "18 dic 2024" or similar
        const dMatch = nextLine.match(/(\d{1,2}\s+\w{3,}\s+\d{4})/);
        if (dMatch) ep.releaseDate = dMatch[1];

        // Plays: standalone number
        const pMatch = nextLine.match(/^(\d{2,4})$/);
        if (pMatch) ep.streams = parseInt(pMatch[1]);
      }

      episodes.push(ep);
    }
  }

  return episodes;
}

// ---------- MAIN PARSER ----------

export function parseDocument(text: string): ParsedBlock[] {
  const lines = text.split("\n");
  const blocks: ParsedBlock[] = [];
  const sourceDoc = "AMTME_Documento_Consolidado_2026-03-05";

  let currentSection = "";
  let currentSubsection = "";
  let blockLines: string[] = [];
  let blockStart = 0;
  let blockTitle = "";

  function flushBlock(endLine: number) {
    if (!blockTitle || blockLines.length === 0) return;

    const content = blockLines.join("\n").trim();
    if (content.length < 10) return; // Skip empty blocks

    const mapping = classifyBlock(blockTitle, currentSection);
    const hash = simpleHash(`${sourceDoc}:${currentSection}:${blockTitle}:${content.substring(0, 200)}`);

    blocks.push({
      id: `block-${blocks.length}`,
      title: blockTitle.substring(0, 120),
      content,
      sourceSection: currentSection,
      sourceSubsection: currentSubsection,
      contentType: mapping.contentType,
      destinationModule: mapping.destination,
      destinationLabel: mapping.label,
      sourceHash: hash,
      structuredData: {},
      lineStart: blockStart,
      lineEnd: endLine,
      status: "new",
    });
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const heading = detectHeading(line);

    if (heading) {
      // Flush previous block
      flushBlock(i - 1);

      if (heading.level <= 1) {
        currentSection = heading.text;
        currentSubsection = "";
      } else if (heading.level === 2) {
        currentSubsection = heading.text;
      }

      blockTitle = heading.text;
      blockLines = [];
      blockStart = i;
    } else {
      blockLines.push(lines[i]);
    }
  }

  // Flush last block
  flushBlock(lines.length - 1);

  return blocks;
}

// ---------- STATS ----------

export interface ImportStats {
  total: number;
  byDestination: Record<string, number>;
  byType: Record<string, number>;
  episodesDetected: number;
}

export function computeStats(blocks: ParsedBlock[]): ImportStats {
  const byDestination: Record<string, number> = {};
  const byType: Record<string, number> = {};

  for (const block of blocks) {
    byDestination[block.destinationModule] = (byDestination[block.destinationModule] || 0) + 1;
    byType[block.contentType] = (byType[block.contentType] || 0) + 1;
  }

  const episodesDetected = blocks.filter(b => b.destinationModule === "episodes").length;

  return { total: blocks.length, byDestination, byType, episodesDetected };
}

// Destination module labels for display
export const DESTINATION_LABELS: Record<string, string> = {
  sistema_brand: "Sistema > Brand",
  sistema_design: "Sistema > Design",
  sistema_operacion: "Sistema > Operación",
  episodes: "Episodios",
  templates: "Templates",
  metrics: "Métricas",
  dashboard: "Dashboard",
  resources_sop: "Recursos > SOPs",
  resources_strategy: "Recursos > Estrategia",
  tasks: "Tareas",
  knowledge_base: "Base de conocimiento",
};

// Content type labels
export const CONTENT_TYPE_LABELS: Record<string, string> = {
  brand_identity: "Identidad de marca",
  brand_values: "Valores",
  brand_purpose: "Misión/Visión/Propósito",
  brand_origin: "Historia de origen",
  brand_host: "Christian Villamar",
  brand_tarot: "Rol del tarot",
  brand_positioning: "Posicionamiento",
  brand_voice: "Voz y tono",
  brand_bio: "Bios oficiales",
  brand_crisis: "Guía de crisis",
  brand_niche: "Nicho único",
  brand_audience_def: "Definición de audiencia",
  brand_voice_channel: "Tono por canal",
  brand_format_rules: "Reglas de formato",
  brand_misc: "Brand (general)",
  visual_palette_brand: "Paleta Barra de Navidad",
  visual_system_sb01: "Sistema visual SB-01",
  visual_colorway: "Colorways",
  visual_typography: "Tipografía",
  episode_catalog: "Catálogo de episodios",
  episode_catalog_v2: "Catálogo renumerado",
  episode_performance: "Episodios top",
  episode_structure: "Estructura 8 bloques",
  episode_intro: "Intros estándar",
  episode_description_template: "Plantilla descripción",
  episode_next: "Próximo episodio",
  episode_misc: "Episodios (general)",
  content_system_ig: "Sistema IG",
  content_carousel: "Carrusel de autor",
  content_calendar: "Calendario publicación",
  content_conversion: "Conversión IG→Spotify",
  content_hook: "Banco de hooks",
  content_plan_30d: "Plan 30 días",
  canva_template: "Kit Canva",
  canva_workflow: "Flujo Canva",
  qa_checklist: "Checklist QA",
  production_flow: "Flujo de producción",
  audio_spec: "Specs audio",
  release_protocol: "Release protocol",
  metric_kpi: "KPIs",
  metric_kpi_primary: "KPIs primarios",
  metric_kpi_secondary: "KPIs secundarios",
  metric_performance_levels: "Niveles performance",
  metric_data_model: "Modelo de datos",
  metric_retention: "Retención",
  metric_patterns: "Patrones",
  metric_discovery: "Descubrimiento",
  metric_diagnostic: "Diagnóstico cruzado",
  metric_ig_audience: "IG audiencia",
  metric_ig_content: "IG contenido",
  metric_spotify: "Spotify métricas",
  metric_insights: "Insights críticos",
  metric_diagnostic_real: "Diagnóstico real",
  metric_misc: "Métricas (general)",
  dashboard_executive: "Dashboard ejecutivo",
  analysis_swot: "Análisis FODA",
  analysis_projection: "Proyección 90 días",
  strategy_monetization: "Monetización",
  strategy_competitive: "Posicionamiento competitivo",
  strategy_competitive_map: "Mapa competitivo",
  strategy_anti_reference: "Anti-referente",
  strategy_roadmap: "Roadmap",
  strategy_collaborations: "Colaboraciones",
  strategy_action_plan: "Plan de acción",
  strategy_master_plan: "Plan maestro",
  strategy_misc: "Estrategia (general)",
  operational_structure: "Estructura operativa",
  operational_audit: "Auditoría",
  operational_rule: "Reglas operativas",
  operational_naming: "Naming",
  operational_misc: "Operación (general)",
  conflict_resolution: "Conflictos resueltos",
  conflict_rules: "Reglas de override",
  pending_task: "Pendiente accionable",
  archive_history: "Historial/Archivo",
  unclassified: "Sin clasificar",
};
