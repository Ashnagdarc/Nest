-- Gear stock changes happen in one locked transaction.
-- The request line is the allocation (who, how many, until when).
-- gears.checked_out_to / current_request_id / due_date are a display cache only.
-- Pending requests do not reserve stock: a hold with no expiry would lock gear forever.

CREATE OR REPLACE FUNCTION public.gear_due_from_duration(
  p_duration text,
  p_from timestamptz
)
RETURNS timestamptz
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT p_from + CASE COALESCE(p_duration, '1 week')
    WHEN '24hours' THEN interval '24 hours'
    WHEN '48hours' THEN interval '48 hours'
    WHEN '72hours' THEN interval '72 hours'
    WHEN '1 week' THEN interval '7 days'
    WHEN '2 weeks' THEN interval '14 days'
    WHEN 'Month' THEN interval '30 days'
    WHEN '1year' THEN interval '365 days'
    ELSE interval '7 days'
  END;
$$;

CREATE OR REPLACE FUNCTION public.recompute_gear_holder(
  p_gear_id uuid,
  p_mark_checkout boolean DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total integer;
  v_available integer;
  v_count integer;
  v_user uuid;
  v_request uuid;
  v_due timestamptz;
BEGIN
  SELECT
    GREATEST(COALESCE(quantity, 1), 1),
    GREATEST(COALESCE(available_quantity, 0), 0)
  INTO v_total, v_available
  FROM public.gears
  WHERE id = p_gear_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  SELECT
    COUNT(DISTINCT gr.id),
    (ARRAY_AGG(gr.user_id ORDER BY gr.due_date ASC NULLS LAST))[1],
    (ARRAY_AGG(gr.id ORDER BY gr.due_date ASC NULLS LAST))[1],
    MIN(gr.due_date)
  INTO v_count, v_user, v_request, v_due
  FROM public.gear_request_gears grg
  JOIN public.gear_requests gr ON gr.id = grg.gear_request_id
  WHERE grg.gear_id = p_gear_id
    AND gr.status IN ('Approved', 'Overdue', 'Checked Out', 'Partially Checked Out');

  IF v_available >= v_total OR COALESCE(v_count, 0) = 0 THEN
    UPDATE public.gears
    SET checked_out_to = NULL,
        current_request_id = NULL,
        due_date = NULL,
        updated_at = now()
    WHERE id = p_gear_id;
  ELSIF v_count = 1 THEN
    UPDATE public.gears
    SET checked_out_to = v_user,
        current_request_id = v_request,
        due_date = v_due,
        last_checkout_date = CASE
          WHEN p_mark_checkout THEN now()
          ELSE last_checkout_date
        END,
        updated_at = now()
    WHERE id = p_gear_id;
  ELSE
    UPDATE public.gears
    SET checked_out_to = NULL,
        current_request_id = NULL,
        due_date = v_due,
        updated_at = now()
    WHERE id = p_gear_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_gear_request_atomic(
  p_request_id uuid,
  p_actor_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request public.gear_requests%ROWTYPE;
  v_due timestamptz;
  v_line record;
  v_base integer;
  v_total integer;
  v_booking_id uuid;
  v_booking_status public.booking_lifecycle_status;
BEGIN
  SELECT * INTO v_request
  FROM public.gear_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF v_request.id IS NULL THEN
    RAISE EXCEPTION 'NOT_FOUND: Request not found';
  END IF;

  IF lower(v_request.status) = 'approved' THEN
    RETURN jsonb_build_object(
      'ok', true,
      'idempotent', true,
      'due_date', v_request.due_date,
      'request_id', v_request.id
    );
  END IF;

  IF lower(v_request.status) <> 'pending' THEN
    RAISE EXCEPTION 'NOT_PENDING: Only a pending request can be approved';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.gear_request_gears WHERE gear_request_id = p_request_id
  ) THEN
    RAISE EXCEPTION 'NO_ITEMS: This request has no equipment lines';
  END IF;

  v_due := public.gear_due_from_duration(v_request.expected_duration, now());

  FOR v_line IN
    SELECT g.id AS gear_id,
           g.name,
           GREATEST(COALESCE(g.quantity, 1), 1) AS total_quantity,
           GREATEST(COALESCE(g.available_quantity, g.quantity, 0), 0) AS available_quantity,
           sums.qty
    FROM public.gears g
    JOIN (
      SELECT gear_id, SUM(GREATEST(COALESCE(quantity, 1), 1))::integer AS qty
      FROM public.gear_request_gears
      WHERE gear_request_id = p_request_id
      GROUP BY gear_id
    ) sums ON sums.gear_id = g.id
    ORDER BY g.id
    FOR UPDATE OF g
  LOOP
    v_total := v_line.total_quantity;
    v_base := LEAST(v_line.available_quantity, v_total);
    IF v_base < v_line.qty THEN
      RAISE EXCEPTION 'INSUFFICIENT: Not enough available units for %', COALESCE(v_line.name, 'equipment');
    END IF;

    UPDATE public.gears
    SET available_quantity = v_base - v_line.qty,
        updated_at = now()
    WHERE id = v_line.gear_id;

    PERFORM public.recompute_gear_inventory_state(v_line.gear_id, false);
  END LOOP;

  UPDATE public.gear_requests
  SET status = 'Approved',
      approved_at = now(),
      due_date = v_due,
      updated_by = p_actor_id,
      updated_at = now()
  WHERE id = p_request_id;

  SELECT id, status
  INTO v_booking_id, v_booking_status
  FROM public.bookings
  WHERE source_type = 'gear_request'
    AND source_id = p_request_id
  FOR UPDATE;

  IF v_booking_id IS NOT NULL THEN
    UPDATE public.bookings
    SET end_at = v_due,
        updated_at = now()
    WHERE id = v_booking_id;

    IF v_booking_status IS DISTINCT FROM 'approved' THEN
      PERFORM public.transition_booking_atomic(
        v_booking_id,
        'approved',
        p_actor_id,
        'Gear request approved',
        jsonb_build_object('source', 'approve_gear_request_atomic'),
        'approve-gear:' || p_request_id::text
      );
    END IF;
  END IF;

  FOR v_line IN
    SELECT DISTINCT gear_id
    FROM public.gear_request_gears
    WHERE gear_request_id = p_request_id
    ORDER BY gear_id
  LOOP
    PERFORM public.recompute_gear_holder(v_line.gear_id, true);
  END LOOP;

  RETURN jsonb_build_object(
    'ok', true,
    'idempotent', false,
    'due_date', v_due,
    'request_id', p_request_id,
    'booking_id', v_booking_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.release_gear_request_atomic(
  p_request_id uuid,
  p_actor_id uuid,
  p_next_status public.booking_lifecycle_status,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request public.gear_requests%ROWTYPE;
  v_line record;
  v_completed integer;
  v_restore integer;
  v_legacy_status text;
  v_booking_id uuid;
  v_booking_status public.booking_lifecycle_status;
  v_open boolean;
BEGIN
  IF p_next_status NOT IN ('failed', 'cancelled') THEN
    RAISE EXCEPTION 'BAD_STATUS: release only accepts failed or cancelled';
  END IF;

  SELECT * INTO v_request
  FROM public.gear_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF v_request.id IS NULL THEN
    RAISE EXCEPTION 'NOT_FOUND: Request not found';
  END IF;

  IF lower(v_request.status) IN ('rejected', 'cancelled', 'completed') THEN
    RETURN jsonb_build_object(
      'ok', true,
      'idempotent', true,
      'request_id', v_request.id,
      'status', v_request.status
    );
  END IF;

  v_legacy_status := CASE p_next_status
    WHEN 'failed' THEN 'Rejected'
    ELSE 'Cancelled'
  END;
  v_open := lower(v_request.status) IN ('approved', 'overdue', 'checked out', 'partially checked out');

  IF v_open THEN
    FOR v_line IN
      SELECT g.id AS gear_id,
             GREATEST(COALESCE(g.quantity, 1), 1) AS total_quantity,
             GREATEST(COALESCE(g.available_quantity, 0), 0) AS available_quantity,
             sums.qty
      FROM public.gears g
      JOIN (
        SELECT gear_id, SUM(GREATEST(COALESCE(quantity, 1), 1))::integer AS qty
        FROM public.gear_request_gears
        WHERE gear_request_id = p_request_id
        GROUP BY gear_id
      ) sums ON sums.gear_id = g.id
      ORDER BY g.id
      FOR UPDATE OF g
    LOOP
      SELECT COALESCE(SUM(GREATEST(COALESCE(quantity, 1), 1)), 0)
      INTO v_completed
      FROM public.checkins
      WHERE request_id = p_request_id
        AND gear_id = v_line.gear_id
        AND status = 'Completed';

      v_restore := GREATEST(v_line.qty - v_completed, 0);

      UPDATE public.gears
      SET available_quantity = LEAST(v_line.total_quantity, v_line.available_quantity + v_restore),
          updated_at = now()
      WHERE id = v_line.gear_id;
    END LOOP;

    -- Drop pending returns before the status write. Their trigger can
    -- otherwise mark the request completed after we have released it.
    UPDATE public.checkins
    SET status = 'Rejected',
        updated_at = now()
    WHERE request_id = p_request_id
      AND status = 'Pending Admin Approval';
  END IF;

  UPDATE public.gear_requests
  SET status = v_legacy_status,
      updated_by = p_actor_id,
      updated_at = now()
  WHERE id = p_request_id;

  IF v_open THEN
    FOR v_line IN
      SELECT DISTINCT gear_id
      FROM public.gear_request_gears
      WHERE gear_request_id = p_request_id
      ORDER BY gear_id
    LOOP
      PERFORM public.recompute_gear_inventory_state(v_line.gear_id, false);
      PERFORM public.recompute_gear_holder(v_line.gear_id, false);
    END LOOP;
  END IF;

  SELECT id, status
  INTO v_booking_id, v_booking_status
  FROM public.bookings
  WHERE source_type = 'gear_request'
    AND source_id = p_request_id
  FOR UPDATE;

  IF v_booking_id IS NOT NULL AND v_booking_status IS DISTINCT FROM p_next_status THEN
    PERFORM public.transition_booking_atomic(
      v_booking_id,
      p_next_status,
      p_actor_id,
      COALESCE(p_reason, 'Gear request released'),
      jsonb_build_object('source', 'release_gear_request_atomic'),
      'release-gear:' || p_request_id::text || ':' || p_next_status::text
    );
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'idempotent', false,
    'request_id', p_request_id,
    'status', v_legacy_status,
    'booking_id', v_booking_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_checkin_within_allocation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_line integer;
  v_used integer;
  v_qty integer;
BEGIN
  IF NEW.request_id IS NULL OR NEW.gear_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE'
     AND NEW.status IS NOT DISTINCT FROM OLD.status
     AND NEW.quantity IS NOT DISTINCT FROM OLD.quantity THEN
    RETURN NEW;
  END IF;

  IF NEW.status NOT IN ('Pending Admin Approval', 'Completed') THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(SUM(GREATEST(COALESCE(quantity, 1), 1)), 0)
  INTO v_line
  FROM public.gear_request_gears
  WHERE gear_request_id = NEW.request_id
    AND gear_id = NEW.gear_id;

  IF v_line = 0 THEN
    RAISE EXCEPTION 'CHECKIN_NO_LINE: this request does not include that equipment';
  END IF;

  v_qty := GREATEST(COALESCE(NEW.quantity, 1), 1);

  SELECT COALESCE(SUM(GREATEST(COALESCE(quantity, 1), 1)), 0)
  INTO v_used
  FROM public.checkins
  WHERE request_id = NEW.request_id
    AND gear_id = NEW.gear_id
    AND status IN ('Pending Admin Approval', 'Completed')
    AND id IS DISTINCT FROM NEW.id;

  IF v_used + v_qty > v_line THEN
    RAISE EXCEPTION 'CHECKIN_OVER_RETURN: return quantity exceeds what this booking still has out';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_checkin_within_allocation ON public.checkins;
CREATE TRIGGER trg_enforce_checkin_within_allocation
BEFORE INSERT OR UPDATE ON public.checkins
FOR EACH ROW
EXECUTE FUNCTION public.enforce_checkin_within_allocation();

CREATE OR REPLACE FUNCTION public.refresh_gear_holder_after_checkin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.gear_id IS NOT NULL AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
    PERFORM public.recompute_gear_holder(NEW.gear_id, false);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS zzz_refresh_gear_holder_after_checkin ON public.checkins;
CREATE TRIGGER zzz_refresh_gear_holder_after_checkin
AFTER INSERT OR UPDATE ON public.checkins
FOR EACH ROW
EXECUTE FUNCTION public.refresh_gear_holder_after_checkin();

REVOKE ALL ON FUNCTION public.gear_due_from_duration(text, timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.recompute_gear_holder(uuid, boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.approve_gear_request_atomic(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_gear_request_atomic(uuid, uuid, public.booking_lifecycle_status, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.gear_due_from_duration(text, timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.approve_gear_request_atomic(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_gear_request_atomic(uuid, uuid, public.booking_lifecycle_status, text) TO service_role;

ALTER TABLE public.gears
  DROP CONSTRAINT IF EXISTS gears_available_quantity_bounds;
ALTER TABLE public.gears
  ADD CONSTRAINT gears_available_quantity_bounds
  CHECK (
    available_quantity IS NULL
    OR quantity IS NULL
    OR (available_quantity >= 0 AND available_quantity <= quantity)
  );

-- One return time: the booking ends when the request is due.
UPDATE public.bookings b
SET end_at = gr.due_date,
    updated_at = now()
FROM public.gear_requests gr
WHERE b.source_type = 'gear_request'
  AND b.source_id = gr.id
  AND gr.status IN ('Approved', 'Overdue', 'Checked Out', 'Partially Checked Out')
  AND gr.due_date IS NOT NULL
  AND b.end_at IS DISTINCT FROM gr.due_date;

DO $$
DECLARE
  v_gear_id uuid;
BEGIN
  FOR v_gear_id IN
    SELECT g.id
    FROM public.gears g
    WHERE g.checked_out_to IS NOT NULL
       OR g.current_request_id IS NOT NULL
       OR EXISTS (
         SELECT 1
         FROM public.gear_request_gears grg
         JOIN public.gear_requests gr ON gr.id = grg.gear_request_id
         WHERE grg.gear_id = g.id
           AND gr.status IN ('Approved', 'Overdue', 'Checked Out', 'Partially Checked Out')
       )
    ORDER BY g.id
  LOOP
    PERFORM public.recompute_gear_holder(v_gear_id, false);
  END LOOP;
END $$;
