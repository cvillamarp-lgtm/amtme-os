-- Add trigger to automatically atomize episodes when they reach "assets_ready" state
-- This trigger invokes the atomize-episode-content Edge Function

CREATE OR REPLACE FUNCTION trigger_atomization_on_assets_ready()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger if estado_produccion changed to 'assets_ready' or 'ready_to_publish'
  IF NEW.estado_produccion IN ('assets_ready', 'ready_to_publish')
    AND OLD.estado_produccion != NEW.estado_produccion
  THEN
    -- Log the atomization trigger event
    INSERT INTO automation_logs (
      user_id,
      episode_id,
      event_type,
      entity_type,
      entity_id,
      status,
      metadata,
      created_at
    ) VALUES (
      NEW.user_id,
      NEW.id,
      'atomization_triggered',
      'episode',
      NEW.id,
      'pending',
      jsonb_build_object(
        'previous_state', OLD.estado_produccion,
        'new_state', NEW.estado_produccion,
        'trigger_time', NOW()
      ),
      NOW()
    );

    -- Insert into atomization_queue to be processed by a scheduled function
    INSERT INTO atomization_queue (
      episode_id,
      status,
      source_type,
      created_at
    ) VALUES (
      NEW.id,
      'pending',
      'transcript',
      NOW()
    )
    ON CONFLICT (episode_id) DO UPDATE
    SET status = 'pending', updated_at = NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create atomization_queue table if it doesn't exist
CREATE TABLE IF NOT EXISTS atomization_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id UUID NOT NULL UNIQUE REFERENCES episodes(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  source_type TEXT NOT NULL DEFAULT 'transcript' CHECK (source_type IN ('transcript', 'video', 'audio')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS atomization_queue_status_idx ON atomization_queue(status);
CREATE INDEX IF NOT EXISTS atomization_queue_created_at_idx ON atomization_queue(created_at DESC);

-- Attach trigger to episodes table
DROP TRIGGER IF EXISTS atomization_on_assets_ready ON episodes;

CREATE TRIGGER atomization_on_assets_ready
  AFTER UPDATE ON episodes
  FOR EACH ROW
  EXECUTE FUNCTION trigger_atomization_on_assets_ready();

-- Create trigger to update updated_at on atomization_queue
CREATE OR REPLACE FUNCTION update_atomization_queue_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER atomization_queue_updated_at
  BEFORE UPDATE ON atomization_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_atomization_queue_updated_at();

-- Enable RLS
ALTER TABLE atomization_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY atomization_queue_select
  ON atomization_queue FOR SELECT
  USING (TRUE);

CREATE POLICY atomization_queue_insert
  ON atomization_queue FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY atomization_queue_update
  ON atomization_queue FOR UPDATE
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
