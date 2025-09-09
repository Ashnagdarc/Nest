-- Add start_time and end_time to car_bookings and a basic validity constraint
-- This is additive and safe; existing rows will have NULLs

ALTER TABLE public.car_bookings
    ADD COLUMN IF NOT EXISTS start_time TIME NULL,
    ADD COLUMN IF NOT EXISTS end_time TIME NULL;

-- Ensure start_time < end_time when both provided
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'car_bookings_start_before_end'
    ) THEN
        ALTER TABLE public.car_bookings
        ADD CONSTRAINT car_bookings_start_before_end
        CHECK (
            start_time IS NULL OR end_time IS NULL OR start_time < end_time
        );
    END IF;
END $$;

-- Helpful index for overlap checks by date and times
CREATE INDEX IF NOT EXISTS idx_car_bookings_date_start_end
ON public.car_bookings (date_of_use, start_time, end_time);


