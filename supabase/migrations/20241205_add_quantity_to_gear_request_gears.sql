-- Safe migration: add quantity to gear_request_gears with default 1 and not null
-- This is backward-compatible with existing data and code paths.

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'gear_request_gears'
      AND column_name = 'quantity'
  ) THEN
    ALTER TABLE public.gear_request_gears
    ADD COLUMN quantity integer NOT NULL DEFAULT 1;
  END IF;
END $$;

-- Optional: sanity index if needed later for reporting
-- CREATE INDEX IF NOT EXISTS idx_gear_request_gears_request_id ON public.gear_request_gears(gear_request_id);

