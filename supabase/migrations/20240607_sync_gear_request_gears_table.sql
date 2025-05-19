-- Migration to sync the gear_request_gears table with the live database schema
CREATE TABLE IF NOT EXISTS public.gear_request_gears (
    id BIGSERIAL PRIMARY KEY,
    gear_request_id UUID NOT NULL,
    gear_id UUID NOT NULL,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
);
-- Add any missing columns if the table already exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'gear_request_gears' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE public.gear_request_gears ADD COLUMN created_at TIMESTAMPTZ;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'gear_request_gears' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE public.gear_request_gears ADD COLUMN updated_at TIMESTAMPTZ;
    END IF;
END $$;

-- Enable Row Level Security
ALTER TABLE public.gear_request_gears ENABLE ROW LEVEL SECURITY; 