-- Migration to sync the gear_maintenance table with the live database schema
CREATE TABLE IF NOT EXISTS public.gear_maintenance (
    id SERIAL PRIMARY KEY,
    gear_id UUID NOT NULL,
    status TEXT NOT NULL,
    description TEXT NOT NULL,
    performed_at TIMESTAMPTZ NOT NULL,
    performed_by UUID,
    created_at TIMESTAMPTZ,
    maintenance_type TEXT NOT NULL
);
-- Add any missing columns if the table already exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'gear_maintenance' AND column_name = 'performed_by'
    ) THEN
        ALTER TABLE public.gear_maintenance ADD COLUMN performed_by UUID;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'gear_maintenance' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE public.gear_maintenance ADD COLUMN created_at TIMESTAMPTZ;
    END IF;
END $$;

-- Enable Row Level Security
ALTER TABLE public.gear_maintenance ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can do anything"
    ON public.gear_maintenance
    FOR ALL
    TO authenticated
    USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'Admin'))
    WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'Admin'));

CREATE POLICY "Admins can do anything with maintenance"
    ON public.gear_maintenance
    FOR ALL
    TO authenticated
    USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'Admin'))
    WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'Admin')); 