-- Add retry support to atomization_queue
-- Schema: retry_count tracks attempts, max_retries enforces limit, last_retry_at for timing
ALTER TABLE atomization_queue
ADD COLUMN IF NOT EXISTS retry_count INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_retries INTEGER NOT NULL DEFAULT 3,
ADD COLUMN IF NOT EXISTS last_retry_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS atomization_queue_retry_idx
  ON atomization_queue(status, retry_count)
  WHERE status IN ('failed', 'pending');
