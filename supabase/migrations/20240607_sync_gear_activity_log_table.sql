-- Migration to sync the gear_activity_log table with the live database schema
CREATE TABLE IF NOT EXISTS public.gear_activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    gear_id UUID,
    request_id UUID,
    activity_type TEXT NOT NULL,
    status TEXT,
    notes TEXT,
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);
-- Add any missing columns if the table already exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'gear_activity_log' AND column_name = 'details'
    ) THEN
        ALTER TABLE public.gear_activity_log ADD COLUMN details JSONB;
    END IF;
END $$;

-- Enable Row Level Security
ALTER TABLE public.gear_activity_log ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own activity"
    ON public.gear_activity_log
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Admins can view all activity"
    ON public.gear_activity_log
    FOR ALL
    TO authenticated
    USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'Admin')); 