-- Migration to sync the notifications table with the live database schema
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN,
    link TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    last_error TEXT,
    status VARCHAR,
    read BOOLEAN
);
-- Add any missing columns if the table already exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'is_read'
    ) THEN
        ALTER TABLE public.notifications ADD COLUMN is_read BOOLEAN;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'link'
    ) THEN
        ALTER TABLE public.notifications ADD COLUMN link TEXT;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE public.notifications ADD COLUMN created_at TIMESTAMPTZ;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE public.notifications ADD COLUMN updated_at TIMESTAMPTZ;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'last_error'
    ) THEN
        ALTER TABLE public.notifications ADD COLUMN last_error TEXT;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'status'
    ) THEN
        ALTER TABLE public.notifications ADD COLUMN status VARCHAR;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'read'
    ) THEN
        ALTER TABLE public.notifications ADD COLUMN read BOOLEAN;
    END IF;
END $$;

-- Enable Row Level Security
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own notifications"
    ON public.notifications
    FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications"
    ON public.notifications
    FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Anyone can insert notifications"
    ON public.notifications
    FOR INSERT
    TO authenticated
    WITH CHECK (true); 