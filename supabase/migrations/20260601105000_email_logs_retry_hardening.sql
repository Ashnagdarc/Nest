-- Email log retry hardening (additive)

ALTER TABLE public.email_logs
  ADD COLUMN IF NOT EXISTS subject text,
  ADD COLUMN IF NOT EXISTS html_body text,
  ADD COLUMN IF NOT EXISTS next_attempt_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS last_attempt_at timestamptz,
  ADD COLUMN IF NOT EXISTS processed_at timestamptz,
  ADD COLUMN IF NOT EXISTS max_retries integer NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.email_logs
  DROP CONSTRAINT IF EXISTS email_logs_status_check;
ALTER TABLE public.email_logs
  ADD CONSTRAINT email_logs_status_check
  CHECK (status IN ('queued', 'processing', 'sent', 'failed', 'dead_letter'));

ALTER TABLE public.email_logs
  DROP CONSTRAINT IF EXISTS email_logs_retry_bounds_check;
ALTER TABLE public.email_logs
  ADD CONSTRAINT email_logs_retry_bounds_check
  CHECK (attempt_count >= 0 AND max_retries >= 1 AND attempt_count <= max_retries + 1);

CREATE INDEX IF NOT EXISTS idx_email_logs_due_jobs
  ON public.email_logs(status, next_attempt_at, created_at)
  WHERE status IN ('queued', 'failed', 'processing');

CREATE INDEX IF NOT EXISTS idx_email_logs_booking_template
  ON public.email_logs(booking_id, template_name, created_at DESC);

