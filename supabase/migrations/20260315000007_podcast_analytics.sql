-- ════════════════════════════════════════════════════════════════
-- PODCAST ANALYTICS TABLES
-- Datos exportados de Spotify for Creators (desde siempre)
-- Creado: 15 Mar 2026
-- ════════════════════════════════════════════════════════════════

-- ── 1. Stats diarios: streams + escuchas únicas + seguidores ──
CREATE TABLE IF NOT EXISTS podcast_daily_stats (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    fecha         DATE NOT NULL,
    streams       INTEGER,          -- Reproducciones y descargas
    escuchas      INTEGER,          -- Oyentes únicos (Escuchas)
    horas_reproduccion NUMERIC(8,2),-- Horas de reproducción
    seguidores    INTEGER,          -- Seguidores acumulados
    created_at    TIMESTAMPTZ DEFAULT now(),
    UNIQUE (user_id, fecha)
);

-- ── 2. Geolocalización (snapshot histórico total) ─────────────
CREATE TABLE IF NOT EXISTS podcast_geo_stats (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    pais          TEXT NOT NULL,
    porcentaje    NUMERIC(6,4),
    snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at    TIMESTAMPTZ DEFAULT now(),
    UNIQUE (user_id, pais, snapshot_date)
);

-- ── 3. Distribución por aplicación (snapshot histórico total) ─
CREATE TABLE IF NOT EXISTS podcast_app_stats (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    aplicacion    TEXT NOT NULL,
    porcentaje    NUMERIC(6,4),
    snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at    TIMESTAMPTZ DEFAULT now(),
    UNIQUE (user_id, aplicacion, snapshot_date)
);

-- ── RLS: cada usuario solo ve sus propios datos ───────────────
ALTER TABLE podcast_daily_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE podcast_geo_stats   ENABLE ROW LEVEL SECURITY;
ALTER TABLE podcast_app_stats   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own daily stats"
    ON podcast_daily_stats FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own geo stats"
    ON podcast_geo_stats FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own app stats"
    ON podcast_app_stats FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ── Índices para consultas de dashboard ──────────────────────
CREATE INDEX IF NOT EXISTS idx_daily_stats_user_fecha
    ON podcast_daily_stats (user_id, fecha DESC);

CREATE INDEX IF NOT EXISTS idx_geo_stats_user_snapshot
    ON podcast_geo_stats (user_id, snapshot_date DESC);
