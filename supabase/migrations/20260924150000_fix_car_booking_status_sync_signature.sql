-- Vehicle booking creates a v2 row whose status is booking_lifecycle_status.
-- sync_car_status_from_booking_id only accepts text, and enum-to-text is not
-- an implicit cast, so the insert failed with:
--   function sync_car_status_from_booking_id(uuid, booking_lifecycle_status) does not exist
-- The legacy car row was then left behind because the requester cannot delete it.

CREATE OR REPLACE FUNCTION public.sync_car_status_from_v2_booking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $function$
BEGIN
  IF coalesce(NEW.source_type, '') = 'car_booking' AND NEW.source_id IS NOT NULL THEN
    IF TG_OP = 'INSERT' OR NEW.status IS DISTINCT FROM OLD.status THEN
      PERFORM public.sync_car_status_from_booking_id(NEW.source_id, NEW.status::text);
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- Repair the booking that failed at 2026-09-24 13:40 UTC. The legacy row
-- stayed Pending, but the v2 aggregate never committed.
DO $$
DECLARE
  v_row public.car_bookings%ROWTYPE;
BEGIN
  SELECT * INTO v_row
  FROM public.car_bookings
  WHERE id = '5d0de706-5982-4cb9-bf3c-89aa4096e8a3';

  IF v_row.id IS NULL THEN
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.bookings
    WHERE source_type = 'car_booking'
      AND source_id = v_row.id
  ) THEN
    RETURN;
  END IF;

  PERFORM public.create_booking_with_items_atomic(
    'car_booking',
    v_row.id,
    v_row.requester_id,
    (v_row.date_of_use::text || 'T00:00:00.000Z')::timestamptz,
    (v_row.date_of_use::text || 'T23:59:59.000Z')::timestamptz,
    jsonb_build_object(
      'date_of_use', v_row.date_of_use,
      'time_slot', v_row.time_slot,
      'destination', v_row.destination,
      'purpose', v_row.purpose
    ),
    'legacy-car-create:' || v_row.id::text,
    '[]'::jsonb
  );
END $$;
