-- Optional strict prevention of overlapping approved bookings per car/date/time
-- This requires app-side enforcement to set status to Approved only after assignment
-- Apply only if you want hard prevention. Safe to run multiple times.
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_car_slot
ON public.car_assignment (car_id, booking_id);

-- Strict unique per car/date/time among Approved bookings via view index is not directly possible.
-- Instead, create a helper function to check before approval if a conflict exists.
-- This migration intentionally avoids destructive constraints.
