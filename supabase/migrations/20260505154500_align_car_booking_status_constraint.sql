BEGIN;

-- Align car booking status constraint with API usage that marks bookings as Completed.
-- This is schema-hardening only; no gear table or trigger touched.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'car_bookings'
  ) THEN
    ALTER TABLE public.car_bookings
      DROP CONSTRAINT IF EXISTS car_bookings_status_check;

    ALTER TABLE public.car_bookings
      ADD CONSTRAINT car_bookings_status_check
      CHECK (status IN ('Pending', 'Approved', 'Rejected', 'Cancelled', 'Completed'));
  END IF;
END
$$;

COMMIT;
