-- Migration to sync the announcements table with the live database schema
CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
);
-- Add any missing columns if the table already exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'announcements' AND column_name = 'created_by'
    ) THEN
        ALTER TABLE public.announcements ADD COLUMN created_by UUID REFERENCES profiles(id);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'announcements' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE public.announcements ADD COLUMN created_at TIMESTAMPTZ;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'announcements' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE public.announcements ADD COLUMN updated_at TIMESTAMPTZ;
    END IF;
END $$;

-- Enable Row Level Security
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view announcements"
    ON public.announcements
    FOR SELECT
    USING (true);

CREATE POLICY "Any authenticated user can create announcements"
    ON public.announcements
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Only admins can update announcements"
    ON public.announcements
    FOR UPDATE
    TO authenticated
    USING (private.is_admin(auth.uid()))
    WITH CHECK (private.is_admin(auth.uid()));

CREATE POLICY "Only admins can delete announcements"
    ON public.announcements
    FOR DELETE
    TO authenticated
    USING (private.is_admin(auth.uid())); 