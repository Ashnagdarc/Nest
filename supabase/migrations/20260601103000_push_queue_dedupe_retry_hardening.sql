-- Push notification dedupe + retry hardening (additive)

ALTER TABLE public.push_notification_queue
  ADD COLUMN IF NOT EXISTS dedupe_key text,
  ADD COLUMN IF NOT EXISTS next_attempt_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS last_attempt_at timestamptz,
  ADD COLUMN IF NOT EXISTS processing_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS processed_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Keep dedupe key in a first-class column for deterministic de-duplication.
UPDATE public.push_notification_queue
SET dedupe_key = COALESCE(dedupe_key, data->>'dedupe_key')
WHERE dedupe_key IS NULL;

DROP TRIGGER IF EXISTS trg_push_queue_sync_dedupe_key ON public.push_notification_queue;
DROP FUNCTION IF EXISTS public.sync_push_queue_dedupe_key();

CREATE FUNCTION public.sync_push_queue_dedupe_key()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.dedupe_key := COALESCE(NEW.dedupe_key, NEW.data->>'dedupe_key');
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_push_queue_sync_dedupe_key
BEFORE INSERT OR UPDATE ON public.push_notification_queue
FOR EACH ROW
EXECUTE FUNCTION public.sync_push_queue_dedupe_key();

-- Allow dead-letter terminal state for unrecoverable failures.
ALTER TABLE public.push_notification_queue
  DROP CONSTRAINT IF EXISTS push_notification_queue_status_check;
ALTER TABLE public.push_notification_queue
  ADD CONSTRAINT push_notification_queue_status_check
  CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'dead_letter'));

-- Dedupe active notifications by user + dedupe key.
CREATE UNIQUE INDEX IF NOT EXISTS idx_push_queue_user_dedupe_active
  ON public.push_notification_queue(user_id, dedupe_key)
  WHERE dedupe_key IS NOT NULL
    AND status IN ('pending', 'processing', 'sent');

-- Worker-friendly lookup for due jobs.
CREATE INDEX IF NOT EXISTS idx_push_queue_due_jobs
  ON public.push_notification_queue(status, next_attempt_at, created_at)
  WHERE status IN ('pending', 'processing');

-- Optional safety: retries should never exceed max retries.
ALTER TABLE public.push_notification_queue
  DROP CONSTRAINT IF EXISTS push_notification_queue_retry_bounds_check;
ALTER TABLE public.push_notification_queue
  ADD CONSTRAINT push_notification_queue_retry_bounds_check
  CHECK (retry_count >= 0 AND max_retries >= 1 AND retry_count <= max_retries + 1);

