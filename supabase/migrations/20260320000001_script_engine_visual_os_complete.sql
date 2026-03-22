-- AMTME Script Engine + Visual OS
-- Instrucción Maestra Versión 1.0
-- Migración completa de tablas para todas las fases del sistema

-- ═════════════════════════════════════════════════════════════════════════════
-- SCRIPT ENGINE TABLES
-- ═════════════════════════════════════════════════════════════════════════════

-- Tabla: episodes
-- Metadatos principales del episodio
CREATE TABLE IF NOT EXISTS episodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  season INTEGER,
  episode_number INTEGER,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'reviewed', 'approved', 'published')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE episodes
  ADD COLUMN IF NOT EXISTS season INTEGER,
  ADD COLUMN IF NOT EXISTS episode_number INTEGER,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_episodes_created_by ON episodes(created_by);
CREATE INDEX IF NOT EXISTS idx_episodes_status ON episodes(status);

-- Tabla: raw_inputs
-- Fase 1 — Ingesta: texto original del usuario
CREATE TABLE IF NOT EXISTS raw_inputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id UUID REFERENCES episodes(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL CHECK (source_type IN ('guion', 'transcripcion', 'notas')),
  raw_text TEXT NOT NULL,
  raw_word_count INTEGER NOT NULL DEFAULT 0,
  raw_character_count INTEGER NOT NULL DEFAULT 0,
  estimated_duration_secs INTEGER,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_raw_inputs_episode ON raw_inputs(episode_id);
CREATE INDEX IF NOT EXISTS idx_raw_inputs_created_by ON raw_inputs(created_by);

-- Tabla: cleaned_texts
-- Fase 2 — Limpieza automática
CREATE TABLE IF NOT EXISTS cleaned_texts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_input_id UUID REFERENCES raw_inputs(id) ON DELETE CASCADE,
  cleaned_text TEXT NOT NULL,
  cleaned_word_count INTEGER NOT NULL DEFAULT 0,
  reduction_percentage NUMERIC(5, 2),
  approved BOOLEAN DEFAULT false,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cleaned_texts_raw_input ON cleaned_texts(raw_input_id);
CREATE INDEX IF NOT EXISTS idx_cleaned_texts_approved ON cleaned_texts(approved);

-- Tabla: semantic_maps
-- Fase 3 — Mapa semántico: fuente única de verdad para todos los outputs
CREATE TABLE IF NOT EXISTS semantic_maps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id UUID REFERENCES episodes(id) ON DELETE CASCADE,
  raw_input_id UUID REFERENCES raw_inputs(id) ON DELETE SET NULL,
  cleaned_text_id UUID REFERENCES cleaned_texts(id) ON DELETE SET NULL,
  semantic_json JSONB NOT NULL,
  dominant_emotional_tone TEXT,
  emotional_intensity_level TEXT CHECK (emotional_intensity_level IN ('bajo', 'medio', 'alto', '')),
  suggested_palette_id INTEGER DEFAULT 1 CHECK (suggested_palette_id IN (1, 2, 3, 4)),
  suggested_host_image TEXT DEFAULT 'REF_2' CHECK (suggested_host_image IN ('REF_1', 'REF_2', 'none')),
  word_counts_json JSONB,
  approved BOOLEAN DEFAULT false,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_semantic_maps_episode ON semantic_maps(episode_id);
CREATE INDEX IF NOT EXISTS idx_semantic_maps_approved ON semantic_maps(approved);
CREATE INDEX IF NOT EXISTS idx_semantic_maps_palette ON semantic_maps(suggested_palette_id);

-- Tabla: generated_assets
-- Fase 4–11 — Outputs generados (captions, quotes, hooks, visual copy, etc.)
CREATE TABLE IF NOT EXISTS generated_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  semantic_map_id UUID REFERENCES semantic_maps(id) ON DELETE CASCADE,
  asset_type TEXT NOT NULL,
  asset_key TEXT NOT NULL,
  content_json JSONB NOT NULL,
  word_counts_json JSONB,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'rejected')),
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE generated_assets
  ADD COLUMN IF NOT EXISTS semantic_map_id UUID REFERENCES semantic_maps(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS asset_type TEXT,
  ADD COLUMN IF NOT EXISTS asset_key TEXT,
  ADD COLUMN IF NOT EXISTS content_json JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS word_counts_json JSONB,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_generated_assets_semantic_map ON generated_assets(semantic_map_id);
CREATE INDEX IF NOT EXISTS idx_generated_assets_type ON generated_assets(asset_type);
CREATE INDEX IF NOT EXISTS idx_generated_assets_status ON generated_assets(status);

-- ═════════════════════════════════════════════════════════════════════════════
-- VISUAL OS TABLES
-- ═════════════════════════════════════════════════════════════════════════════

-- Tabla: palette_definitions
-- Definiciones de las 4 paletas predefinidas + P5 libre
CREATE TABLE IF NOT EXISTS palette_definitions (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  bg TEXT NOT NULL,
  accent TEXT NOT NULL,
  text_color TEXT NOT NULL,
  surface TEXT,
  surface2 TEXT,
  accent_deep TEXT,
  is_system BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla: visual_specs
-- Especificaciones técnicas de plantillas (dimensiones, tipografía, safe zones, etc.)
CREATE TABLE IF NOT EXISTS visual_specs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  aspect_ratio TEXT,
  safe_zone_px INTEGER DEFAULT 80,
  columns INTEGER DEFAULT 12,
  gutter INTEGER DEFAULT 20,
  typography_levels JSONB,
  block_coordinates JSONB,
  naming_convention TEXT,
  approval_checklist JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_visual_specs_name ON visual_specs(name);

-- Tabla: palette_assignments
-- Asignación de paleta a episodio (scope: 'episode') o pieza individual (scope: 'piece')
CREATE TABLE IF NOT EXISTS palette_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id UUID REFERENCES episodes(id) ON DELETE CASCADE,
  asset_version_id UUID,
  palette_id INTEGER REFERENCES palette_definitions(id),
  custom_bg TEXT,
  custom_accent TEXT,
  custom_text TEXT,
  scope TEXT DEFAULT 'episode' CHECK (scope IN ('episode', 'piece')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_palette_assignments_episode ON palette_assignments(episode_id);
CREATE INDEX IF NOT EXISTS idx_palette_assignments_scope ON palette_assignments(scope);

-- Tabla: asset_versions
-- Versiones de assets visuales (pieza + paleta + imagen + contenido)
CREATE TABLE IF NOT EXISTS asset_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id UUID REFERENCES episodes(id) ON DELETE CASCADE,
  visual_spec_id UUID REFERENCES visual_specs(id),
  palette_assignment_id UUID REFERENCES palette_assignments(id),
  host_image TEXT DEFAULT 'REF_2' CHECK (host_image IN ('REF_1', 'REF_2', 'none')),
  content_json JSONB NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'rejected')),
  version INTEGER DEFAULT 1,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_asset_versions_episode ON asset_versions(episode_id);
CREATE INDEX IF NOT EXISTS idx_asset_versions_visual_spec ON asset_versions(visual_spec_id);
CREATE INDEX IF NOT EXISTS idx_asset_versions_status ON asset_versions(status);

-- Tabla: change_log
-- Registro de auditoría: quién cambió qué, cuándo
CREATE TABLE IF NOT EXISTS change_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action_type TEXT NOT NULL,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  change_summary TEXT,
  word_count_before INTEGER,
  word_count_after INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_change_log_entity ON change_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_change_log_created_at ON change_log(created_at);

-- ═════════════════════════════════════════════════════════════════════════════
-- SEED DATA
-- ═════════════════════════════════════════════════════════════════════════════

-- Insertar las 4 paletas predefinidas (§05 − Sistema de Color)
INSERT INTO palette_definitions (name, bg, accent, text_color, surface, surface2, accent_deep, is_system)
VALUES
  (
    'P1 − Principal · Azul noche + Lima',
    '#020B18', '#E4F542', '#F0EEE6',
    '#071428', '#0D2545', '#B8C82E', true
  ),
  (
    'P2 − Naranja · Emocional urgente',
    '#0F0500', '#FF6B35', '#FFF0E8',
    '#1A0A00', '#2D1500', '#CC5520', true
  ),
  (
    'P3 − Invertida · Quotes íntimas',
    '#F0EEE6', '#B8C82E', '#020B18',
    '#E5E2D8', '#D8D4C8', '#8A9620', true
  ),
  (
    'P4 − Negro absoluto · Minimalista',
    '#000510', '#E4F542', '#FFFFFF',
    '#020B18', '#071428', '#B8C82E', true
  )
ON CONFLICT (name) DO NOTHING;

-- Insertar plantilla P01 (1080×1080)
INSERT INTO visual_specs (name, width, height, aspect_ratio, safe_zone_px, columns, gutter, 
  typography_levels, block_coordinates, naming_convention, approval_checklist)
VALUES (
  'P01 · 1:1 Cuadrado',
  1080, 1080, '1:1', 80, 12, 20,
  '{
    "display": {"size": 96, "weight": 900, "font": "Montserrat"},
    "headline": {"size": 80, "weight": 900, "font": "Montserrat"},
    "body": {"size": 18, "weight": 400, "font": "Inter"},
    "ui": {"size": 11, "weight": 600, "font": "Inter"}
  }',
  '{
    "keyword": {"x": 80, "y": 700, "maxW": 520},
    "headline": {"x": 80, "y": 620, "maxW": 520},
    "subheadline": {"x": 80, "y": 810, "maxW": 500},
    "cta": {"x": 80, "y": 870, "w": 220},
    "photo": {"x": 540, "y": 0, "w": 540, "h": 1080},
    "brand": {"x": 80, "y": 48},
    "ep_badge": {"x": 940, "y": 40}
  }',
  'AMTME-S{season}-EP{episode}-P01-V{version}.png',
  '[
    "Keyword en lima",
    "Subrayado bajo keyword",
    "Headline presente",
    "Foto seleccionada",
    "Sombra activa",
    "Safe zone ok",
    "Contraste ok",
    "Naming ok"
  ]'
)
ON CONFLICT (name) DO NOTHING;

-- Insertar plantilla P02 (1080×1350, 4:5)
INSERT INTO visual_specs (name, width, height, aspect_ratio, safe_zone_px, columns, gutter, 
  typography_levels, block_coordinates, naming_convention, approval_checklist)
VALUES (
  'P02 · 4:5 Stories',
  1080, 1350, '4:5', 80, 12, 20,
  '{
    "display": {"size": 108, "weight": 900, "font": "Montserrat"},
    "headline": {"size": 88, "weight": 900, "font": "Montserrat"},
    "body": {"size": 18, "weight": 400, "font": "Inter"},
    "ui": {"size": 11, "weight": 600, "font": "Inter"}
  }',
  '{
    "keyword": {"x": 80, "y": 880, "maxW": 560},
    "headline": {"x": 80, "y": 780, "maxW": 560},
    "subheadline": {"x": 80, "y": 990, "maxW": 540},
    "cta": {"x": 80, "y": 1080, "w": 260},
    "platforms": {"x": 80, "y": 1250},
    "photo": {"x": 540, "y": 0, "w": 540, "h": 1350},
    "brand": {"x": 80, "y": 48},
    "ep_badge": {"x": 940, "y": 40}
  }',
  'AMTME-S{season}-EP{episode}-P02-V{version}.png',
  '[
    "Keyword en lima",
    "Subrayado bajo keyword",
    "Headline presente",
    "Foto seleccionada",
    "Sombra activa",
    "Safe zone ok",
    "Contraste ok",
    "Plataformas visible",
    "Naming ok"
  ]'
)
ON CONFLICT (name) DO NOTHING;

-- ═════════════════════════════════════════════════════════════════════════════
-- ROLES Y POLÍTICAS DE SEGURIDAD (RLS)
-- ═════════════════════════════════════════════════════════════════════════════

-- Habilitar RLS en todas las tablas críticas
ALTER TABLE episodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw_inputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE cleaned_texts ENABLE ROW LEVEL SECURITY;
ALTER TABLE semantic_maps ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE palette_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE change_log ENABLE ROW LEVEL SECURITY;

-- Políticas básicas (permitir lectura/escritura por creador, lectura por reviewer/admin)
CREATE POLICY "Users can view their own episodes"
  ON episodes FOR SELECT
  USING (auth.uid() = created_by OR auth.jwt() ->> 'role' IN ('admin', 'reviewer'));

CREATE POLICY "Users can create episodes"
  ON episodes FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own episodes"
  ON episodes FOR UPDATE
  USING (auth.uid() = created_by OR auth.jwt() ->> 'role' = 'admin');

-- Políticas similares para raw_inputs, cleaned_texts, semantic_maps, asset_versions
-- (simplificadas: permitir lectura al creador y al rol 'reviewer', escritura solo al creador)

CREATE POLICY "Users can view raw_inputs"
  ON raw_inputs FOR SELECT
  USING (auth.uid() = created_by OR auth.jwt() ->> 'role' IN ('admin', 'reviewer'));

CREATE POLICY "Users can create raw_inputs"
  ON raw_inputs FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can view cleaned_texts"
  ON cleaned_texts FOR SELECT
  USING (auth.uid() = (SELECT created_by FROM raw_inputs WHERE id = raw_input_id) 
         OR auth.jwt() ->> 'role' IN ('admin', 'reviewer'));

CREATE POLICY "Users can view semantic_maps"
  ON semantic_maps FOR SELECT
  USING (auth.uid() = (SELECT created_by FROM episodes WHERE id = episode_id)
         OR auth.jwt() ->> 'role' IN ('admin', 'reviewer'));

CREATE POLICY "Users can view generated_assets"
  ON generated_assets FOR SELECT
  USING (auth.uid() = (SELECT created_by FROM episodes WHERE id = (SELECT episode_id FROM semantic_maps WHERE id = semantic_map_id))
         OR auth.jwt() ->> 'role' IN ('admin', 'reviewer'));

CREATE POLICY "Users can view asset_versions"
  ON asset_versions FOR SELECT
  USING (auth.uid() = created_by OR auth.jwt() ->> 'role' IN ('admin', 'reviewer'));

CREATE POLICY "Users can create asset_versions"
  ON asset_versions FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- Política para change_log (lectura pública, escritura solo por sistema)
CREATE POLICY "Anyone can view change_log"
  ON change_log FOR SELECT
  USING (true);
