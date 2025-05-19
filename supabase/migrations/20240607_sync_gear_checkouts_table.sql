-- Migration to sync the gear_checkouts table with the live database schema
CREATE TABLE IF NOT EXISTS public.gear_checkouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gear_id UUID NOT NULL,
    user_id UUID NOT NULL,
    request_id UUID NOT NULL,
    checkout_date TIMESTAMPTZ NOT NULL,
    expected_return_date TIMESTAMPTZ,
    actual_return_date TIMESTAMPTZ,
    status TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
);
-- Add any missing columns if the table already exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'gear_checkouts' AND column_name = 'expected_return_date'
    ) THEN
        ALTER TABLE public.gear_checkouts ADD COLUMN expected_return_date TIMESTAMPTZ;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'gear_checkouts' AND column_name = 'actual_return_date'
    ) THEN
        ALTER TABLE public.gear_checkouts ADD COLUMN actual_return_date TIMESTAMPTZ;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'gear_checkouts' AND column_name = 'notes'
    ) THEN
        ALTER TABLE public.gear_checkouts ADD COLUMN notes TEXT;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'gear_checkouts' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE public.gear_checkouts ADD COLUMN created_at TIMESTAMPTZ;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'gear_checkouts' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE public.gear_checkouts ADD COLUMN updated_at TIMESTAMPTZ;
    END IF;
END $$;

-- Enable Row Level Security
ALTER TABLE public.gear_checkouts ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own checkouts"
    ON public.gear_checkouts
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Admins have full access to checkout records"
    ON public.gear_checkouts
    FOR ALL
    USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'Admin')); 