BEGIN;

-- Prevent direct/manual completion of gear requests unless check-ins fully satisfy line quantities.
CREATE OR REPLACE FUNCTION public.validate_gear_request_completion()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_requested_qty integer := 0;
  v_completed_qty integer := 0;
  v_pending_qty integer := 0;
BEGIN
  -- Only validate on transitions into Completed.
  IF NEW.status IS DISTINCT FROM 'Completed'
     OR COALESCE(OLD.status, '') = 'Completed' THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(SUM(GREATEST(COALESCE(quantity, 1), 1)), 0)
  INTO v_requested_qty
  FROM public.gear_request_gears
  WHERE gear_request_id = NEW.id;

  SELECT COALESCE(SUM(GREATEST(COALESCE(quantity, 1), 1)), 0)
  INTO v_completed_qty
  FROM public.checkins
  WHERE request_id = NEW.id
    AND status = 'Completed';

  SELECT COALESCE(SUM(GREATEST(COALESCE(quantity, 1), 1)), 0)
  INTO v_pending_qty
  FROM public.checkins
  WHERE request_id = NEW.id
    AND status = 'Pending Admin Approval';

  IF v_requested_qty = 0 THEN
    RAISE EXCEPTION 'Cannot mark request % as Completed: request has no gear line items.', NEW.id;
  END IF;

  IF v_completed_qty < v_requested_qty OR v_pending_qty > 0 THEN
    RAISE EXCEPTION
      'Cannot mark request % as Completed: completed qty (%) / requested qty (%), pending qty (%).',
      NEW.id, v_completed_qty, v_requested_qty, v_pending_qty;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_validate_gear_request_completion ON public.gear_requests;
CREATE TRIGGER trigger_validate_gear_request_completion
BEFORE UPDATE OF status ON public.gear_requests
FOR EACH ROW
EXECUTE FUNCTION public.validate_gear_request_completion();

COMMIT;
