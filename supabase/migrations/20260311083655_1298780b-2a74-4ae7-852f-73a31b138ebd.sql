
ALTER TABLE public.episodes
  ADD COLUMN IF NOT EXISTS link_spotify text,
  ADD COLUMN IF NOT EXISTS descripcion_spotify text,
  ADD COLUMN IF NOT EXISTS nivel_completitud text DEFAULT 'D',
  ADD COLUMN IF NOT EXISTS estado_validacion text DEFAULT 'pendiente',
  ADD COLUMN IF NOT EXISTS conflicto boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS conflicto_nota text,
  ADD COLUMN IF NOT EXISTS streams_total integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS retencion_q1 numeric,
  ADD COLUMN IF NOT EXISTS retencion_q2 numeric,
  ADD COLUMN IF NOT EXISTS retencion_q3 numeric,
  ADD COLUMN IF NOT EXISTS retencion_q4 numeric,
  ADD COLUMN IF NOT EXISTS fecha_es_estimada boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS titulo_original text,
  ADD COLUMN IF NOT EXISTS nota_trazabilidad text;
