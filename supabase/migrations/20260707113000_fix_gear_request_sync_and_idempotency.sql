BEGIN;

ALTER TABLE public.gear_requests
  ADD COLUMN IF NOT EXISTS client_submission_id text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_gear_requests_client_submission_id
  ON public.gear_requests (client_submission_id)
  WHERE client_submission_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.booking_status_transition_allowed(
  p_old public.booking_lifecycle_status,
  p_new public.booking_lifecycle_status
)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_old = p_new THEN true
    WHEN p_old = 'pending' AND p_new IN ('approved', 'cancelled', 'failed') THEN true
    WHEN p_old = 'approved' AND p_new IN ('checked_out', 'active', 'completed', 'cancelled', 'failed') THEN true
    WHEN p_old = 'checked_out' AND p_new IN ('active', 'completed', 'overdue', 'failed') THEN true
    WHEN p_old = 'active' AND p_new IN ('completed', 'overdue', 'failed') THEN true
    WHEN p_old = 'overdue' AND p_new IN ('completed', 'failed') THEN true
    ELSE false
  END;
$$;

COMMIT;
