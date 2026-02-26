BEGIN;

-- Enforce active-car hard lock at assignment time.
CREATE OR REPLACE FUNCTION public.prevent_double_car_assignment()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
    v_target_booking RECORD;
    v_conflicting_booking RECORD;
BEGIN
    SELECT cb.id, cb.date_of_use, cb.time_slot
    INTO v_target_booking
    FROM public.car_bookings cb
    WHERE cb.id = NEW.booking_id;

    IF NOT FOUND THEN
        RETURN NEW;
    END IF;

    -- Exact slot conflict (existing behavior, kept for clearer error messaging)
    SELECT cb.id, cb.employee_name, cb.date_of_use, cb.time_slot
    INTO v_conflicting_booking
    FROM public.car_assignment ca
    JOIN public.car_bookings cb ON cb.id = ca.booking_id
    WHERE ca.car_id = NEW.car_id
      AND cb.id <> NEW.booking_id
      AND cb.status = 'Approved'
      AND cb.date_of_use = v_target_booking.date_of_use
      AND COALESCE(cb.time_slot, '') = COALESCE(v_target_booking.time_slot, '')
    LIMIT 1;

    IF FOUND THEN
        RAISE EXCEPTION 'Car is already assigned to another approved booking for this date and time slot.';
    END IF;

    -- Hard lock: any other approved booking for the same car blocks a new assignment
    SELECT cb.id, cb.employee_name, cb.date_of_use, cb.time_slot
    INTO v_conflicting_booking
    FROM public.car_assignment ca
    JOIN public.car_bookings cb ON cb.id = ca.booking_id
    WHERE ca.car_id = NEW.car_id
      AND cb.id <> NEW.booking_id
      AND cb.status = 'Approved'
    LIMIT 1;

    IF FOUND THEN
        RAISE EXCEPTION 'Vehicle is currently checked out by another user. It must be returned (marked as Completed) before it can be assigned to a new booking.';
    END IF;

    RETURN NEW;
END;
$function$;

-- Enforce active-car hard lock at approval time to close app-only bypasses / races.
CREATE OR REPLACE FUNCTION public.prevent_approving_locked_car_booking()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
    v_car_id uuid;
    v_conflicting_booking RECORD;
BEGIN
    IF NEW.status IS DISTINCT FROM 'Approved' THEN
        RETURN NEW;
    END IF;

    IF TG_OP = 'UPDATE' AND OLD.status IS NOT DISTINCT FROM NEW.status THEN
        RETURN NEW;
    END IF;

    SELECT ca.car_id
    INTO v_car_id
    FROM public.car_assignment ca
    WHERE ca.booking_id = NEW.id
    LIMIT 1;

    -- Approval route already requires an assignment. Skip if none exists.
    IF v_car_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Exact slot conflict (kept for explicit message)
    SELECT cb.id, cb.employee_name, cb.date_of_use, cb.time_slot
    INTO v_conflicting_booking
    FROM public.car_assignment ca
    JOIN public.car_bookings cb ON cb.id = ca.booking_id
    WHERE ca.car_id = v_car_id
      AND cb.id <> NEW.id
      AND cb.status = 'Approved'
      AND cb.date_of_use = NEW.date_of_use
      AND COALESCE(cb.time_slot, '') = COALESCE(NEW.time_slot, '')
    LIMIT 1;

    IF FOUND THEN
        RAISE EXCEPTION 'Car is already assigned and approved for this specific time slot.';
    END IF;

    -- Hard lock: any other approved booking means the vehicle has not been returned yet
    SELECT cb.id, cb.employee_name, cb.date_of_use, cb.time_slot
    INTO v_conflicting_booking
    FROM public.car_assignment ca
    JOIN public.car_bookings cb ON cb.id = ca.booking_id
    WHERE ca.car_id = v_car_id
      AND cb.id <> NEW.id
      AND cb.status = 'Approved'
    LIMIT 1;

    IF FOUND THEN
        RAISE EXCEPTION 'Vehicle is currently checked out by another user. It must be returned (marked as Completed) before this booking can be approved.';
    END IF;

    RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_prevent_approving_locked_car_booking ON public.car_bookings;
CREATE CONSTRAINT TRIGGER trg_prevent_approving_locked_car_booking
AFTER INSERT OR UPDATE ON public.car_bookings
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION public.prevent_approving_locked_car_booking();

COMMIT;
