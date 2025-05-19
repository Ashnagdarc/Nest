-- Migration to sync the gear_calendar_bookings table with the live database schema
CREATE TABLE IF NOT EXISTS public.gear_calendar_bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gear_id UUID NOT NULL,
    user_id UUID NOT NULL,
    title TEXT NOT NULL,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL,
    reason TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    approved_at TIMESTAMPTZ,
    approved_by UUID,
    is_all_day BOOLEAN,
    recurring_pattern TEXT,
    color TEXT,
    request_id UUID
);
-- Add any missing columns if the table already exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'gear_calendar_bookings' AND column_name = 'approved_at'
    ) THEN
        ALTER TABLE public.gear_calendar_bookings ADD COLUMN approved_at TIMESTAMPTZ;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'gear_calendar_bookings' AND column_name = 'approved_by'
    ) THEN
        ALTER TABLE public.gear_calendar_bookings ADD COLUMN approved_by UUID;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'gear_calendar_bookings' AND column_name = 'is_all_day'
    ) THEN
        ALTER TABLE public.gear_calendar_bookings ADD COLUMN is_all_day BOOLEAN;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'gear_calendar_bookings' AND column_name = 'recurring_pattern'
    ) THEN
        ALTER TABLE public.gear_calendar_bookings ADD COLUMN recurring_pattern TEXT;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'gear_calendar_bookings' AND column_name = 'color'
    ) THEN
        ALTER TABLE public.gear_calendar_bookings ADD COLUMN color TEXT;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'gear_calendar_bookings' AND column_name = 'request_id'
    ) THEN
        ALTER TABLE public.gear_calendar_bookings ADD COLUMN request_id UUID;
    END IF;
END $$;

-- Enable Row Level Security
ALTER TABLE public.gear_calendar_bookings ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view all bookings"
    ON public.gear_calendar_bookings
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can create bookings"
    ON public.gear_calendar_bookings
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own pending bookings"
    ON public.gear_calendar_bookings
    FOR UPDATE
    TO authenticated
    USING ((user_id = auth.uid()) AND (status = 'Pending'));

CREATE POLICY "Admins have full access to bookings"
    ON public.gear_calendar_bookings
    FOR ALL
    TO authenticated
    USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'Admin')); 