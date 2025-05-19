-- Migration to sync the read_announcements table with the live database schema
CREATE TABLE IF NOT EXISTS public.read_announcements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    announcement_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL
);
-- Add any missing columns if the table already exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'read_announcements' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE public.read_announcements ADD COLUMN created_at TIMESTAMPTZ NOT NULL;
    END IF;
END $$;

-- Enable Row Level Security
ALTER TABLE public.read_announcements ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own read announcements"
    ON public.read_announcements
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can mark announcements as read"
    ON public.read_announcements
    FOR INSERT
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own read announcements"
    ON public.read_announcements
    FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Only admins can delete read announcements"
    ON public.read_announcements
    FOR DELETE
    USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'Admin')); 