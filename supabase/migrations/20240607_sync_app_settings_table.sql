-- Migration to sync the app_settings table with the live database schema
CREATE TABLE IF NOT EXISTS public.app_settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at TIMESTAMPTZ
);
-- Add any missing columns if the table already exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'app_settings' AND column_name = 'value'
    ) THEN
        ALTER TABLE public.app_settings ADD COLUMN value TEXT;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'app_settings' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE public.app_settings ADD COLUMN updated_at TIMESTAMPTZ;
    END IF;
END $$;

-- Enable Row Level Security
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow read for all"
    ON public.app_settings
    FOR SELECT
    USING (true);

CREATE POLICY "Only admins can edit app settings"
    ON public.app_settings
    FOR ALL
    USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'Admin'));

CREATE POLICY "Anyone can view app settings"
    ON public.app_settings
    FOR SELECT
    USING (true); 